import { useEffect, useMemo, useRef, useState } from "react";
import { t } from "../lib/i18n";
import { Icon } from "../lib/icons";
import type { IconName } from "../lib/icons";
import { renderPageThumb } from "../lib/pdf";
import { ANNOTATION_COLORS } from "../lib/types";
import type {
  Annotation,
  Bookmark,
  LoadedDoc,
  OutlineItem,
  SearchHit,
  SelectionInfo,
  SidebarTab,
} from "../lib/types";
import { formatRelativeTime, truncate } from "../lib/utils";

const thumbCache = new Map<string, string>();
const thumbOrder: string[] = [];

function cacheThumb(key: string, url: string) {
  thumbCache.set(key, url);
  thumbOrder.push(key);
  while (thumbOrder.length > 120) {
    const oldest = thumbOrder.shift();
    if (oldest) thumbCache.delete(oldest);
  }
}

const TABS: Array<{ id: SidebarTab; icon: IconName; label: string }> = [
  { id: "outline", icon: "list", label: "目录" },
  { id: "thumbnails", icon: "grid", label: "缩略图" },
  { id: "search", icon: "search", label: "搜索" },
  { id: "bookmarks", icon: "bookmark", label: "书签" },
  { id: "annotations", icon: "notes", label: "标注" },
];

type SearchState = {
  query: string;
  setQuery: (query: string) => void;
  results: SearchHit[];
  activeIndex: number;
  searching: boolean;
  progress: number;
  onSelect: (index: number) => void;
  onNext: () => void;
  onPrev: () => void;
};

type Props = {
  doc: LoadedDoc | null;
  tab: SidebarTab;
  onTab: (tab: SidebarTab) => void;
  currentPage: number;
  onJump: (page: number) => void;
  outline: OutlineItem[];
  activeOutlineId: string | null;
  expandOutlineIds: Set<string>;
  onOutlineJump: (id: string, page: number) => void;
  bookmarks: Bookmark[];
  onAddBookmark: () => void;
  onRemoveBookmark: (id: string) => void;
  annotations: Annotation[];
  onRemoveAnnotation: (id: string) => void;
  onAnnotationSelect: (annotation: Annotation, anchor: DOMRect) => void;
  search: SearchState;
  focusNonce: number;
  onClose: () => void;
};

export function Sidebar({
  doc,
  tab,
  onTab,
  currentPage,
  onJump,
  outline,
  activeOutlineId,
  expandOutlineIds,
  onOutlineJump,
  bookmarks,
  onAddBookmark,
  onRemoveBookmark,
  annotations,
  onRemoveAnnotation,
  onAnnotationSelect,
  search,
  focusNonce,
  onClose,
}: Props) {
  return (
    <aside className="sidebar">
      <div className="sidebar-top">
        <div className="sidebar-tabs" role="tablist">
          {TABS.map((item) => (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={tab === item.id}
              className={`sidebar-tab ${tab === item.id ? "is-active" : ""}`}
              onClick={() => onTab(item.id)}
              title={t(item.label)}
            >
              <Icon name={item.icon} size={16} />
            </button>
          ))}
        </div>
        <button
          type="button"
          className="icon-button subtle"
          onClick={onClose}
          title={t("收起侧边栏")}
          aria-label={t("收起侧边栏")}
        >
          <Icon name="chevronLeft" size={15} />
        </button>
      </div>

      <div className="sidebar-panel">
        {!doc ? (
          <div className="panel-empty">
            <Icon name="file" size={26} />
            <p>{t("打开一个 PDF 开始阅读")}</p>
          </div>
        ) : (
          <>
            {tab === "outline" && (
              <OutlinePanel
                outline={outline}
                activeId={activeOutlineId}
                expandIds={expandOutlineIds}
                onJump={onOutlineJump}
              />
            )}
            {tab === "thumbnails" && (
              <ThumbnailsPanel doc={doc} currentPage={currentPage} onJump={onJump} />
            )}
            {tab === "search" && (
              <SearchPanel {...search} focusNonce={focusNonce} />
            )}
            {tab === "bookmarks" && (
              <BookmarksPanel
                bookmarks={bookmarks}
                currentPage={currentPage}
                onJump={onJump}
                onAdd={onAddBookmark}
                onRemove={onRemoveBookmark}
              />
            )}
            {tab === "annotations" && (
              <AnnotationsPanel
                annotations={annotations}
                onJump={onJump}
                onRemove={onRemoveAnnotation}
                onSelect={onAnnotationSelect}
              />
            )}
          </>
        )}
      </div>
    </aside>
  );
}

