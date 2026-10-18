export type Rect = { x: number; y: number; w: number; h: number };

export type AnnotationType = "highlight" | "underline" | "strikeout" | "note";

export type AnnotationColor =
  | "yellow"
  | "green"
  | "blue"
  | "pink"
  | "purple"
  | "orange";

export type Annotation = {
  id: string;
  page: number;
  type: AnnotationType;
  color: AnnotationColor;
  rects: Rect[];
  text: string;
  note?: string;
  createdAt: number;
  updatedAt?: number;
};

export type Bookmark = {
  id: string;
  page: number;
  label: string;
  createdAt: number;
};

export type OutlineItem = {
  id: string;
  title: string;
  page: number | null;
  children: OutlineItem[];
};

export type PageDim = { w: number; h: number };

export type RecentFile = {
  path: string;
  name: string;
  page: number;
  total: number;
  openedAt: number;
  cover?: string;
};

export type SidebarTab = "outline" | "thumbnails" | "search" | "bookmarks" | "annotations";
export type ThemeMode = "system" | "light" | "dark";
export type PageTheme = "normal" | "sepia" | "night";
export type ViewMode = "continuous" | "single";
export type ZoomMode = "fit-width" | "fit-page" | "custom";

export type SelectionInfo = {
  page: number;
  rects: Rect[];
  text: string;
  anchor: { x: number; y: number; width: number; height: number };
};

export type Settings = {
  theme: ThemeMode;
  pageTheme: PageTheme;
  viewMode: ViewMode;
  sidebarOpen: boolean;
  lastPath?: string;
  rememberLastDocument: boolean;
};

export type SearchHit = {
  page: number;
  index: number;
  snippet: string;
  start: number;
  length: number;
};

export type DocInfo = {
  title?: string;
  author?: string;
  subject?: string;
  creator?: string;
  producer?: string;
};

export type LoadedDoc = {
  path: string;
  name: string;
  pdf: import("pdfjs-dist").PDFDocumentProxy;
  destroy: () => Promise<void>;
  numPages: number;
  dims: PageDim[];
  labels: string[];
  outline: OutlineItem[];
  info: DocInfo;
  fingerprint: string;
};

export const ANNOTATION_COLORS: Record<
  AnnotationColor,
  { label: string; value: string; soft: string }
> = {
  yellow: { label: "黄色", value: "#ffd60a", soft: "rgba(255, 214, 10, 0.45)" },
  green: { label: "绿色", value: "#30d158", soft: "rgba(48, 209, 88, 0.4)" },
  blue: { label: "蓝色", value: "#0a84ff", soft: "rgba(10, 132, 255, 0.32)" },
  pink: { label: "粉色", value: "#ff375f", soft: "rgba(255, 55, 95, 0.32)" },
  purple: { label: "紫色", value: "#bf5af2", soft: "rgba(191, 90, 242, 0.32)" },
  orange: { label: "橙色", value: "#ff9f0a", soft: "rgba(255, 159, 10, 0.4)" },
};

export const PAGE_GAP = 28;
