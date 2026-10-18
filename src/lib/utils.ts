import type { Rect } from "./types";

export const clamp = (v: number, min: number, max: number) =>
  Math.min(max, Math.max(min, v));

export function cn(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}

let uidCounter = 0;
export function uid(prefix = "id") {
  uidCounter += 1;
  return `${prefix}_${Date.now().toString(36)}_${uidCounter}_${Math.random()
    .toString(36)
    .slice(2, 7)}`;
}

export function basename(path: string) {
  const clean = path.replace(/\\/g, "/").replace(/\/+$/, "");
  const name = clean.slice(clean.lastIndexOf("/") + 1);
  return name || path;
}

export function stripExtension(name: string) {
  return name.replace(/\.pdf$/i, "");
}

export function dirname(path: string) {
  const clean = path.replace(/\\/g, "/");
  const idx = clean.lastIndexOf("/");
  return idx <= 0 ? "" : clean.slice(0, idx);
}

export function debounce<F extends (...args: never[]) => void>(fn: F, wait: number) {
  let timer: ReturnType<typeof setTimeout> | null = null;
  const wrapped = (...args: Parameters<F>) => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => fn(...args), wait);
  };
  wrapped.cancel = () => {
    if (timer) clearTimeout(timer);
    timer = null;
  };
  return wrapped as F & { cancel: () => void };
}

export function formatRelativeTime(ts: number) {
  const diff = Date.now() - ts;
  const minute = 60_000;
  const hour = 60 * minute;
  const day = 24 * hour;
  if (diff < minute) return "刚刚";
  if (diff < hour) return `${Math.floor(diff / minute)} 分钟前`;
  if (diff < day) return `${Math.floor(diff / hour)} 小时前`;
  if (diff < 7 * day) return `${Math.floor(diff / day)} 天前`;
  const d = new Date(ts);
  return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, "0")}/${String(
    d.getDate(),
  ).padStart(2, "0")}`;
}

export function formatBytes(bytes: number) {
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const i = Math.min(units.length - 1, Math.floor(Math.log(bytes) / Math.log(1024)));
  return `${(bytes / Math.pow(1024, i)).toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}

/** Merge boxes that belong to one text line into a single readable highlight. */
export function mergeRects(input: Rect[]): Rect[] {
  const rects = input
    .map((r) => ({
      x: clamp(r.x, 0, 1),
      y: clamp(r.y, 0, 1),
      w: Math.max(0, r.w),
      h: Math.max(0, r.h),
    }))
    .filter((r) => r.w > 0.001 && r.h > 0.001)
    .sort((a, b) => (Math.abs(a.y - b.y) < 0.004 ? a.x - b.x : a.y - b.y));

  const out: Rect[] = [];
  for (const rect of rects) {
    const last = out[out.length - 1];
    const sameLine =
      last &&
      Math.abs(last.y - rect.y) < 0.006 &&
      Math.abs(last.h - rect.h) < 0.01 &&
      Math.abs(last.x + last.w - rect.x) < 0.02;
    if (sameLine) {
      last.w = Math.max(last.x + last.w, rect.x + rect.w) - last.x;
      last.h = Math.max(last.h, rect.h);
    } else {
      out.push({ ...rect });
    }
  }
  return out;
}

/**
 * Convert a client-space point into the unrotated local coordinates of a page
 * wrapper that has been visually rotated around its center by `rotation`.
 */
export function screenToLocal(
  px: number,
  py: number,
  bbox: { left: number; top: number; width: number; height: number },
  rotation: number,
  localW: number,
  localH: number,
) {
  const cx = bbox.left + bbox.width / 2;
  const cy = bbox.top + bbox.height / 2;
  const dx = px - cx;
  const dy = py - cy;
  switch (((rotation % 360) + 360) % 360) {
    case 90:
      return { x: localW / 2 + dy, y: localH / 2 - dx };
    case 180:
      return { x: localW / 2 - dx, y: localH / 2 - dy };
    case 270:
      return { x: localW / 2 - dy, y: localH / 2 + dx };
    default:
      return { x: localW / 2 + dx, y: localH / 2 + dy };
  }
}

/** Rectangles of the current text selection mapped into normalized page space. */
export function getSelectionRects(
  pageEl: HTMLElement,
  rotation: number,
  localW: number,
  localH: number,
): Rect[] {
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0 || selection.isCollapsed) return [];
  const range = selection.getRangeAt(0);
  if (!pageEl.contains(range.commonAncestorContainer)) return [];
  const bbox = pageEl.getBoundingClientRect();
  if (bbox.width === 0 || bbox.height === 0) return [];
  const out: Rect[] = [];
  const clientRects = Array.from(range.getClientRects());
  for (const r of clientRects) {
    if (r.width < 1 || r.height < 1) continue;
    const a = screenToLocal(r.left, r.top, bbox, rotation, localW, localH);
    const b = screenToLocal(r.right, r.bottom, bbox, rotation, localW, localH);
    const x = Math.min(a.x, b.x);
    const y = Math.min(a.y, b.y);
    out.push({
      x: x / localW,
      y: y / localH,
      w: Math.abs(b.x - a.x) / localW,
      h: Math.abs(b.y - a.y) / localH,
    });
  }
  return mergeRects(out);
}

export function pointsToRect(
  a: { x: number; y: number },
  b: { x: number; y: number },
  localW: number,
  localH: number,
): Rect {
  return {
    x: Math.min(a.x, b.x) / localW,
    y: Math.min(a.y, b.y) / localH,
    w: Math.abs(b.x - a.x) / localW,
    h: Math.abs(b.y - a.y) / localH,
  };
}

export function rangeIntersectsPage(range: Range, pageEl: HTMLElement) {
  return pageEl.contains(range.commonAncestorContainer);
}

export function truncate(text: string, max = 80) {
  const flat = text.replace(/\s+/g, " ").trim();
  return flat.length > max ? `${flat.slice(0, max)}…` : flat;
}

export function isEditableTarget(target: EventTarget | null) {
  const el = target as HTMLElement | null;
  if (!el) return false;
  const tag = el.tagName;
  return (
    tag === "INPUT" ||
    tag === "TEXTAREA" ||
    tag === "SELECT" ||
    el.isContentEditable
  );
}

/** Clipboard helper that also works inside the Tauri webview. */
export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    try {
      const area = document.createElement("textarea");
      area.value = text;
      area.style.position = "fixed";
      area.style.opacity = "0";
      document.body.appendChild(area);
      area.select();
      const ok = document.execCommand("copy");
      area.remove();
      return ok;
    } catch {
      return false;
    }
  }
}
