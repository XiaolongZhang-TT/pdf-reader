import * as pdfjsLib from "pdfjs-dist";
import type {
  PDFDocumentProxy,
  PDFPageProxy,
} from "pdfjs-dist";
import workerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import { uid } from "./utils";
import type { DocInfo, OutlineItem, PageDim, SearchHit } from "./types";

pdfjsLib.GlobalWorkerOptions.workerSrc = workerUrl;

const ASSET_BASE = new URL("./pdfjs/", window.location.href).href;

const textCache = new Map<string, string>();
const textCacheOrder: string[] = [];

function cacheText(key: string, text: string) {
  textCache.set(key, text);
  textCacheOrder.push(key);
  while (textCacheOrder.length > 200) {
    const oldest = textCacheOrder.shift();
    if (oldest) textCache.delete(oldest);
  }
}

export type OpenOptions = {
  onProgress?: (loaded: number, total: number) => void;
  onPassword?: (
    updatePassword: (password: string) => void,
    reason: number,
  ) => void;
  onTask?: (task: import("pdfjs-dist").PDFDocumentLoadingTask) => void;
};

export type OpenedPdf = {
  pdf: PDFDocumentProxy;
  destroy: () => Promise<void>;
  numPages: number;
  dims: PageDim[];
  labels: string[];
  outline: OutlineItem[];
  info: DocInfo;
  fingerprint: string;
};

export async function openPdf(
  bytes: ArrayBuffer,
  options: OpenOptions = {},
): Promise<OpenedPdf> {
  const data = new Uint8Array(bytes.slice(0));
  const task = pdfjsLib.getDocument({
    data,
    cMapUrl: `${ASSET_BASE}cmaps/`,
    cMapPacked: true,
    standardFontDataUrl: `${ASSET_BASE}standard_fonts/`,
    wasmUrl: `${ASSET_BASE}wasm/`,
    iccUrl: `${ASSET_BASE}iccs/`,
    enableXfa: true,
    useSystemFonts: true,
  });
  if (options.onProgress) {
    task.onProgress = (p: { loaded: number; total: number }) => {
      options.onProgress?.(p.loaded, p.total || 0);
    };
  }
  options.onTask?.(task);
  if (options.onPassword) {
    task.onPassword = (
      updatePassword: (password: string) => void,
      reason: number,
    ) => {
      options.onPassword?.(updatePassword, reason);
    };
  }
  const pdf = await task.promise;

  const [labels, outline, info, dims] = await Promise.all([
    safe(() => pdf.getPageLabels(), null),
    readOutline(pdf),
    readInfo(pdf),
    readPageDims(pdf),
  ]);

  const fingerprint =
    (pdf as unknown as { fingerprints?: string[] }).fingerprints?.[0] ??
    uid("doc");

  return {
    pdf,
    destroy: () => task.destroy(),
    numPages: pdf.numPages,
    dims,
    labels: labels ?? [],
    outline,
    info,
    fingerprint,
  };
}

async function safe<T>(fn: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await fn();
  } catch {
    return fallback;
  }
}

export async function readInfo(pdf: PDFDocumentProxy): Promise<DocInfo> {
  try {
    const meta = await pdf.getMetadata();
    const raw = (meta?.info ?? {}) as Record<string, unknown>;
    const str = (v: unknown) =>
      typeof v === "string" && v.trim() ? v.trim() : undefined;
    return {
      title: str(raw.Title),
      author: str(raw.Author),
      subject: str(raw.Subject),
      creator: str(raw.Creator),
      producer: str(raw.Producer),
    };
  } catch {
    return {};
  }
}

export async function readPageDims(pdf: PDFDocumentProxy): Promise<PageDim[]> {
  const dims: PageDim[] = [];
  for (let i = 1; i <= pdf.numPages; i += 1) {
    try {
      const page = await pdf.getPage(i);
      const vp = page.getViewport({ scale: 1 });
      dims.push({ w: Math.round(vp.width * 100) / 100, h: Math.round(vp.height * 100) / 100 });
      page.cleanup();
    } catch {
      dims.push({ w: 612, h: 792 });
    }
    if (i % 24 === 0) {
      await new Promise((resolve) => setTimeout(resolve, 0));
    }
  }
  return dims;
}

type RawOutlineItem = {
  title?: string;
  dest?: string | unknown[] | null;
  items?: RawOutlineItem[];
};

export async function readOutline(pdf: PDFDocumentProxy): Promise<OutlineItem[]> {
  let raw: RawOutlineItem[] | null = null;
  try {
    raw = (await pdf.getOutline()) as RawOutlineItem[] | null;
  } catch {
    return [];
  }
  if (!raw || raw.length === 0) return [];

  const resolvePage = async (
    dest: RawOutlineItem["dest"],
  ): Promise<number | null> => {
    try {
      let explicit: unknown = dest;
      if (typeof dest === "string") explicit = await pdf.getDestination(dest);
      if (!Array.isArray(explicit)) return null;
      const ref = explicit[0] as Parameters<PDFDocumentProxy["getPageIndex"]>[0];
      if (!ref) return null;
      const index = await pdf.getPageIndex(ref);
      return index + 1;
    } catch {
      return null;
    }
  };

  const walk = async (items: RawOutlineItem[]): Promise<OutlineItem[]> => {
    const out: OutlineItem[] = [];
    for (const item of items) {
      out.push({
        id: uid("outline"),
        title: (item.title ?? "").trim() || "未命名目录",
        page: await resolvePage(item.dest ?? null),
        children: item.items?.length ? await walk(item.items) : [],
      });
    }
    return out;
  };

  return walk(raw);
}