function PanelEmpty({
  icon,
  title,
  description,
  action,
}: {
  icon: IconName;
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="panel-empty">
      <Icon name={icon} size={26} strokeWidth={1.4} />
      <p>{title}</p>
      {description && <span>{description}</span>}
      {action}
    </div>
  );
}

function OutlinePanel({
  outline,
  activeId,
  expandIds,
  onJump,
}: {
  outline: OutlineItem[];
  activeId: string | null;
  expandIds: Set<string>;
  onJump: (id: string, page: number) => void;
}) {
  const [expanded, setExpanded] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    for (const item of outline) initial[item.id] = true;
    return initial;
  });

  // Reveal the active entry (and its ancestors) when navigation changes it.
  useEffect(() => {
    if (expandIds.size === 0) return;
    setExpanded((prev) => {
      let changed = false;
      const next = { ...prev };
      for (const id of expandIds) {
        if (!next[id]) {
          next[id] = true;
          changed = true;
        }
      }
      return changed ? next : prev;
    });
  }, [expandIds]);

  if (!outline.length) {
    return (
      <PanelEmpty
        icon="list"
        title={t("此文档没有目录")}
        description={t("可以使用缩略图或搜索来导航")}
      />
    );
  }

  const rows: React.ReactNode[] = [];
  const walk = (items: OutlineItem[], depth: number) => {
    for (const item of items) {
      const hasChildren = item.children.length > 0;
      const isOpen = expanded[item.id] ?? false;
      const isActive = activeId === item.id;
      rows.push(
        <div key={item.id} className="outline-node">
          <div
            className={`outline-row ${isActive ? "is-active" : ""}`}
            style={{ paddingLeft: 8 + depth * 13 }}
          >
            {hasChildren ? (
              <button
                type="button"
                className="tree-toggle"
                onClick={() =>
                  setExpanded((prev) => ({ ...prev, [item.id]: !isOpen }))
                }
                aria-label={isOpen ? t("收起") : t("展开")}
              >
                <Icon
                  name={isOpen ? "chevronDownSmall" : "chevronRight"}
                  size={12}
                />
              </button>
            ) : (
              <span className="tree-spacer" />
            )}
            <button
              type="button"
              className="outline-link"
              onClick={() => item.page && onJump(item.id, item.page)}
              title={item.title}
              aria-current={isActive ? "page" : undefined}
              disabled={!item.page}
            >
              <span className="outline-title">{item.title}</span>
              {item.page != null && (
                <span className="outline-page">{item.page}</span>
              )}
            </button>
          </div>
        </div>,
      );
      if (hasChildren && isOpen) {
        walk(item.children, depth + 1);
      }
    }
  };
  walk(outline, 0);

  return <div className="outline-tree">{rows}</div>;
}

function ThumbnailsPanel({
  doc,
  currentPage,
  onJump,
}: {
  doc: LoadedDoc;
  currentPage: number;
  onJump: (page: number) => void;
}) {
  return (
    <div className="thumbnails">
      {Array.from({ length: doc.numPages }, (_, index) => {
        const page = index + 1;
        return (
          <Thumbnail
            key={page}
            doc={doc}
            page={page}
            active={page === currentPage}
            onClick={() => onJump(page)}
          />
        );
      })}
    </div>
  );
}

