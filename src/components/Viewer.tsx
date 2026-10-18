import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { PageView } from "./PageView";
import { PAGE_GAP } from "../lib/types";
import type {
  Annotation,
  LoadedDoc,
  PageTheme,
  SelectionInfo,
  ViewMode,
} from "../lib/types";
import { clamp } from "../lib/utils";

type LayoutItem = {
  page: number;
  left: number;
  top: number;
  width: number;
  height: number;
  scale: number;
};

type Layout = {
  items: LayoutItem[];
  totalHeight: number;
};

function computeLayout(
  doc: LoadedDoc,
  scale: number,
  rotation: number,
  containerWidth: number,
  clampToWidth: boolean,
): Layout {
  const swapped = (((rotation % 360) + 360) % 360) % 180 === 90;
  const gap = PAGE_GAP;
  const availWidth = Math.max(120, containerWidth - 24);
  const items: LayoutItem[] = [];
  let top = gap;
  for (let i = 0; i < doc.numPages; i += 1) {
    const dim = doc.dims[i] ?? { w: 612, h: 792 };
    const baseWidth = swapped ? dim.h : dim.w;
    const baseHeight = swapped ? dim.w : dim.h;
    let pageScale = scale;
    let width = baseWidth * scale;
    let height = baseHeight * scale;
    // "Fit width" should never clip a wider page (for example an intrinsically
    // rotated / landscape page inside a portrait document).
    if (clampToWidth && width > availWidth) {
      pageScale = availWidth / baseWidth;
      width = availWidth;
      height = baseHeight * pageScale;
    }
    items.push({
      page: i + 1,
      left: Math.max(12, (containerWidth - width) / 2),
      top,
      width,
      height,
      scale: pageScale,
    });
    top += height + gap;
  }
  return { items, totalHeight: top + gap };
}

function pageIndexAt(items: LayoutItem[], y: number) {
  let lo = 0;
  let hi = items.length - 1;
  if (hi < 0) return 0;
  if (y <= items[0].top) return 0;
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1;
    if (items[mid].top <= y) lo = mid;
    else hi = mid - 1;
  }
  return lo;
}

type Props = {
  doc: LoadedDoc;
  scale: number;
  rotation: number;
  viewMode: ViewMode;
  fitWidth: boolean;
  pageTheme: PageTheme;
  currentPage: number;
  scrollTarget: { page: number; nonce: number } | null;
  annotations: Annotation[];
  searchQuery: string;
  activeSearchPage: number | null;
  onPageChange: (page: number) => void;
  onSelection: (info: SelectionInfo | null) => void;
  onAnnotationClick: (annotation: Annotation, anchor: DOMRect) => void;
  onViewportResize: (width: number, height: number) => void;
  onZoomGesture?: (delta: number) => void;
};

export type ViewerApi = {
  scrollBy: (delta: number) => void;
  scrollPages: (count: number) => void;
};

