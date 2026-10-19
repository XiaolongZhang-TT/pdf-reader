import { t } from "./i18n";
import { basename, uid } from "./utils";

declare global {
  interface Window {
    __TAURI_INTERNALS__?: unknown;
  }
}

export const isTauri = () =>
  typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;

/** Virtual file registry used by the browser preview (no native APIs there). */
const browserFiles = new Map<string, File>();

const pdfFilter = () => [{ name: t("PDF 文档"), extensions: ["pdf"] }];

export async function pickPdf(): Promise<string[]> {
  if (isTauri()) {
    const { open } = await import("@tauri-apps/plugin-dialog");
    const result = await open({
      multiple: false,
      directory: false,
      filters: pdfFilter(),
    });
    if (!result) return [];
    return Array.isArray(result) ? result : [result];
  }
  return pickPdfInBrowser();
}

function pickPdfInBrowser(): Promise<string[]> {
  return new Promise((resolve) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "application/pdf,.pdf";
    input.style.display = "none";
    document.body.appendChild(input);
    let settled = false;
    const finish = (paths: string[]) => {
      if (settled) return;
      settled = true;
      input.remove();
      resolve(paths);
    };
    input.addEventListener("change", () => {
      const files = Array.from(input.files ?? []);
      finish(files.map(registerBrowserFile));
    });
    input.addEventListener("cancel", () => finish([]));
    input.click();
  });
}

function registerBrowserFile(file: File) {
  const path = `browser://${uid("file")}/${file.name}`;
  browserFiles.set(path, file);
  return path;
}

export async function readFileBytes(path: string): Promise<ArrayBuffer> {
  if (path.startsWith("browser://")) {
    const file = browserFiles.get(path);
    if (!file) throw new Error("浏览器预览模式无法访问之前的文件，请重新打开。");
    return file.arrayBuffer();
  }
  const { invoke } = await import("@tauri-apps/api/core");
  const raw = await invoke<ArrayBuffer | Uint8Array | number[]>("read_file", {
    path,
  });
  if (raw instanceof ArrayBuffer) return raw;
  if (ArrayBuffer.isView(raw)) {
    return raw.buffer.slice(
      raw.byteOffset,
      raw.byteOffset + raw.byteLength,
    ) as ArrayBuffer;
  }
  return new Uint8Array(raw as number[]).buffer;
}

export async function revealInFinder(path: string): Promise<void> {
  if (path.startsWith("browser://") || !isTauri()) return;
  const { invoke } = await import("@tauri-apps/api/core");
  await invoke("reveal_in_finder", { path });
}

export async function takePendingFiles(): Promise<string[]> {
  if (!isTauri()) return [];
  try {
    const { invoke } = await import("@tauri-apps/api/core");
    return await invoke<string[]>("take_pending_files");
  } catch {
    return [];
  }
}

export async function onOpenFile(
  callback: (paths: string[]) => void,
): Promise<() => void> {
  if (!isTauri()) return () => {};
  try {
    const { listen } = await import("@tauri-apps/api/event");
    const unlisten = await listen<string[]>("open-file", (event) => {
      const paths = event.payload;
      if (Array.isArray(paths) && paths.length) callback(paths);
    });
    return unlisten;
  } catch {
    return () => {};
  }
}

/** Native (Tauri) drag & drop plus HTML5 fallback for the browser preview. */
export async function onDropFiles(
  handlers: {
    onHover?: (active: boolean) => void;
    onDrop: (paths: string[]) => void;
  },
): Promise<() => void> {
  if (isTauri()) {
    try {
      const { getCurrentWebview } = await import("@tauri-apps/api/webview");
      const unlisten = await getCurrentWebview().onDragDropEvent((event) => {
        const payload = event.payload;
        if (payload.type === "enter") {
          const pdfs = payload.paths.filter((p) => /\.pdf$/i.test(p));
          handlers.onHover?.(pdfs.length > 0);
        } else if (payload.type === "drop") {
          handlers.onHover?.(false);
          const pdfs = payload.paths.filter((p) => /\.pdf$/i.test(p));
          if (pdfs.length) handlers.onDrop(pdfs);
        } else {
          handlers.onHover?.(false);
        }
      });
      return unlisten;
    } catch {
      return () => {};
    }
  }

  let depth = 0;
  const onDragEnter = (event: DragEvent) => {
    event.preventDefault();
    depth += 1;
    if (event.dataTransfer?.types.includes("Files")) handlers.onHover?.(true);
  };
  const onDragOver = (event: DragEvent) => {
    event.preventDefault();
    if (event.dataTransfer) event.dataTransfer.dropEffect = "copy";
  };
  const onDragLeave = (event: DragEvent) => {
    event.preventDefault();
    depth = Math.max(0, depth - 1);
    if (depth === 0) handlers.onHover?.(false);
  };
  const onDrop = (event: DragEvent) => {
    event.preventDefault();
    depth = 0;
    handlers.onHover?.(false);
    const files = Array.from(event.dataTransfer?.files ?? []).filter(
      (f) => f.type === "application/pdf" || /\.pdf$/i.test(f.name),
    );
    if (files.length) handlers.onDrop(files.map(registerBrowserFile));
  };
  window.addEventListener("dragenter", onDragEnter);
  window.addEventListener("dragover", onDragOver);
  window.addEventListener("dragleave", onDragLeave);
  window.addEventListener("drop", onDrop);
  return () => {
    window.removeEventListener("dragenter", onDragEnter);
    window.removeEventListener("dragover", onDragOver);
    window.removeEventListener("dragleave", onDragLeave);
    window.removeEventListener("drop", onDrop);
  };
}

export function displayName(path: string) {
  return basename(path);
}

export async function appVersion(): Promise<string> {
  if (!isTauri()) return "0.1.0 · 浏览器预览";
  try {
    const { getVersion } = await import("@tauri-apps/api/app");
    return await getVersion();
  } catch {
    return "0.2.0";
  }
}

/** Development-only diagnostics piped to the Rust terminal. */
export function diag(message: string) {
  if (!import.meta.env.DEV) return;
  if (!isTauri()) {
    console.info("[diag]", message);
    return;
  }
  void import("@tauri-apps/api/core")
    .then(({ invoke }) => invoke("log_frontend", { message }))
    .catch(() => undefined);
}

export async function onMenuAction(
  callback: (id: string) => void,
): Promise<() => void> {
  if (!isTauri()) return () => {};
  try {
    const { listen } = await import("@tauri-apps/api/event");
    return await listen<string>("menu-action", (event) => {
      callback(event.payload);
    });
  } catch {
    return () => {};
  }
}

export async function toggleFullscreen(): Promise<void> {
  if (!isTauri()) return;
  try {
    const { getCurrentWindow } = await import("@tauri-apps/api/window");
    const win = getCurrentWindow();
    const full = await win.isFullscreen();
    await win.setFullscreen(!full);
  } catch {
    /* noop */
  }
}

/** Ask the Rust side to rebuild the native menu in the given UI language. */
export async function setMenuLanguage(locale: string): Promise<void> {
  if (!isTauri()) return;
  try {
    const { invoke } = await import("@tauri-apps/api/core");
    await invoke("set_menu_language", { locale });
  } catch {
    /* menu rebuild is best-effort */
  }
}