function cacheKey(pdf: PDFDocumentProxy, pageNumber: number) {
  const fp = (pdf as unknown as { fingerprints?: string[] }).fingerprints?.[0];
  return `${fp ?? pdf.numPages}:${pageNumber}`;
}

export async function getPageText(
  pdf: PDFDocumentProxy,
  pageNumber: number,
): Promise<string> {
  const key = cacheKey(pdf, pageNumber);
  const cached = textCache.get(key);
  if (cached !== undefined) return cached;
  const page = await pdf.getPage(pageNumber);
  try {
    const content = await page.getTextContent();
    let text = "";
    for (const item of content.items as Array<Record<string, unknown>>) {
      if (typeof item.str === "string") {
        text += item.str;
        if (item.hasEOL) text += "\n";
      }
    }
    cacheText(key, text);
    return text;
  } finally {
    page.cleanup();
  }
}

export function clearTextCache() {
  textCache.clear();
  textCacheOrder.length = 0;
}

export async function searchDocument(
  pdf: PDFDocumentProxy,
  query: string,
  options: {
    maxResults?: number;
    onProgress?: (page: number, total: number) => void;
    isCancelled?: () => boolean;
  } = {},
): Promise<SearchHit[]> {
  const needle = query.trim().toLowerCase();
  if (needle.length < 1) return [];
  const maxResults = options.maxResults ?? 400;
  const hits: SearchHit[] = [];
  for (let page = 1; page <= pdf.numPages; page += 1) {
    if (options.isCancelled?.()) return hits;
    const text = await getPageText(pdf, page);
    const lower = text.toLowerCase();
    let from = 0;
    while (from <= lower.length) {
      const found = lower.indexOf(needle, from);
      if (found === -1) break;
      const snippetStart = Math.max(0, found - 48);
      const snippetEnd = Math.min(text.length, found + needle.length + 72);
      const snippet =
        (snippetStart > 0 ? "…" : "") +
        text.slice(snippetStart, snippetEnd).replace(/\s+/g, " ").trim() +
        (snippetEnd < text.length ? "…" : "");
      hits.push({
        page,
        index: hits.length,
        snippet,
        start: found,
        length: needle.length,
      });
      if (hits.length >= maxResults) {
        options.onProgress?.(page, pdf.numPages);
        return hits;
      }
      from = found + Math.max(1, needle.length);
    }
    if (page % 4 === 0) options.onProgress?.(page, pdf.numPages);
  }
  options.onProgress?.(pdf.numPages, pdf.numPages);
  return hits;
}

export function textForRange(
  pageText: string,
  hit: SearchHit,
): string {
  return pageText.slice(hit.start, hit.start + hit.length);
}

/** Render a page to a data URL — used for recent-file covers. */
export async function renderPageCover(
  pdf: PDFDocumentProxy,
  pageNumber: number,
  targetWidth = 260,
): Promise<string | null> {
  try {
    const page = await pdf.getPage(pageNumber);
    const base = page.getViewport({ scale: 1 });
    const scale = targetWidth / base.width;
    const viewport = page.getViewport({ scale });
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.floor(viewport.width));
    canvas.height = Math.max(1, Math.floor(viewport.height));
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    await page.render({ canvas: canvas, canvasContext: ctx, viewport }).promise;
    page.cleanup();
    return canvas.toDataURL("image/jpeg", 0.72);
  } catch {
    return null;
  }
}

export async function renderPageThumb(
  pdf: PDFDocumentProxy,
  pageNumber: number,
  targetWidth: number,
): Promise<string | null> {
  try {
    const page = await pdf.getPage(pageNumber);
    const base = page.getViewport({ scale: 1 });
    const scale = targetWidth / base.width;
    const viewport = page.getViewport({ scale });
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.floor(viewport.width * 2));
    canvas.height = Math.max(1, Math.floor(viewport.height * 2));
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    const dpr = 2;
    await page.render({
      canvas,
      canvasContext: ctx,
      viewport,
      transform: [dpr, 0, 0, dpr, 0, 0],
    }).promise;
    page.cleanup();
    return canvas.toDataURL("image/jpeg", 0.8);
  } catch {
    return null;
  }
}

export async function getPageSnippet(
  pdf: PDFDocumentProxy,
  pageNumber: number,
  max = 60,
): Promise<string> {
  try {
    const text = await getPageText(pdf, pageNumber);
    const flat = text.replace(/\s+/g, " ").trim();
    return flat.slice(0, max);
  } catch {
    return "";
  }
}

export { pdfjsLib };
export type { PDFDocumentProxy, PDFPageProxy };
