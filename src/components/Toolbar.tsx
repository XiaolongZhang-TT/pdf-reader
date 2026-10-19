import { useEffect, useState } from "react";
import { t } from "../lib/i18n";
import { Icon } from "../lib/icons";
import type { PageTheme, ViewMode, ZoomMode } from "../lib/types";

type Props = {
  page: number;
  total: number;
  label: string;
  zoomMode: ZoomMode;
  zoomPercent: number;
  rotation: number;
  viewMode: ViewMode;
  pageTheme: PageTheme;
  onGoto: (page: number) => void;
  onPrev: () => void;
  onNext: () => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onFitWidth: () => void;
  onFitPage: () => void;
  onActualSize: () => void;
  onRotate: () => void;
  onToggleViewMode: () => void;
  onCyclePageTheme: () => void;
};

const pageThemeIcon = (theme: PageTheme) =>
  theme === "night" ? "moon" : theme === "sepia" ? "sun" : "file";
const pageThemeLabel = (theme: PageTheme) =>
  theme === "night"
    ? t("夜间页面")
    : theme === "sepia"
      ? t("护眼纸张")
      : t("原始页面");

export function Toolbar({
  page,
  total,
  label,
  zoomMode,
  zoomPercent,
  rotation,
  viewMode,
  pageTheme,
  onGoto,
  onPrev,
  onNext,
  onZoomIn,
  onZoomOut,
  onFitWidth,
  onFitPage,
  onActualSize,
  onRotate,
  onToggleViewMode,
  onCyclePageTheme,
}: Props) {
  const [draft, setDraft] = useState(String(label));

  useEffect(() => {
    setDraft(String(label));
  }, [label]);

  const commit = () => {
    const parsed = Number.parseInt(draft.replace(/[^\d]/g, ""), 10);
    if (Number.isFinite(parsed) && parsed >= 1 && parsed <= total) {
      onGoto(parsed);
    } else {
      setDraft(String(label));
    }
  };

  return (
    <div className="toolbar" role="toolbar" aria-label={t("阅读工具栏")}>
      <div className="toolbar-group">
        <button
          type="button"
          className="toolbar-button"
          onClick={onPrev}
          disabled={page <= 1}
          title={t("上一页 ←")}
          aria-label={t("上一页")}
        >
          <Icon name="chevronLeft" size={16} />
        </button>
        <input
          className="page-input"
          value={draft}
          inputMode="numeric"
          onChange={(event) => setDraft(event.target.value)}
          onFocus={(event) => event.currentTarget.select()}
          onBlur={commit}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              commit();
              event.currentTarget.blur();
            }
            if (event.key === "Escape") {
              setDraft(String(label));
              event.currentTarget.blur();
            }
          }}
          aria-label={t("页码")}
        />
        <span className="toolbar-total">/ {total}</span>
        <button
          type="button"
          className="toolbar-button"
          onClick={onNext}
          disabled={page >= total}
          title={t("下一页 →")}
          aria-label={t("下一页")}
        >
          <Icon name="chevronRight" size={16} />
        </button>
      </div>

      <div className="toolbar-separator" />

      <div className="toolbar-group">
        <button
          type="button"
          className="toolbar-button"
          onClick={onZoomOut}
          title={t("缩小 ⌘-")}
          aria-label={t("缩小")}
        >
          <Icon name="minus" size={15} />
        </button>
        <button
          type="button"
          className="zoom-value"
          onClick={onActualSize}
          title={t("实际大小 ⌘0")}
        >
          {zoomPercent}%
        </button>
        <button
          type="button"
          className="toolbar-button"
          onClick={onZoomIn}
          title={t("放大 ⌘+")}
          aria-label={t("放大")}
        >
          <Icon name="plus" size={15} />
        </button>
      </div>

      <div className="toolbar-separator" />

      <div className="toolbar-group">
        <button
          type="button"
          className={`toolbar-button ${zoomMode === "fit-width" ? "is-active" : ""}`}
          onClick={onFitWidth}
          title={t("适合宽度 ⌘9")}
          aria-label={t("适合宽度")}
        >
          <Icon name="fitWidth" size={16} />
        </button>
        <button
          type="button"
          className={`toolbar-button ${zoomMode === "fit-page" ? "is-active" : ""}`}
          onClick={onFitPage}
          title={t("适合页面 ⌘8")}
          aria-label={t("适合页面")}
        >
          <Icon name="fitPage" size={15} />
        </button>
        <button
          type="button"
          className="toolbar-button"
          onClick={onRotate}
          title={t("旋转 90°（当前 {rotation}°）", { rotation })}
          aria-label={t("旋转")}
        >
          <Icon name="rotate" size={16} />
        </button>
        <button
          type="button"
          className="toolbar-button"
          onClick={onToggleViewMode}
          title={
            viewMode === "continuous"
              ? t("切换到单页视图")
              : t("切换到连续视图")
          }
          aria-label={t("切换视图")}
        >
          <Icon
            name={viewMode === "continuous" ? "singlePage" : "continuous"}
            size={16}
          />
        </button>
        <button
          type="button"
          className="toolbar-button"
          onClick={onCyclePageTheme}
          title={t("{label}（点击切换）", { label: pageThemeLabel(pageTheme) })}
          aria-label={t("切换页面配色")}
        >
          <Icon name={pageThemeIcon(pageTheme)} size={16} />
        </button>
      </div>
    </div>
  );
}