function Thumbnail({
  doc,
  page,
  active,
  onClick,
}: {
  doc: LoadedDoc;
  page: number;
  active: boolean;
  onClick: () => void;
}) {
  const wrapRef = useRef<HTMLButtonElement | null>(null);
  const key = `${doc.fingerprint}:${page}:168`;
  const [url, setUrl] = useState<string | null>(() => thumbCache.get(key) ?? null);
  const [visible, setVisible] = useState(false);
  const dim = doc.dims[page - 1] ?? { w: 612, h: 792 };

  useEffect(() => {
    const node = wrapRef.current;
    if (!node) return;
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setVisible(true);
            observer.disconnect();
          }
        }
      },
      { rootMargin: "400px 0px" },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!visible || url) return;
    let cancelled = false;
    renderPageThumb(doc.pdf, page, 168).then((data) => {
      if (cancelled || !data) return;
      cacheThumb(key, data);
      setUrl(data);
    });
    return () => {
      cancelled = true;
    };
  }, [visible, url, doc.pdf, page, key]);

  return (
    <button
      ref={wrapRef}
      type="button"
      className={`thumbnail ${active ? "is-active" : ""}`}
      onClick={onClick}
      aria-label={t("第 {page} 页", { page })}
    >
      <div
        className="thumbnail-frame"
        style={{ aspectRatio: `${dim.w} / ${dim.h}` }}
      >
        {url ? (
          <img src={url} alt="" draggable={false} />
        ) : (
          <div className="thumbnail-placeholder">
            <span>{page}</span>
          </div>
        )}
      </div>
      <span className="thumbnail-label">{doc.labels[page - 1] ?? page}</span>
    </button>
  );
}

