import type {
  Annotation,
  Bookmark,
  RecentFile,
  Settings,
} from "./types";

const PREFIX = "paper.";
const KEYS = {
  settings: `${PREFIX}settings`,
  recents: `${PREFIX}recents`,
  annotations: (key: string) => `${PREFIX}annotations.${key}`,
  bookmarks: (key: string) => `${PREFIX}bookmarks.${key}`,
  progress: (key: string) => `${PREFIX}progress.${key}`,
  session: `${PREFIX}session`,
};

export const DEFAULT_SETTINGS: Settings = {
  theme: "system",
  language: "system",
  pageTheme: "normal",
  viewMode: "continuous",
  sidebarOpen: true,
  rememberLastDocument: true,
};

function readJSON<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function writeJSON(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    // Quota exceeded — drop covers from recents and retry once.
    try {
      const recents = readJSON<RecentFile[]>(KEYS.recents, []).map(
        ({ cover: _cover, ...rest }) => rest,
      );
      localStorage.setItem(KEYS.recents, JSON.stringify(recents));
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch {
      return false;
    }
  }
}

export function loadSettings(): Settings {
  return { ...DEFAULT_SETTINGS, ...readJSON<Partial<Settings>>(KEYS.settings, {}) };
}

export function saveSettings(settings: Settings) {
  writeJSON(KEYS.settings, settings);
}

export function loadRecents(): RecentFile[] {
  const list = readJSON<RecentFile[]>(KEYS.recents, []);
  return Array.isArray(list)
    ? list
        .filter((r) => r && typeof r.path === "string")
        .sort((a, b) => b.openedAt - a.openedAt)
    : [];
}

export function rememberRecent(entry: RecentFile) {
  const list = loadRecents().filter((r) => r.path !== entry.path);
  list.unshift(entry);
  writeJSON(KEYS.recents, list.slice(0, 12));
}

export function updateRecent(path: string, patch: Partial<RecentFile>) {
  const list = loadRecents();
  const idx = list.findIndex((r) => r.path === path);
  if (idx === -1) return;
  list[idx] = { ...list[idx], ...patch };
  writeJSON(KEYS.recents, list);
}

export function removeRecent(path: string) {
  writeJSON(
    KEYS.recents,
    loadRecents().filter((r) => r.path !== path),
  );
}

export function loadAnnotations(docKey: string): Annotation[] {
  const list = readJSON<Annotation[]>(KEYS.annotations(docKey), []);
  return Array.isArray(list) ? list : [];
}

export function saveAnnotations(docKey: string, list: Annotation[]) {
  writeJSON(KEYS.annotations(docKey), list.slice(-3000));
}

export function loadBookmarks(docKey: string): Bookmark[] {
  const list = readJSON<Bookmark[]>(KEYS.bookmarks(docKey), []);
  return Array.isArray(list) ? list : [];
}

export function saveBookmarks(docKey: string, list: Bookmark[]) {
  writeJSON(KEYS.bookmarks(docKey), list.slice(-500));
}

export function loadProgress(docKey: string): { page: number } | null {
  return readJSON<{ page: number } | null>(KEYS.progress(docKey), null);
}

export function saveProgress(docKey: string, page: number) {
  writeJSON(KEYS.progress(docKey), { page });
}

export function loadLastSession(): { path: string } | null {
  return readJSON<{ path: string } | null>(KEYS.session, null);
}

export function saveLastSession(path: string | null) {
  if (!path) localStorage.removeItem(KEYS.session);
  else writeJSON(KEYS.session, { path });
}

export function clearDocumentData(docKey: string) {
  localStorage.removeItem(KEYS.annotations(docKey));
  localStorage.removeItem(KEYS.bookmarks(docKey));
  localStorage.removeItem(KEYS.progress(docKey));
}

export const THEME_STORAGE_KEY = "paper.theme";

export function storageAvailable(): boolean {
  try {
    const key = `${PREFIX}probe`;
    localStorage.setItem(key, "1");
    localStorage.removeItem(key);
    return true;
  } catch {
    return false;
  }
}
