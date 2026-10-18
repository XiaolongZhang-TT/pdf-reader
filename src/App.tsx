import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { PDFDocumentLoadingTask } from "pdfjs-dist";
import { TitleBar } from "./components/TitleBar";
import { Sidebar } from "./components/Sidebar";
import type { SearchState } from "./components/Sidebar";
import { Viewer } from "./components/Viewer";
import type { ViewerApi } from "./components/Viewer";
import { Toolbar } from "./components/Toolbar";
import { EmptyState } from "./components/EmptyState";
import { SelectionMenu } from "./components/SelectionMenu";
import { AnnotationPopover } from "./components/AnnotationPopover";
import { SettingsPopover } from "./components/SettingsPopover";
import {
  DropOverlay,
  LoadingOverlay,
  PasswordPrompt,
  Toasts,
} from "./components/Feedback";
import type { ToastItem } from "./components/Feedback";
import { Icon } from "./lib/icons";
import { flattenOutline, outlinePathIds, pickActiveOutline } from "./lib/outline";
import { getPageSnippet, openPdf, renderPageCover, searchDocument } from "./lib/pdf";
import {
  loadAnnotations,
  loadBookmarks,
  loadLastSession,
  loadProgress,
  loadRecents,
  loadSettings,
  rememberRecent,
  removeRecent,
  saveAnnotations,
  saveBookmarks,
  saveLastSession,
  saveProgress,
  saveSettings,
  storageAvailable,
  updateRecent,
} from "./lib/storage";
import {
  appVersion,
  displayName,
  isTauri,
  onDropFiles,
  onOpenFile,
  pickPdf,
  readFileBytes,
  revealInFinder,
  takePendingFiles,
  toggleFullscreen,
  onMenuAction,
  diag,
} from "./lib/platform";
import { PAGE_GAP } from "./lib/types";
import type {
  Annotation,
  AnnotationColor,
  AnnotationType,
  Bookmark,
  LoadedDoc,
  RecentFile,
  SearchHit,
  SelectionInfo,
  Settings,
  SidebarTab,
  ViewMode,
  ZoomMode,
} from "./lib/types";
import {
  basename,
  clamp,
  copyText,
  isEditableTarget,
  stripExtension,
  truncate,
  uid,
} from "./lib/utils";

type LoadingState = {
  active: boolean;
  progress: number | null;
  title: string;
  subtitle?: string;
};

type PasswordState = { open: boolean; incorrect: boolean };

type OpenOptions = { page?: number; quiet?: boolean };

const THEME_STORAGE_KEY = "paper.theme";