export const Viewer = forwardRef<ViewerApi, Props>(function Viewer({
  doc,
  scale,
  rotation,
  viewMode,
  fitWidth,
  pageTheme,
  currentPage,
  scrollTarget,
  annotations,
  searchQuery,
  activeSearchPage,
  onPageChange,
  onSelection,
  onAnnotationClick,
  onViewportResize,
  onZoomGesture,
}: Props, ref) {
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const [viewportSize, setViewportSize] = useState({ w: 0, h: 0 });
  const [range, setRange] = useState<[number, number]>([0, 2]);
  const anchorRef = useRef<{ index: number; ratio: number } | null>(null);
  const lastReported = useRef(0);
  const lastJumpNonce = useRef<number | undefined>(undefined);
  const reportedSize = useRef({ w: 0, h: 0 });

  useImperativeHandle(
    ref,
    () => ({
      scrollBy: (delta: number) => {
        const el = scrollRef.current;
        if (el && viewMode === "continuous") {
          el.scrollBy({ top: delta, behavior: "smooth" });
        }
      },
      scrollPages: (count: number) => {
        const el = scrollRef.current;
        if (el && viewMode === "continuous") {
          el.scrollBy({ top: count * el.clientHeight * 0.9, behavior: "smooth" });
        }
      },
    }),
    [viewMode],
  );

  const layout = useMemo(
    () => computeLayout(doc, scale, rotation, viewportSize.w, fitWidth),
    [doc, scale, rotation, viewportSize.w, fitWidth],
  );

  const pageAnnots = useMemo(() => {
    const map = new Map<number, Annotation[]>();
    for (const ann of annotations) {
      const list = map.get(ann.page);
      if (list) list.push(ann);
      else map.set(ann.page, [ann]);
    }
    return map;
  }, [annotations]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const observer = new ResizeObserver(() => {
      const w = el.clientWidth;
      const h = el.clientHeight;
      setViewportSize({ w, h });
      if (reportedSize.current.w !== w || reportedSize.current.h !== h) {
        reportedSize.current = { w, h };
        onViewportResize(w, h);
      }
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [onViewportResize]);

  const handleScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el || viewMode !== "continuous" || layout.items.length === 0) return;
    if (viewportSize.w <= 0) return;
    const scrollTop = el.scrollTop;
    const height = el.clientHeight;
    const buffer = Math.max(400, height * 1.1);
    let start = 0;
    let end = layout.items.length - 1;
    for (let i = 0; i < layout.items.length; i += 1) {
      const item = layout.items[i];
      if (item.top + item.height >= scrollTop - buffer) {
        start = i;
        break;
      }
    }
    for (let i = layout.items.length - 1; i >= 0; i -= 1) {
      const item = layout.items[i];
      if (item.top <= scrollTop + height + buffer) {
        end = i;
        break;
      }
    }
    setRange((prev) =>
      prev[0] === start && prev[1] === end ? prev : [start, end],
    );

    const centerY = scrollTop + height / 2;
    const index = pageIndexAt(layout.items, centerY);
    const item = layout.items[index];
    if (item && item.height > 0) {
      anchorRef.current = {
        index,
        ratio: clamp((centerY - item.top) / item.height, 0, 1),
      };
    }
    const page = index + 1;
    if (page !== lastReported.current) {
      lastReported.current = page;
      onPageChange(page);
    }
  }, [layout, onPageChange, viewMode, viewportSize.w]);

  useEffect(() => {
    if (viewMode !== "continuous") return;
    const el = scrollRef.current;
    if (!el) return;
    let raf = 0;
    const onScroll = () => {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        handleScroll();
      });
    };
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      el.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(raf);
    };
  }, [handleScroll, viewMode]);

  useEffect(() => {
    handleScroll();
  }, [handleScroll, viewportSize.h, scale, rotation]);

  // Keep the reading anchor stable across zoom / rotation changes.
  useLayoutEffect(() => {
    const el = scrollRef.current;
    if (!el || viewMode !== "continuous" || viewportSize.w <= 0) return;
    const anchor = anchorRef.current;
    if (!anchor || layout.items.length === 0) return;
    const index = clamp(anchor.index, 0, layout.items.length - 1);
    const item = layout.items[index];
    if (!item) return;
    const target = item.top + anchor.ratio * item.height - el.clientHeight / 2;
    el.scrollTop = Math.max(0, target);
  }, [layout, viewMode, viewportSize.w]);

  useEffect(() => {
    if (!scrollTarget || scrollTarget.nonce === lastJumpNonce.current) return;
    if (viewportSize.w <= 0) return;
    lastJumpNonce.current = scrollTarget.nonce;
    const el = scrollRef.current;
    if (!el) return;
    if (viewMode === "single") {
      lastReported.current = scrollTarget.page;
      return;
    }
    const index = clamp(scrollTarget.page - 1, 0, layout.items.length - 1);
    const item = layout.items[index];
    if (!item) return;
    const target = Math.max(0, item.top - 14);
    const smooth = Math.abs(target - el.scrollTop) < el.clientHeight * 2.5;
    el.scrollTo({ top: target, behavior: smooth ? "smooth" : "auto" });
    anchorRef.current = null;
    lastReported.current = scrollTarget.page;
    onPageChange(scrollTarget.page);
  }, [scrollTarget, layout, viewMode, viewportSize.w, onPageChange]);

  useEffect(() => {
    if (viewMode === "single") {
      lastReported.current = currentPage;
      scrollRef.current?.scrollTo({ top: 0, behavior: "auto" });
    }
  }, [viewMode, currentPage]);

  const handleWheel = useCallback(
    (event: React.WheelEvent) => {
      if (!onZoomGesture) return;
      if (!(event.ctrlKey || event.metaKey)) return;
      event.preventDefault();
      onZoomGesture(event.deltaY > 0 ? -1 : 1);
    },
    [onZoomGesture],
  );

  const singleItem = useMemo(() => {
    if (viewMode !== "single") return null;
    const swapped = (((rotation % 360) + 360) % 360) % 180 === 90;
    const dim = doc.dims[currentPage - 1] ?? { w: 612, h: 792 };
    const baseWidth = swapped ? dim.h : dim.w;
    const baseHeight = swapped ? dim.w : dim.h;
    let pageScale = scale;
    const availWidth = Math.max(120, viewportSize.w - 40);
    if (fitWidth && baseWidth * scale > availWidth) {
      pageScale = availWidth / baseWidth;
    }
    return {
      width: baseWidth * pageScale,
      height: baseHeight * pageScale,
      scale: pageScale,
    };
  }, [viewMode, rotation, doc.dims, currentPage, scale, fitWidth, viewportSize.w]);

  const renderPage = (
    page: number,
    width: number,
    height: number,
    pageScale: number,
  ) => (
    <PageView
      key={`${page}`}
      pdf={doc.pdf}
      pageNumber={page}
      label={doc.labels[page - 1] ?? String(page)}
      width={width}
      height={height}
      scale={pageScale}
      rotation={rotation}
      pageTheme={pageTheme}
      annotations={pageAnnots.get(page) ?? []}
      searchQuery={searchQuery}
      isActiveSearch={activeSearchPage === page}
      onSelection={onSelection}
      onAnnotationClick={onAnnotationClick}
    />
  );

  if (viewMode === "single") {
    return (
      <div className="viewer viewer-single" ref={scrollRef} onWheel={handleWheel}>
        <div className="single-stage">
          {singleItem &&
            renderPage(
              currentPage,
              singleItem.width,
              singleItem.height,
              singleItem.scale,
            )}
        </div>
      </div>
    );
  }

  return (
    <div
      className="viewer viewer-continuous"
      ref={scrollRef}
      onWheel={handleWheel}
    >
      <div
        className="page-layout"
        style={{ height: layout.totalHeight, position: "relative" }}
      >
        {layout.items.map((item, index) => {
          const visible = index >= range[0] && index <= range[1];
          if (!visible) {
            return (
              <div
                key={`ph-${item.page}`}
                className="page-placeholder"
                style={{
                  left: item.left,
                  top: item.top,
                  width: item.width,
                  height: item.height,
                }}
              >
                <span>{doc.labels[index] ?? item.page}</span>
              </div>
            );
          }
          return (
            <div
              key={`page-${item.page}`}
              className="page-position"
              style={{ left: item.left, top: item.top }}
            >
              {renderPage(item.page, item.width, item.height, item.scale)}
            </div>
          );
        })}
      </div>
      <div className="viewer-bottom-space" />
    </div>
  );
});