function SearchPanel({
  query,
  setQuery,
  results,
  activeIndex,
  searching,
  progress,
  onSelect,
  onNext,
  onPrev,
  focusNonce,
}: SearchState & { focusNonce: number }) {
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    inputRef.current?.focus();
    inputRef.current?.select();
  }, [focusNonce]);

  return (
    <div className="search-panel">
      <div className="search-box">
        <Icon name="search" size={14} />
        <input
          ref={inputRef}
          className="search-input"
          value={query}
          placeholder={t("在文档中搜索…")}
          onChange={(event) => setQuery(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              if (event.shiftKey) onPrev();
              else onNext();
            }
            if (event.key === "Escape") setQuery("");
          }}
        />
        {query && (
          <button
            type="button"
            className="mini-icon-button"
            onClick={() => setQuery("")}
            aria-label={t("清空搜索")}
          >
            <Icon name="close" size={12} />
          </button>
        )}
      </div>

      {searching && (
        <div className="search-status">
          {t("正在搜索… {percent}%", { percent: Math.round(progress * 100) })}
        </div>
      )}

      {!searching && query && (
        <div className="search-summary">
          <span>
            {results.length > 0
              ? t("{count} 个结果", { count: results.length })
              : t("没有找到匹配内容")}
          </span>
          {results.length > 0 && (
            <div className="search-nav">
              <button
                type="button"
                className="mini-icon-button"
                onClick={onPrev}
                aria-label={t("上一个结果")}
              >
                <Icon name="chevronUp" size={13} />
              </button>
              <span className="search-count">
                {activeIndex >= 0 ? activeIndex + 1 : 0}/{results.length}
              </span>
              <button
                type="button"
                className="mini-icon-button"
                onClick={onNext}
                aria-label={t("下一个结果")}
              >
                <Icon name="chevronDown" size={13} />
              </button>
            </div>
          )}
        </div>
      )}

      <div className="search-results">
        {results.map((hit, index) => (
          <button
            key={`${hit.page}-${hit.start}-${index}`}
            type="button"
            className={`search-result ${index === activeIndex ? "is-active" : ""}`}
            onClick={() => onSelect(index)}
          >
            <span className="search-result-page">{t("第 {page} 页", { page: hit.page })}</span>
            <span className="search-result-snippet">
              {highlight(hit.snippet, query)}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

function highlight(text: string, query: string) {
  const needle = query.trim();
  if (!needle) return text;
  const lower = text.toLowerCase();
  const q = needle.toLowerCase();
  const parts: React.ReactNode[] = [];
  let cursor = 0;
  let found = lower.indexOf(q, cursor);
  while (found !== -1) {
    if (found > cursor) parts.push(text.slice(cursor, found));
    parts.push(<mark key={`${found}-${parts.length}`}>{text.slice(found, found + q.length)}</mark>);
    cursor = found + q.length;
    found = lower.indexOf(q, cursor);
  }
  if (cursor < text.length) parts.push(text.slice(cursor));
  return parts;
}

function BookmarksPanel({
  bookmarks,
  currentPage,
  onJump,
  onAdd,
  onRemove,
}: {
  bookmarks: Bookmark[];
  currentPage: number;
  onJump: (page: number) => void;
  onAdd: () => void;
  onRemove: (id: string) => void;
}) {
  const hasCurrent = bookmarks.some((bookmark) => bookmark.page === currentPage);
  return (
    <div className="bookmarks-panel">
      <button
        type="button"
        className={`bookmark-add ${hasCurrent ? "is-saved" : ""}`}
        onClick={onAdd}
      >
        <Icon name={hasCurrent ? "bookmarkFilled" : "bookmark"} size={14} />
        {hasCurrent ? t("移除当前页书签") : t("为当前页添加书签")}
      </button>
      {bookmarks.length === 0 ? (
        <PanelEmpty
          icon="bookmark"
          title={t("还没有书签")}
          description={t("按 {shortcut} 或点击上方按钮添加", { shortcut: "⌘D" })}
        />
      ) : (
        <div className="bookmark-list">
          {bookmarks.map((bookmark) => (
            <div key={bookmark.id} className="bookmark-row">
              <button
                type="button"
                className="bookmark-link"
                onClick={() => onJump(bookmark.page)}
                title={bookmark.label}
              >
                <span className="bookmark-page">{t("第 {page} 页", { page: bookmark.page })}</span>
                <span className="bookmark-label">
                  {truncate(bookmark.label, 60)}
                </span>
                <span className="bookmark-time">
                  {formatRelativeTime(bookmark.createdAt)}
                </span>
              </button>
              <button
                type="button"
                className="mini-icon-button bookmark-remove"
                onClick={() => onRemove(bookmark.id)}
                aria-label={t("删除书签")}
                title={t("删除书签")}
              >
                <Icon name="close" size={12} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const ANNOTATION_ICON: Record<Annotation["type"], IconName> = {
  highlight: "highlight",
  underline: "underline",
  strikeout: "strikeout",
  note: "note",
};

function AnnotationsPanel({
  annotations,
  onJump,
  onRemove,
  onSelect,
}: {
  annotations: Annotation[];
  onJump: (page: number) => void;
  onRemove: (id: string) => void;
  onSelect: (annotation: Annotation, anchor: DOMRect) => void;
}) {
  const sorted = useMemo(
    () => [...annotations].sort((a, b) => a.page - b.page || a.createdAt - b.createdAt),
    [annotations],
  );

  if (!sorted.length) {
    return (
      <PanelEmpty
        icon="notes"
        title={t("还没有标注")}
        description={t("选中文字后即可高亮、划线或添加便签")}
      />
    );
  }

  return (
    <div className="annotations-panel">
      <div className="annotation-count">
        {t("共 {count} 条标注 · {pages} 页", {
          count: sorted.length,
          pages: new Set(sorted.map((a) => a.page)).size,
        })}
      </div>
      {sorted.map((annotation) => (
        <div key={annotation.id} className="annotation-row">
          <button
            type="button"
            className="annotation-link"
            onClick={(event) => {
              onJump(annotation.page);
              onSelect(annotation, event.currentTarget.getBoundingClientRect());
            }}
          >
            <span
              className="annotation-swatch"
              style={{ background: ANNOTATION_COLORS[annotation.color]?.value }}
            >
              <Icon name={ANNOTATION_ICON[annotation.type]} size={11} />
            </span>
            <span className="annotation-body">
              <span className="annotation-excerpt">
                {annotation.note?.trim()
                  ? truncate(annotation.note, 90)
                  : truncate(annotation.text || t("（无文字）"), 90)}
              </span>
              <span className="annotation-meta">
                {t("第 {page} 页 · {type}", {
                  page: annotation.page,
                  type: t(annotation.type === "note" ? "便签" : "标注"),
                })}
              </span>
            </span>
          </button>
          <button
            type="button"
            className="mini-icon-button annotation-remove"
            onClick={() => onRemove(annotation.id)}
            aria-label={t("删除标注")}
            title={t("删除标注")}
          >
            <Icon name="trash" size={12} />
          </button>
        </div>
      ))}
    </div>
  );
}

export type { SearchState };
