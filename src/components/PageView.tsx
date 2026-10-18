import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { TextLayer } from "pdfjs-dist";
import type { PageViewport, PDFDocumentProxy } from "pdfjs-dist";
import type {
  Annotation,
  PageDim,
  PageTheme,
  Rect,
  SelectionInfo,
} from "../lib/types";
import { ANNOTATION_COLORS } from "../lib/types";
import { diag } from "../lib/platform";
import { mergeRects } from "../lib/utils";

const MAX_DPR = 2;

function textLayerTransform(rotation: number) {
  switch (((rotation % 360) + 360) % 360) {
    case 90:
      return "rotate(90deg) translateY(-100%)";
    case 180:
      return "rotate(180deg) translate(-100%, -100%)";
    case 270:
      return "rotate(270deg) translateX(-100%)";
    default:
      return "none";
  }
}

type ViewportInfo = {
  width: number;
  height: number;
  rawW: number;
  rawH: number;
  rawX: number;
  rawY: number;
  rotation: number;
};

type Props = {
  pdf: PDFDocumentProxy;
  pageNumber: number;
  label: string;
  width: number;
  height: number;
  scale: number;
  rotation: number;
  pageTheme: PageTheme;
  annotations: Annotation[];
  searchQuery: string;
  isActiveSearch: boolean;
  onSelection: (info: SelectionInfo | null) => void;
  onAnnotationClick: (annotation: Annotation, anchor: DOMRect) => void;
};

