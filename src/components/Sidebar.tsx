import { useEffect, useMemo, useRef, useState } from "react";
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
              title={item.label}
            >
              <Icon name={item.icon} size={16} />
            </button>
          ))}
        </div>
        <button
          type="button"
          className="icon-button subtle"
          onClick={onClose}
          title="收起侧边栏"
          aria-label="收起侧边栏"
        >
          <Icon name="chevronLeft" size={15} />
        </button>
      </div>

      <div className="sidebar-panel">
        {!doc ? (
          <div className="panel-empty">
            <Icon name="file" size={26} />
            <p>打开一个 PDF 开始阅读</p>
          </div>
        ) : (
          <>
            {tab === "outline" && (
              <OutlinePanel
                outline={outline}
                currentPage={currentPage}
                onJump={onJump}
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
  currentPage,
  onJump,
}: {
  outline: OutlineItem[];
  currentPage: number;
  onJump: (page: number) => void;
}) {
  if (!outline.length) {
    return (
      <PanelEmpty
        icon="list"
        title="此文档没有目录"
        description="可以使用缩略图或搜索来导航"
      />
    );
  }
  return (
    <div className="outline-tree">
      <OutlineLevel
        items={outline}
        depth={0}
        currentPage={currentPage}
        onJump={onJump}
      />
    </div>
  );
}

function OutlineLevel({
  items,
  depth,
  currentPage,
  onJump,
}: {
  items: OutlineItem[];
  depth: number;
  currentPage: number;
  onJump: (page: number) => void;
}) {
  const [expanded, setExpanded] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    for (const item of items) initial[item.id] = depth < 1;
    return initial;
  });

  return (
    <div className={depth > 0 ? "outline-children" : undefined}>
      {items.map((item) => {
        const hasChildren = item.children.length > 0;
        const isOpen = expanded[item.id] ?? false;
        const isActive = currentPage === item.page;
        return (
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
                  aria-label={isOpen ? "收起" : "展开"}
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
                onClick={() => item.page && onJump(item.page)}
                title={item.title}
                disabled={!item.page}
              >
                <span className="outline-title">{item.title}</span>
                {item.page != null && (
                  <span className="outline-page">{item.page}</span>
                )}
              </button>
            </div>
            {hasChildren && isOpen && (
              <OutlineLevel
                items={item.children}
                depth={depth + 1}
                currentPage={currentPage}
                onJump={onJump}
              />
            )}
          </div>
        );
      })}
    </div>
  );
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
      aria-label={`第 ${page} 页`}
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
          placeholder="在文档中搜索…"
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
            aria-label="清空搜索"
          >
            <Icon name="close" size={12} />
          </button>
        )}
      </div>

      {searching && (
        <div className="search-status">
          正在搜索… {Math.round(progress * 100)}%
        </div>
      )}

      {!searching && query && (
        <div className="search-summary">
          <span>
            {results.length > 0
              ? `${results.length} 个结果`
              : "没有找到匹配内容"}
          </span>
          {results.length > 0 && (
            <div className="search-nav">
              <button
                type="button"
                className="mini-icon-button"
                onClick={onPrev}
                aria-label="上一个结果"
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
                aria-label="下一个结果"
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
            <span className="search-result-page">第 {hit.page} 页</span>
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
        {hasCurrent ? "移除当前页书签" : "为当前页添加书签"}
      </button>
      {bookmarks.length === 0 ? (
        <PanelEmpty
          icon="bookmark"
          title="还没有书签"
          description="按 ⌘D 或点击上方按钮添加"
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
                <span className="bookmark-page">第 {bookmark.page} 页</span>
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
                aria-label="删除书签"
                title="删除书签"
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
        title="还没有标注"
        description="选中文字后即可高亮、划线或添加便签"
      />
    );
  }

  return (
    <div className="annotations-panel">
      <div className="annotation-count">
        共 {sorted.length} 条标注 · {new Set(sorted.map((a) => a.page)).size} 页
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
                  : truncate(annotation.text || "（无文字）", 90)}
              </span>
              <span className="annotation-meta">
                第 {annotation.page} 页 · {annotation.type === "note" ? "便签" : "标注"}
              </span>
            </span>
          </button>
          <button
            type="button"
            className="mini-icon-button annotation-remove"
            onClick={() => onRemove(annotation.id)}
            aria-label="删除标注"
            title="删除标注"
          >
            <Icon name="trash" size={12} />
          </button>
        </div>
      ))}
    </div>
  );
}

export type { SearchState };