export default function App() {
  const [doc, setDoc] = useState<LoadedDoc | null>(null);
  const [settings, setSettings] = useState<Settings>(() => loadSettings());
  const [recents, setRecents] = useState<RecentFile[]>(() => loadRecents());
  const [currentPage, setCurrentPage] = useState(1);
  const [stageSize, setStageSize] = useState({ w: 1100, h: 780 });
  const [zoomMode, setZoomMode] = useState<ZoomMode>("fit-width");
  const [customScale, setCustomScale] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [sidebarTab, setSidebarTab] = useState<SidebarTab>("outline");
  const [activeOutlineId, setActiveOutlineId] = useState<string | null>(null);
  const [focusNonce, setFocusNonce] = useState(0);
  const [scrollTarget, setScrollTarget] = useState<{
    page: number;
    nonce: number;
  } | null>(null);
  const [selection, setSelection] = useState<SelectionInfo | null>(null);
  const [activeAnnotation, setActiveAnnotation] = useState<{
    annotation: Annotation;
    anchor: { x: number; y: number; width: number; height: number };
  } | null>(null);
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchHit[]>([]);
  const [searchActive, setSearchActive] = useState(-1);
  const [searching, setSearching] = useState(false);
  const [searchProgress, setSearchProgress] = useState(0);
  const [activeSearchPage, setActiveSearchPage] = useState<number | null>(null);
  const [loadingState, setLoadingState] = useState<LoadingState>({
    active: false,
    progress: null,
    title: "",
  });
  const [passwordPrompt, setPasswordPrompt] = useState<PasswordState>({
    open: false,
    incorrect: false,
  });
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [dropActive, setDropActive] = useState(false);
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [version, setVersion] = useState("0.1.0");

  const docRef = useRef<LoadedDoc | null>(null);
  const pageRef = useRef(1);
  const settingsRef = useRef(settings);
  const annotationsRef = useRef<Annotation[]>([]);
  const bookmarksRef = useRef<Bookmark[]>([]);
  const viewerApi = useRef<ViewerApi | null>(null);
  const jumpNonceRef = useRef(0);
  const loadTokenRef = useRef(0);
  const loadingTaskRef = useRef<PDFDocumentLoadingTask | null>(null);
  const passwordResolver = useRef<((password: string | null) => void) | null>(
    null,
  );
  const passwordCancelled = useRef(false);
  const undoStack = useRef<Array<{ kind: "add" | "delete"; annotation: Annotation }>>(
    [],
  );
  const searchToken = useRef(0);
  const openRef = useRef<(path: string, options?: OpenOptions) => Promise<void>>(
    async () => {},
  );

  useEffect(() => {
    docRef.current = doc;
  }, [doc]);
  useEffect(() => {
    pageRef.current = currentPage;
  }, [currentPage]);
  useEffect(() => {
    settingsRef.current = settings;
    saveSettings(settings);
  }, [settings]);
  useEffect(() => {
    annotationsRef.current = annotations;
  }, [annotations]);
  useEffect(() => {
    bookmarksRef.current = bookmarks;
  }, [bookmarks]);

  const toast = useCallback(
    (message: string, kind: ToastItem["kind"] = "info", icon?: ToastItem["icon"]) => {
      const id = uid("toast");
      setToasts((prev) => [...prev.slice(-2), { id, message, kind, icon }]);
      window.setTimeout(() => {
        setToasts((prev) => prev.filter((item) => item.id !== id));
      }, 3200);
    },
    [],
  );

  /* ---------------------------------------------------------------- theme */

  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const apply = () => {
      const dark =
        settings.theme === "dark" ||
        (settings.theme === "system" && media.matches);
      document.documentElement.dataset.theme = dark ? "dark" : "light";
      try {
        localStorage.setItem(THEME_STORAGE_KEY, settings.theme);
      } catch {
        /* noop */
      }
    };
    apply();
    media.addEventListener("change", apply);
    return () => media.removeEventListener("change", apply);
  }, [settings.theme]);

  /* --------------------------------------------------------- open / close */

  const commitAnnotations = useCallback((next: Annotation[]) => {
    const current = docRef.current;
    if (current) saveAnnotations(current.fingerprint, next);
    annotationsRef.current = next;
    setAnnotations(next);
  }, []);

  const commitBookmarks = useCallback((next: Bookmark[]) => {
    const current = docRef.current;
    if (current) saveBookmarks(current.fingerprint, next);
    bookmarksRef.current = next;
    setBookmarks(next);
  }, []);

  const openDocument = useCallback(
    async (path: string, options: OpenOptions = {}) => {
      if (!path) return;
      const previous = docRef.current;
      if (previous) {
        saveProgress(previous.fingerprint, pageRef.current);
        updateRecent(previous.path, { page: pageRef.current });
      }
      diag(`open-start path=${path}`);
      loadTokenRef.current += 1;
      const token = loadTokenRef.current;
      setSelection(null);
      setActiveAnnotation(null);
      setSettingsOpen(false);
      setPasswordPrompt({ open: false, incorrect: false });
      setLoadingState({
        active: true,
        progress: null,
        title: "正在打开文档",
        subtitle: basename(path),
      });

      try {
        const bytes = await readFileBytes(path);
        if (token !== loadTokenRef.current) return;
        setLoadingState((prev) => ({ ...prev, title: "正在解析 PDF" }));
        const opened = await openPdf(bytes, {
          onProgress: (loaded, total) => {
            if (token !== loadTokenRef.current) return;
            setLoadingState((prev) => ({
              ...prev,
              progress: total > 0 ? Math.round((loaded / total) * 100) : null,
            }));
          },
          onTask: (task) => {
            loadingTaskRef.current = task;
          },
          onPassword: (updatePassword, reason) => {
            setPasswordPrompt({ open: true, incorrect: reason === 2 });
            passwordResolver.current = (password) => {
              if (password == null) {
                passwordCancelled.current = true;
                setPasswordPrompt({ open: false, incorrect: false });
                void loadingTaskRef.current?.destroy();
                return;
              }
              setPasswordPrompt({ open: true, incorrect: false });
              updatePassword(password);
            };
          },
        });
        if (token !== loadTokenRef.current) {
          void opened.destroy();
          return;
        }
        setPasswordPrompt({ open: false, incorrect: false });
        const loaded: LoadedDoc = {
          path,
          name: displayName(path),
          pdf: opened.pdf,
          destroy: opened.destroy,
          numPages: opened.numPages,
          dims: opened.dims,
          labels: opened.labels,
          outline: opened.outline,
          info: opened.info,
          fingerprint: opened.fingerprint,
        };
        const key = opened.fingerprint;
        if (previous && previous.pdf !== opened.pdf) {
          const oldDestroy = previous.destroy;
          window.setTimeout(() => {
            void oldDestroy().catch(() => undefined);
          }, 0);
        }
        undoStack.current = [];
        setDoc(loaded);
        setAnnotations(loadAnnotations(key));
        setBookmarks(loadBookmarks(key));
        setRotation(0);
        setZoomMode("fit-width");
        setSearchQuery("");
        setSearchResults([]);
        setSearchActive(-1);
        setActiveSearchPage(null);
        setSearching(false);
        const savedPage = loadProgress(key)?.page ?? 1;
        const targetPage = clamp(
          options.page ?? savedPage,
          1,
          opened.numPages,
        );
        setCurrentPage(targetPage);
        jumpNonceRef.current += 1;
        setScrollTarget({ page: targetPage, nonce: jumpNonceRef.current });
        setLoadingState({ active: false, progress: null, title: "" });
        if (settingsRef.current.rememberLastDocument) saveLastSession(path);
        rememberRecent({
          path,
          name: displayName(path),
          page: targetPage,
          total: opened.numPages,
          openedAt: Date.now(),
        });
        setRecents(loadRecents());
        diag(
          `document-opened name=${displayName(path)} pages=${opened.numPages} outline=${opened.outline.length} labels=${opened.labels.length} storage=${storageAvailable()}`,
        );
        toast(`已打开 ${displayName(path)}`, "success", "check");
        void renderPageCover(opened.pdf, 1, 240).then((cover) => {
          if (!cover) return;
          updateRecent(path, { cover });
          setRecents(loadRecents());
        });
      } catch (error) {
        if (token !== loadTokenRef.current) return;
        setLoadingState({ active: false, progress: null, title: "" });
        setPasswordPrompt({ open: false, incorrect: false });
        if (passwordCancelled.current) {
          passwordCancelled.current = false;
          return;
        }
        diag(`open-error ${String((error as Error)?.message ?? error)}`);
        if (!options.quiet) {
          console.warn("openDocument failed", error);
          toast("无法打开这个 PDF，文件可能已损坏或被移动", "error");
          removeRecent(path);
          setRecents(loadRecents());
        } else {
          saveLastSession(null);
        }
      }
    },
    [toast],
  );

  useEffect(() => {
    openRef.current = openDocument;
  }, [openDocument]);

  const closeDocument = useCallback(() => {
    const current = docRef.current;
    if (!current) return;
    saveProgress(current.fingerprint, pageRef.current);
    updateRecent(current.path, { page: pageRef.current });
    void current.destroy().catch(() => undefined);
    loadTokenRef.current += 1;
    docRef.current = null;
    setDoc(null);
    setAnnotations([]);
    setBookmarks([]);
    setSelection(null);
    setActiveAnnotation(null);
    setSearchQuery("");
    setSearchResults([]);
    setSearchActive(-1);
    setActiveSearchPage(null);
    setCurrentPage(1);
    setRotation(0);
    setZoomMode("fit-width");
    setRecents(loadRecents());
    saveLastSession(null);
  }, []);

  const handleOpen = useCallback(async () => {
    try {
      const paths = await pickPdf();
      if (paths[0]) await openDocument(paths[0]);
    } catch (error) {
      console.warn(error);
      toast("无法打开文件选择器", "error");
    }
  }, [openDocument, toast]);

  /* ------------------------------------------------------------- shortcuts */

  const toggleSidebar = useCallback(() => {
    setSettings((prev) => ({ ...prev, sidebarOpen: !prev.sidebarOpen }));
  }, []);

  const openSearch = useCallback(() => {
    if (!docRef.current) return;
    setSettings((prev) => ({ ...prev, sidebarOpen: true }));
    setSidebarTab("search");
    setFocusNonce((nonce) => nonce + 1);
  }, []);

  const cycleTheme = useCallback(() => {
    setSettings((prev) => ({
      ...prev,
      theme:
        prev.theme === "system" ? "light" : prev.theme === "light" ? "dark" : "system",
    }));
  }, []);

  const cyclePageTheme = useCallback(() => {
    setSettings((prev) => ({
      ...prev,
      pageTheme:
        prev.pageTheme === "normal"
          ? "sepia"
          : prev.pageTheme === "sepia"
            ? "night"
            : "normal",
    }));
  }, []);

  const updateSetting = useCallback(
    function updateSetting<K extends keyof Settings>(key: K, value: Settings[K]) {
      setSettings((prev) => ({ ...prev, [key]: value }));
    },
    [],
  );

  /* ------------------------------------------------------------ page math */

  // Fit-width uses the median page width so a single landscape/rotated page
  // does not shrink every other page in the document.
  const fitBasisWidth = useMemo(() => {
    if (!doc) return 612;
    const swapped = (((rotation % 360) + 360) % 360) % 180 === 90;
    const widths = doc.dims
      .map((dim) => (swapped ? dim.h : dim.w))
      .sort((a, b) => a - b);
    return widths[Math.floor(widths.length / 2)] || 612;
  }, [doc, rotation]);

  const effectiveScale = useMemo(() => {
    if (!doc) return 1;
    const clampedPage = clamp(currentPage, 1, doc.numPages);
    const dim = doc.dims[clampedPage - 1] ?? { w: 612, h: 792 };
    const swapped = (((rotation % 360) + 360) % 360) % 180 === 90;
    const width = swapped ? dim.h : dim.w;
    const height = swapped ? dim.w : dim.h;
    const availW = Math.max(240, stageSize.w - PAGE_GAP * 2);
    const availH = Math.max(240, stageSize.h - PAGE_GAP * 2);
    if (zoomMode === "custom") return clamp(customScale, 0.1, 6);
    if (zoomMode === "fit-page") {
      return clamp(Math.min(availW / width, availH / height), 0.1, 6);
    }
    const basis = settings.viewMode === "continuous" ? fitBasisWidth : width;
    return clamp(availW / basis, 0.1, 6);
  }, [doc, currentPage, rotation, stageSize, zoomMode, customScale, settings.viewMode, fitBasisWidth]);

  const zoomPercent = Math.max(1, Math.round(effectiveScale * 100));

  const jumpToPage = useCallback(
    (page: number) => {
      const current = docRef.current;
      if (!current) return;
      const target = clamp(Math.round(page), 1, current.numPages);
      setCurrentPage(target);
      setSelection(null);
      setActiveAnnotation(null);
      if (settingsRef.current.viewMode === "continuous") {
        jumpNonceRef.current += 1;
        setScrollTarget({ page: target, nonce: jumpNonceRef.current });
      }
    },
    [],
  );

  const goPrev = useCallback(() => jumpToPage(pageRef.current - 1), [jumpToPage]);
  const goNext = useCallback(() => jumpToPage(pageRef.current + 1), [jumpToPage]);

  const handleOutlineJump = useCallback(
    (id: string, page: number) => {
      setActiveOutlineId(id);
      jumpToPage(page);
    },
    [jumpToPage],
  );

  const zoomBy = useCallback(
    (factor: number) => {
      setZoomMode("custom");
      setCustomScale(clamp(effectiveScale * factor, 0.15, 6));
    },
    [effectiveScale],
  );
  const fitWidth = useCallback(() => setZoomMode("fit-width"), []);
  const fitPage = useCallback(() => setZoomMode("fit-page"), []);
  const actualSize = useCallback(() => {
    setZoomMode("custom");
    setCustomScale(1);
  }, []);

  const rotatePage = useCallback(() => {
    setRotation((prev) => (prev + 90) % 360);
  }, []);

  const toggleViewMode = useCallback(() => {
    const next: ViewMode =
      settingsRef.current.viewMode === "continuous" ? "single" : "continuous";
    setSettings((prev) => ({ ...prev, viewMode: next }));
    if (next === "continuous") {
      jumpNonceRef.current += 1;
      setScrollTarget({ page: pageRef.current, nonce: jumpNonceRef.current });
    }
  }, []);

  const handlePageChange = useCallback((page: number) => {
    setCurrentPage(page);
  }, []);

  const handleViewportResize = useCallback((width: number, height: number) => {
    setStageSize((prev) =>
      prev.w === width && prev.h === height ? prev : { w: width, h: height },
    );
  }, []);

  /* ------------------------------------------------------------- outline */

  const outlineFlat = useMemo(
    () => flattenOutline(doc?.outline ?? []),
    [doc],
  );
  const expandOutlineIds = useMemo(
    () => outlinePathIds(outlineFlat, activeOutlineId),
    [outlineFlat, activeOutlineId],
  );

  // Keep exactly one outline entry highlighted, even when many entries point at
  // the same page (common in long financial reports).
  useEffect(() => {
    if (!doc) {
      setActiveOutlineId(null);
      return;
    }
    setActiveOutlineId((prev) => {
      const next = pickActiveOutline(outlineFlat, currentPage, prev);
      return next === prev ? prev : next;
    });
  }, [doc, outlineFlat, currentPage]);

  /* -------------------------------------------------------------- search */

  useEffect(() => {
    const query = searchQuery.trim();
    const current = docRef.current;
    if (!current || !query) {
      setSearchResults([]);
      setSearchActive(-1);
      setSearching(false);
      setActiveSearchPage(null);
      return;
    }
    const token = ++searchToken.current;
    setSearching(true);
    setSearchProgress(0);
    setSearchActive(-1);
    setSearchResults([]);
    const timer = window.setTimeout(async () => {
      try {
        const hits = await searchDocument(current.pdf, query, {
          onProgress: (page, total) => {
            if (token !== searchToken.current) return;
            setSearchProgress(total > 0 ? page / total : 0);
          },
          isCancelled: () => token !== searchToken.current,
        });
        if (token !== searchToken.current) return;
        setSearchResults(hits);
        setSearching(false);
        setSearchProgress(1);
        if (hits.length > 0) {
          setSearchActive(0);
          setActiveSearchPage(hits[0].page);
          jumpToPage(hits[0].page);
        } else {
          toast(`没有找到“${truncate(query, 24)}”`, "info");
        }
      } catch (error) {
        if (token !== searchToken.current) return;
        console.warn("search failed", error);
        setSearching(false);
      }
    }, 320);
    return () => {
      window.clearTimeout(timer);
      searchToken.current += 1;
    };
  }, [searchQuery, jumpToPage, toast]);

  const selectSearchHit = useCallback(
    (index: number) => {
      if (index < 0 || index >= searchResults.length) return;
      const hit = searchResults[index];
      setSearchActive(index);
      setActiveSearchPage(hit.page);
      jumpToPage(hit.page);
    },
    [searchResults, jumpToPage],
  );

  const nextSearchHit = useCallback(() => {
    if (!searchResults.length) return;
    const next = (searchActive + 1) % searchResults.length;
    selectSearchHit(next);
  }, [searchActive, searchResults.length, selectSearchHit]);

  const prevSearchHit = useCallback(() => {
    if (!searchResults.length) return;
    const prev =
      (searchActive - 1 + searchResults.length) % searchResults.length;
    selectSearchHit(prev);
  }, [searchActive, searchResults.length, selectSearchHit]);

  const clearSearch = useCallback(() => {
    setSearchQuery("");
    setSearchResults([]);
    setSearchActive(-1);
    setActiveSearchPage(null);
  }, []);

  const searchState: SearchState = {
    query: searchQuery,
    setQuery: setSearchQuery,
    results: searchResults,
    activeIndex: searchActive,
    searching,
    progress: searchProgress,
    onSelect: selectSearchHit,
    onNext: nextSearchHit,
    onPrev: prevSearchHit,
  };

  /* ---------------------------------------------------------- annotations */

  const addAnnotation = useCallback(
    (type: AnnotationType, color: AnnotationColor, info: SelectionInfo) => {
      const annotation: Annotation = {
        id: uid("ann"),
        page: info.page,
        type,
        color,
        rects: info.rects,
        text: info.text,
        note: "",
        createdAt: Date.now(),
      };
      commitAnnotations([...annotationsRef.current, annotation]);
      undoStack.current.push({ kind: "add", annotation });
      setSelection(null);
      window.getSelection()?.removeAllRanges();
      if (type === "note") {
        setActiveAnnotation({ annotation, anchor: info.anchor });
      } else {
        toast(
          type === "highlight"
            ? "已添加高亮"
            : type === "underline"
              ? "已添加下划线"
              : "已添加删除线",
          "success",
        );
      }
    },
    [commitAnnotations, toast],
  );

  const updateAnnotation = useCallback(
    (id: string, patch: Partial<Annotation>) => {
      const next = annotationsRef.current.map((annotation) =>
        annotation.id === id
          ? { ...annotation, ...patch, updatedAt: Date.now() }
          : annotation,
      );
      commitAnnotations(next);
      setActiveAnnotation((prev) =>
        prev && prev.annotation.id === id
          ? { ...prev, annotation: { ...prev.annotation, ...patch } }
          : prev,
      );
    },
    [commitAnnotations],
  );

  const deleteAnnotation = useCallback(
    (id: string) => {
      const removed = annotationsRef.current.find(
        (annotation) => annotation.id === id,
      );
      if (!removed) return;
      commitAnnotations(
        annotationsRef.current.filter((annotation) => annotation.id !== id),
      );
      undoStack.current.push({ kind: "delete", annotation: removed });
      setActiveAnnotation((prev) =>
        prev && prev.annotation.id === id ? null : prev,
      );
      toast("已删除标注");
    },
    [commitAnnotations, toast],
  );

  const undo = useCallback(() => {
    const op = undoStack.current.pop();
    if (!op) {
      toast("没有可撤销的标注操作");
      return;
    }
    if (op.kind === "add") {
      commitAnnotations(
        annotationsRef.current.filter(
          (annotation) => annotation.id !== op.annotation.id,
        ),
      );
      setActiveAnnotation(null);
      toast("已撤销标注");
    } else {
      commitAnnotations([...annotationsRef.current, op.annotation]);
      toast("已恢复标注");
    }
  }, [commitAnnotations, toast]);

  const handleSelection = useCallback((info: SelectionInfo | null) => {
    setSelection(info);
    if (info) setActiveAnnotation(null);
  }, []);

  const handleAnnotationClick = useCallback(
    (annotation: Annotation, anchor: DOMRect) => {
      setSelection(null);
      setActiveAnnotation({
        annotation,
        anchor: {
          x: anchor.left,
          y: anchor.top,
          width: anchor.width,
          height: anchor.height,
        },
      });
    },
    [],
  );

  const copySelection = useCallback(async () => {
    if (!selection?.text) return;
    const ok = await copyText(selection.text);
    toast(ok ? "已复制文字" : "复制失败", ok ? "success" : "error");
    setSelection(null);
    window.getSelection()?.removeAllRanges();
  }, [selection, toast]);

  /* ------------------------------------------------------------ bookmarks */

  const toggleBookmark = useCallback(async () => {
    const current = docRef.current;
    if (!current) return;
    const page = pageRef.current;
    const existing = bookmarksRef.current.find((item) => item.page === page);
    if (existing) {
      commitBookmarks(
        bookmarksRef.current.filter((item) => item.id !== existing.id),
      );
      toast("已移除书签");
      return;
    }
    let label = `第 ${page} 页`;
    try {
      const snippet = await getPageSnippet(current.pdf, page, 46);
      if (snippet) label = snippet;
    } catch {
      /* noop */
    }
    const bookmark: Bookmark = {
      id: uid("bm"),
      page,
      label,
      createdAt: Date.now(),
    };
    commitBookmarks([...bookmarksRef.current, bookmark]);
    toast("已添加书签", "success", "bookmarkFilled");
  }, [commitBookmarks, toast]);

  const removeBookmark = useCallback(
    (id: string) => {
      commitBookmarks(bookmarksRef.current.filter((item) => item.id !== id));
      toast("已移除书签");
    },
    [commitBookmarks, toast],
  );

  /* ------------------------------------------------------------- native menu */

  const menuHandlerRef = useRef<(id: string) => void>(() => {});

  useEffect(() => {
    menuHandlerRef.current = (id: string) => {
      switch (id) {
        case "open":
          void handleOpen();
          break;
        case "close_document":
          closeDocument();
          break;
        case "search":
          openSearch();
          break;
        case "sidebar":
          toggleSidebar();
          break;
        case "zoom_in":
          zoomBy(1.15);
          break;
        case "zoom_out":
          zoomBy(1 / 1.15);
          break;
        case "actual_size":
          actualSize();
          break;
        case "fit_width":
          fitWidth();
          break;
        case "fit_page":
          fitPage();
          break;
        case "rotate":
          rotatePage();
          break;
        case "cycle_theme":
          cycleTheme();
          break;
        case "cycle_page_theme":
          cyclePageTheme();
          break;
        case "toggle_view":
          toggleViewMode();
          break;
        case "undo": {
          const active = document.activeElement as HTMLElement | null;
          const typing =
            active &&
            (active.tagName === "INPUT" ||
              active.tagName === "TEXTAREA" ||
              active.isContentEditable);
          if (typing) document.execCommand("undo");
          else undo();
          break;
        }
        case "shortcuts":
          setSettingsOpen(true);
          break;
        case "fullscreen":
          void toggleFullscreen();
          break;
        default:
          break;
      }
    };
  }, [
    actualSize,
    closeDocument,
    cyclePageTheme,
    cycleTheme,
    fitPage,
    fitWidth,
    handleOpen,
    openSearch,
    rotatePage,
    toggleSidebar,
    toggleViewMode,
    undo,
    zoomBy,
  ]);

  useEffect(() => {
    let unlisten: (() => void) | null = null;
    void onMenuAction((id) => menuHandlerRef.current(id)).then((un) => {
      unlisten = un;
    });
    return () => {
      unlisten?.();
    };
  }, []);

  /* ------------------------------------------------------------ persistence */

  useEffect(() => {
    if (!doc) return;
    const timer = window.setTimeout(() => {
      saveProgress(doc.fingerprint, currentPage);
      updateRecent(doc.path, { page: currentPage });
    }, 500);
    return () => window.clearTimeout(timer);
  }, [doc, currentPage]);

  /* --------------------------------------------------------------- effects */

  useEffect(() => {
    let disposed = false;
    const unlisteners: Array<() => void> = [];
    const boot = async () => {
      diag(`boot tauri=${isTauri()} storage=${storageAvailable()}`);
      setVersion(await appVersion());
      unlisteners.push(
        await onOpenFile((paths) => {
          if (paths[0]) void openRef.current(paths[0]);
        }),
      );
      unlisteners.push(
        await onDropFiles({
          onHover: (active) => {
            if (!disposed) setDropActive(active);
          },
          onDrop: (paths) => {
            if (paths[0]) void openRef.current(paths[0]);
          },
        }),
      );
      const pending = await takePendingFiles();
      diag(`boot pending=${JSON.stringify(pending)}`);
      if (disposed) return;
      if (pending[0]) {
        void openRef.current(pending[0]);
        return;
      }
      const last = loadLastSession()?.path;
      if (last && settingsRef.current.rememberLastDocument) {
        void openRef.current(last, { quiet: true });
      }
    };
    void boot();
    return () => {
      disposed = true;
      for (const unlisten of unlisteners) unlisten();
    };
  }, []);

  // Dismiss floating UI when clicking elsewhere.
  useEffect(() => {
    const onMouseDown = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null;
      if (!target) return;
      if (target.closest(".settings-popover")) return;
      if (target.closest("[data-settings-trigger]")) return;
      setSettingsOpen(false);
      if (target.closest(".annotation-popover")) return;
      setActiveAnnotation(null);
      if (
        !target.closest(".textLayer") &&
        !target.closest(".annotation") &&
        !target.closest(".annotation-note") &&
        !target.closest(".selection-menu")
      ) {
        setSelection(null);
      }
    };
    document.addEventListener("mousedown", onMouseDown);
    return () => document.removeEventListener("mousedown", onMouseDown);
  }, []);

  // Keyboard shortcuts.
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const mod = event.metaKey || event.ctrlKey;
      const key = event.key.toLowerCase();
      const editable = isEditableTarget(event.target);

      if (event.key === "Escape") {
        setSettingsOpen(false);
        if (activeAnnotation) setActiveAnnotation(null);
        if (selection) {
          setSelection(null);
          window.getSelection()?.removeAllRanges();
        }
        return;
      }
      if (event.metaKey && event.ctrlKey && key === "f") {
        event.preventDefault();
        void toggleFullscreen();
        return;
      }
      if (mod && key === "o") {
        event.preventDefault();
        void handleOpen();
        return;
      }
      if (mod && key === "f") {
        event.preventDefault();
        openSearch();
        return;
      }
      if (mod && key === "d" && !event.shiftKey) {
        event.preventDefault();
        void toggleBookmark();
        return;
      }
      if (mod && event.shiftKey && key === "w") {
        event.preventDefault();
        closeDocument();
        return;
      }
      if (mod && event.altKey && key === "s") {
        event.preventDefault();
        toggleSidebar();
        return;
      }
      if (mod && (event.key === "=" || event.key === "+")) {
        event.preventDefault();
        zoomBy(1.15);
        return;
      }
      if (mod && event.key === "-") {
        event.preventDefault();
        zoomBy(1 / 1.15);
        return;
      }
      if (mod && event.key === "0") {
        event.preventDefault();
        actualSize();
        return;
      }
      if (mod && event.key === "9") {
        event.preventDefault();
        fitWidth();
        return;
      }
      if (mod && event.key === "8") {
        event.preventDefault();
        fitPage();
        return;
      }
      if (mod && key === "z" && !editable) {
        event.preventDefault();
        undo();
        return;
      }
      if (editable || !docRef.current) return;

      const single = settingsRef.current.viewMode === "single";
      switch (event.key) {
        case "ArrowLeft":
          event.preventDefault();
          goPrev();
          break;
        case "ArrowRight":
          event.preventDefault();
          goNext();
          break;
        case "ArrowUp":
          event.preventDefault();
          if (single) goPrev();
          else viewerApi.current?.scrollBy(-140);
          break;
        case "ArrowDown":
          event.preventDefault();
          if (single) goNext();
          else viewerApi.current?.scrollBy(140);
          break;
        case "PageUp":
          event.preventDefault();
          if (single) goPrev();
          else viewerApi.current?.scrollPages(-1);
          break;
        case "PageDown":
          event.preventDefault();
          if (single) goNext();
          else viewerApi.current?.scrollPages(1);
          break;
        case " ":
          if (editable) return;
          event.preventDefault();
          if (single) {
            if (event.shiftKey) goPrev();
            else goNext();
          } else {
            viewerApi.current?.scrollPages(event.shiftKey ? -1 : 1);
          }
          break;
        case "Home":
          event.preventDefault();
          jumpToPage(1);
          break;
        case "End":
          event.preventDefault();
          jumpToPage(docRef.current.numPages);
          break;
        default:
          break;
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [
    activeAnnotation,
    actualSize,
    closeDocument,
    fitPage,
    fitWidth,
    goNext,
    goPrev,
    handleOpen,
    jumpToPage,
    openSearch,
    selection,
    toggleBookmark,
    toggleSidebar,
    undo,
    zoomBy,
  ]);

  /* ------------------------------------------------------------------ misc */

  const submitPassword = useCallback((password: string) => {
    const resolver = passwordResolver.current;
    passwordResolver.current = null;
    resolver?.(password);
  }, []);

  const cancelPassword = useCallback(() => {
    const resolver = passwordResolver.current;
    passwordResolver.current = null;
    resolver?.(null);
  }, []);

  const openRecent = useCallback(
    async (path: string) => {
      await openDocument(path);
    },
    [openDocument],
  );

  const removeRecentFile = useCallback((path: string) => {
    removeRecent(path);
    setRecents(loadRecents());
  }, []);

  const revealRecentFile = useCallback(
    async (path: string) => {
      await revealInFinder(path);
    },
    [],
  );

  const pageLabel = doc
    ? (doc.labels[currentPage - 1] ?? String(currentPage))
    : String(currentPage);
  const title = doc
    ? doc.info.title?.trim() || stripExtension(doc.name)
    : "Paper";
  const subtitle = doc ? `${doc.name} · 第 ${pageLabel} / ${doc.numPages} 页` : undefined;

  return (
    <div className={`app ${doc ? "has-doc" : "is-home"}`}>
      <TitleBar
        title={title}
        subtitle={subtitle}
        hasDoc={Boolean(doc)}
        sidebarOpen={settings.sidebarOpen}
        onToggleSidebar={toggleSidebar}
        onOpenFile={() => void handleOpen()}
        onSearch={openSearch}
        onHome={closeDocument}
        theme={settings.theme}
        onCycleTheme={cycleTheme}
        settingsOpen={settingsOpen}
        onToggleSettings={() => setSettingsOpen((prev) => !prev)}
        isTauri={isTauri()}
      />

      <div className="app-body">
        {doc && settings.sidebarOpen && (
          <Sidebar
            doc={doc}
            tab={sidebarTab}
            onTab={setSidebarTab}
            currentPage={currentPage}
            onJump={jumpToPage}
            outline={doc.outline}
            activeOutlineId={activeOutlineId}
            expandOutlineIds={expandOutlineIds}
            onOutlineJump={handleOutlineJump}
            bookmarks={bookmarks}
            onAddBookmark={() => void toggleBookmark()}
            onRemoveBookmark={removeBookmark}
            annotations={annotations}
            onRemoveAnnotation={deleteAnnotation}
            onAnnotationSelect={handleAnnotationClick}
            search={searchState}
            focusNonce={focusNonce}
            onClose={toggleSidebar}
          />
        )}

        <main className="stage">
          {doc ? (
            <Viewer
              ref={viewerApi}
              doc={doc}
              scale={effectiveScale}
              rotation={rotation}
              viewMode={settings.viewMode}
              fitWidth={zoomMode === "fit-width"}
              pageTheme={settings.pageTheme}
              currentPage={currentPage}
              scrollTarget={scrollTarget}
              annotations={annotations}
              searchQuery={searchQuery}
              activeSearchPage={activeSearchPage}
              onPageChange={handlePageChange}
              onSelection={handleSelection}
              onAnnotationClick={handleAnnotationClick}
              onViewportResize={handleViewportResize}
              onZoomGesture={(direction) => zoomBy(direction > 0 ? 1.12 : 1 / 1.12)}
            />
          ) : (
            <EmptyState
              recents={recents}
              onOpen={() => void handleOpen()}
              onOpenRecent={(path) => void openRecent(path)}
              onRemoveRecent={removeRecentFile}
              onRevealRecent={(path) => void revealRecentFile(path)}
            />
          )}

          {doc && (
            <Toolbar
              page={currentPage}
              total={doc.numPages}
              label={pageLabel}
              zoomMode={zoomMode}
              zoomPercent={zoomPercent}
              rotation={rotation}
              viewMode={settings.viewMode}
              pageTheme={settings.pageTheme}
              onGoto={jumpToPage}
              onPrev={goPrev}
              onNext={goNext}
              onZoomIn={() => zoomBy(1.15)}
              onZoomOut={() => zoomBy(1 / 1.15)}
              onFitWidth={fitWidth}
              onFitPage={fitPage}
              onActualSize={actualSize}
              onRotate={rotatePage}
              onToggleViewMode={toggleViewMode}
              onCyclePageTheme={cyclePageTheme}
            />
          )}
        </main>
      </div>

      {settingsOpen && (
        <SettingsPopover
          settings={settings}
          version={version}
          onChange={updateSetting}
          onClose={() => setSettingsOpen(false)}
        />
      )}

      {selection && doc && (
        <SelectionMenu
          selection={selection}
          onHighlight={(color) => addAnnotation("highlight", color, selection)}
          onUnderline={(color) => addAnnotation("underline", color, selection)}
          onStrikeout={(color) => addAnnotation("strikeout", color, selection)}
          onNote={(color) => addAnnotation("note", color, selection)}
          onCopy={() => void copySelection()}
          onClose={() => setSelection(null)}
        />
      )}

      {activeAnnotation && doc && (
        <AnnotationPopover
          annotation={activeAnnotation.annotation}
          anchor={activeAnnotation.anchor}
          onChangeColor={(color) =>
            updateAnnotation(activeAnnotation.annotation.id, { color })
          }
          onSaveNote={(note) =>
            updateAnnotation(activeAnnotation.annotation.id, { note })
          }
          onDelete={() => deleteAnnotation(activeAnnotation.annotation.id)}
          onCopy={() =>
            void copyText(
              activeAnnotation.annotation.text ||
                activeAnnotation.annotation.note ||
                "",
            ).then((ok) =>
              toast(ok ? "已复制文字" : "复制失败", ok ? "success" : "error"),
            )
          }
          onClose={() => setActiveAnnotation(null)}
        />
      )}

      <DropOverlay active={dropActive} />
      {loadingState.active && (
        <LoadingOverlay
          progress={loadingState.progress}
          title={loadingState.title}
          subtitle={loadingState.subtitle}
        />
      )}
      <PasswordPrompt
        open={passwordPrompt.open}
        incorrect={passwordPrompt.incorrect}
        onSubmit={submitPassword}
        onCancel={cancelPassword}
      />
      <Toasts
        toasts={toasts}
        onDismiss={(id) =>
          setToasts((prev) => prev.filter((item) => item.id !== id))
        }
      />

      {doc && settings.viewMode === "single" && (
        <div className="single-hint">
          <Icon name="chevronLeft" size={12} />
          <span>
            {currentPage} / {doc.numPages}
          </span>
          <Icon name="chevronRight" size={12} />
        </div>
      )}

      {!doc && <div className="home-glow" aria-hidden="true" />}
    </div>
  );
}