export function PageView({
  pdf,
  pageNumber,
  label,
  width,
  height,
  scale,
  rotation,
  pageTheme,
  annotations,
  searchQuery,
  isActiveSearch,
  onSelection,
  onAnnotationClick,
}: Props) {
  const slotRef = useRef<HTMLDivElement | null>(null);
  const sheetRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const textRef = useRef<HTMLDivElement | null>(null);
  const searchLayerRef = useRef<HTMLDivElement | null>(null);
  const viewportRef = useRef<PageViewport | null>(null);
  const [info, setInfo] = useState<ViewportInfo | null>(null);
  const [ready, setReady] = useState(false);
  const dpr = Math.min(MAX_DPR, window.devicePixelRatio || 1);

  useEffect(() => {
    let cancelled = false;
    let renderTask: ReturnType<Awaited<ReturnType<PDFDocumentProxy["getPage"]>>["render"]> | null =
      null;
    let layer: TextLayer | null = null;
    setReady(false);

    const run = async () => {
      const page = await pdf.getPage(pageNumber);
      if (cancelled) return;
      const displayRotation = (((page.rotate + rotation) % 360) + 360) % 360;
      const viewport = page.getViewport({ scale, rotation: displayRotation });
      const rawViewport = page.getViewport({ scale, rotation: 0 });
      const raw = rawViewport.rawDims as {
        pageWidth: number;
        pageHeight: number;
        pageX: number;
        pageY: number;
      };
      viewportRef.current = viewport;

      const off = document.createElement("canvas");
      off.width = Math.max(1, Math.floor(viewport.width * dpr));
      off.height = Math.max(1, Math.floor(viewport.height * dpr));
      const offCtx = off.getContext("2d");
      if (!offCtx) return;
      offCtx.fillStyle = "#ffffff";
      offCtx.fillRect(0, 0, off.width, off.height);
      renderTask = page.render({
        canvas: off,
        canvasContext: offCtx,
        viewport,
        transform: dpr === 1 ? undefined : [dpr, 0, 0, dpr, 0, 0],
      });
      await renderTask.promise;
      if (cancelled) return;

      const canvas = canvasRef.current;
      if (canvas) {
        canvas.width = off.width;
        canvas.height = off.height;
        const ctx = canvas.getContext("2d");
        ctx?.drawImage(off, 0, 0);
      }
      off.width = 0;
      off.height = 0;

      const textDiv = textRef.current;
      if (textDiv) {
        textDiv.replaceChildren();
        textDiv.style.setProperty("--total-scale-factor", String(scale));
        textDiv.style.setProperty("--scale-round-x", "1px");
        textDiv.style.setProperty("--scale-round-y", "1px");
        textDiv.style.width = `${rawViewport.width}px`;
        textDiv.style.height = `${rawViewport.height}px`;
        textDiv.style.transform = textLayerTransform(displayRotation);
        const source =
          typeof page.streamTextContent === "function"
            ? page.streamTextContent({
                includeMarkedContent: true,
                disableNormalization: true,
              })
            : await page.getTextContent();
        layer = new TextLayer({
          textContentSource: source,
          container: textDiv,
          viewport: rawViewport,
        });
        await layer.render();
        if (cancelled) return;
      }

      diag(
        `page-rendered page=${pageNumber} scale=${scale.toFixed(2)} rotation=${displayRotation} spans=${textDiv?.querySelectorAll("span").length ?? 0}`,
      );
      setInfo({
        width: viewport.width,
        height: viewport.height,
        rawW: raw.pageWidth,
        rawH: raw.pageHeight,
        rawX: raw.pageX,
        rawY: raw.pageY,
        rotation: displayRotation,
      });
      setReady(true);
    };

    run().catch((error: unknown) => {
      const name = (error as { name?: string })?.name;
      if (name === "RenderingCancelledException" || name === "AbortException") {
        return;
      }
      console.warn(`Failed to render page ${pageNumber}`, error);
    });

    return () => {
      cancelled = true;
      try {
        renderTask?.cancel();
      } catch {
        /* noop */
      }
      try {
        layer?.cancel();
      } catch {
        /* noop */
      }
      viewportRef.current = null;
    };
  }, [pdf, pageNumber, scale, rotation, dpr]);

  // Precise search highlights: wrap the matching character range in a Range
  // and mirror its client rects into an overlay layer.
  useEffect(() => {
    const layer = searchLayerRef.current;
    const slot = slotRef.current;
    const root = textRef.current;
    if (!layer || !slot || !root) return;
    layer.replaceChildren();
    const query = searchQuery.trim().toLowerCase();
    if (!query) return;
    const slotRect = slot.getBoundingClientRect();
    if (slotRect.width < 1 || slotRect.height < 1) return;
    const spans = root.querySelectorAll("span");
    for (const span of Array.from(spans)) {
      const text = span.textContent ?? "";
      if (!text || text.length < query.length) continue;
      const lower = text.toLowerCase();
      let from = 0;
      let index = lower.indexOf(query, from);
      let guard = 0;
      while (index !== -1 && guard < 60) {
        guard += 1;
        const node = span.firstChild;
        if (node && node.nodeType === Node.TEXT_NODE) {
          const range = document.createRange();
          range.setStart(node, index);
          range.setEnd(node, index + query.length);
          for (const rect of Array.from(range.getClientRects())) {
            if (rect.width < 1 || rect.height < 1) continue;
            const box = document.createElement("div");
            box.className = isActiveSearch
              ? "search-hit-rect is-active"
              : "search-hit-rect";
            box.style.left = `${((rect.left - slotRect.left) / slotRect.width) * 100}%`;
            box.style.top = `${((rect.top - slotRect.top) / slotRect.height) * 100}%`;
            box.style.width = `${(rect.width / slotRect.width) * 100}%`;
            box.style.height = `${(rect.height / slotRect.height) * 100}%`;
            layer.appendChild(box);
          }
        }
        from = index + query.length;
        index = lower.indexOf(query, from);
      }
    }
  }, [searchQuery, isActiveSearch, ready, info, scale, rotation]);

  const rectToPct = useCallback(
    (rect: Rect) => {
      const vp = viewportRef.current;
      if (!vp || !info) return null;
      const pdfX = info.rawX + rect.x * info.rawW;
      const pdfY = info.rawY + rect.y * info.rawH;
      const pdfX2 = info.rawX + (rect.x + rect.w) * info.rawW;
      const pdfY2 = info.rawY + (rect.y + rect.h) * info.rawH;
      const [x1, y1] = vp.convertToViewportPoint(pdfX, pdfY);
      const [x2, y2] = vp.convertToViewportPoint(pdfX2, pdfY2);
      const left = Math.min(x1, x2);
      const top = Math.min(y1, y2);
      return {
        left: (left / info.width) * 100,
        top: (top / info.height) * 100,
        width: (Math.abs(x2 - x1) / info.width) * 100,
        height: (Math.abs(y2 - y1) / info.height) * 100,
      };
    },
    [info],
  );

  const handleMouseUp = useCallback(() => {
    const selection = window.getSelection();
    if (!selection || selection.isCollapsed || selection.rangeCount === 0) {
      return;
    }
    const range = selection.getRangeAt(0);
    const slot = slotRef.current;
    const vp = viewportRef.current;
    if (!slot || !vp || !info) return;
    if (!slot.contains(range.commonAncestorContainer)) return;
    const box = slot.getBoundingClientRect();
    const raw: Rect[] = [];
    for (const r of Array.from(range.getClientRects())) {
      if (r.width < 1 || r.height < 1) continue;
      const [x1, y1] = vp.convertToPdfPoint(r.left - box.left, r.top - box.top);
      const [x2, y2] = vp.convertToPdfPoint(r.right - box.left, r.bottom - box.top);
      raw.push({
        x: (Math.min(x1, x2) - info.rawX) / info.rawW,
        y: (Math.min(y1, y2) - info.rawY) / info.rawH,
        w: Math.abs(x2 - x1) / info.rawW,
        h: Math.abs(y2 - y1) / info.rawH,
      });
    }
    const rects = mergeRects(raw);
    const text = selection.toString().trim();
    if (!rects.length) return;
    const anchor = range.getBoundingClientRect();
    onSelection({
      page: pageNumber,
      rects,
      text,
      anchor: {
        x: anchor.left,
        y: anchor.top,
        width: anchor.width,
        height: anchor.height,
      },
    });
  }, [info, onSelection, pageNumber]);

  const annotationNodes = useMemo(() => {
    if (!info) return null;
    return annotations.map((ann) => {
      const color = ANNOTATION_COLORS[ann.color] ?? ANNOTATION_COLORS.yellow;
      if (ann.type === "note") {
        const rect = ann.rects[0];
        if (!rect) return null;
        const pct = rectToPct(rect);
        if (!pct) return null;
        return (
          <button
            key={ann.id}
            type="button"
            className="annotation-note"
            style={{
              left: `${pct.left + pct.width}%`,
              top: `${pct.top}%`,
              borderColor: color.value,
              color: color.value,
            }}
            title={ann.note?.trim() || "便签"}
            onClick={(event) => {
              event.stopPropagation();
              const el = event.currentTarget as HTMLElement;
              onAnnotationClick(ann, el.getBoundingClientRect());
            }}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path
                d="M21 14.5a2.5 2.5 0 0 1-2.5 2.5H8l-5 4V5.5A2.5 2.5 0 0 1 5.5 3h13A2.5 2.5 0 0 1 21 5.5z"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        );
      }
      return (
        <Fragment key={ann.id}>
          {ann.rects.map((rect, index) => {
            const pct = rectToPct(rect);
            if (!pct) return null;
            return (
              <span
                key={index}
                className={`annotation annotation-${ann.type}`}
                title={ann.text ? ann.text.slice(0, 90) : undefined}
                style={{
                  left: `${pct.left}%`,
                  top: `${pct.top}%`,
                  width: `${pct.width}%`,
                  height: `${pct.height}%`,
                  background:
                    ann.type === "highlight" ? color.soft : "transparent",
                  borderBottom:
                    ann.type === "underline"
                      ? `2px solid ${color.value}`
                      : undefined,
                  boxShadow:
                    ann.type === "strikeout"
                      ? `inset 0 -0.55em 0 -0.32em ${color.value}`
                      : undefined,
                }}
                onClick={(event) => {
                  event.stopPropagation();
                  const el = event.currentTarget as HTMLElement;
                  onAnnotationClick(ann, el.getBoundingClientRect());
                }}
              />
            );
          })}
        </Fragment>
      );
    });
  }, [annotations, info, onAnnotationClick, rectToPct]);

  return (
    <div
      ref={slotRef}
      className={`page-slot ${isActiveSearch ? "search-active" : ""}`}
      style={{ width, height }}
      data-page={pageNumber}
    >
      <div
        ref={sheetRef}
        className="page-sheet"
        data-page-theme={pageTheme}
        style={{ width, height }}
      >
        <canvas
          ref={canvasRef}
          className="page-canvas"
          style={{ width, height }}
          aria-label={`第 ${label} 页`}
        />
        <div
          ref={textRef}
          className="textLayer page-text-layer"
          onMouseUp={handleMouseUp}
        />
        <div ref={searchLayerRef} className="page-search-layer" />
        <div className="page-annotation-layer">{annotationNodes}</div>
        {!ready && (
          <div className="page-skeleton" style={{ width, height }}>
            <span>第 {label} 页</span>
          </div>
        )}
      </div>
    </div>
  );
}
