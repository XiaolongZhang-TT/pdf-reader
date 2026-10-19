import { t } from "../lib/i18n";
import { Icon, PaperMark } from "../lib/icons";
import type { ThemeMode } from "../lib/types";

type Props = {
  title: string;
  subtitle?: string;
  hasDoc: boolean;
  sidebarOpen: boolean;
  onToggleSidebar: () => void;
  onOpenFile: () => void;
  onSearch: () => void;
  onHome: () => void;
  theme: ThemeMode;
  onCycleTheme: () => void;
  settingsOpen: boolean;
  onToggleSettings: () => void;
  isTauri: boolean;
};

const themeIcon = (theme: ThemeMode) =>
  theme === "light" ? "sun" : theme === "dark" ? "moon" : "display";
const themeLabel = (theme: ThemeMode) =>
  theme === "light"
    ? t("浅色外观")
    : theme === "dark"
      ? t("深色外观")
      : t("跟随系统");

export function TitleBar({
  title,
  subtitle,
  hasDoc,
  sidebarOpen,
  onToggleSidebar,
  onOpenFile,
  onSearch,
  onHome,
  theme,
  onCycleTheme,
  settingsOpen,
  onToggleSettings,
  isTauri,
}: Props) {
  return (
    <header
      className={`titlebar ${isTauri ? "is-tauri" : ""}`}
      data-tauri-drag-region
    >
      <div className="titlebar-left" data-tauri-drag-region>
        <button
          type="button"
          className={`icon-button ${sidebarOpen ? "is-active" : ""}`}
          onClick={onToggleSidebar}
          title={t("收起/展开侧边栏 ⌘⌥S")}
          aria-label={t("侧边栏")}
        >
          <Icon name="sidebar" size={17} />
        </button>
        {hasDoc && (
          <button
            type="button"
            className="icon-button"
            onClick={onHome}
            title={t("关闭文档 ⌘⇧W")}
            aria-label={t("关闭文档")}
          >
            <Icon name="chevronLeft" size={17} />
          </button>
        )}
      </div>

      <div className="titlebar-center" data-tauri-drag-region>
        <div className="titlebar-text" data-tauri-drag-region>
          {hasDoc ? (
            <>
              <div className="titlebar-title" data-tauri-drag-region title={title}>
                {title}
              </div>
              <div
                className="titlebar-subtitle"
                data-tauri-drag-region
                title={subtitle}
              >
                {subtitle}
              </div>
            </>
          ) : (
            <div className="titlebar-brand" data-tauri-drag-region>
              <PaperMark size={18} />
              <span data-tauri-drag-region>Paper</span>
            </div>
          )}
        </div>
      </div>

      <div className="titlebar-right" data-tauri-drag-region>
        {hasDoc && (
          <button
            type="button"
            className="icon-button"
            onClick={onSearch}
            title={t("搜索 ⌘F")}
            aria-label={t("搜索")}
          >
            <Icon name="search" size={17} />
          </button>
        )}
        <button
          type="button"
          className="icon-button"
          onClick={onCycleTheme}
          title={t("{label}（点击切换）", { label: themeLabel(theme) })}
          aria-label={t("切换外观")}
        >
          <Icon name={themeIcon(theme)} size={17} />
        </button>
        <button
          type="button"
          className={`icon-button ${settingsOpen ? "is-active" : ""}`}
          onClick={onToggleSettings}
          data-settings-trigger=""
          title={t("设置")}
          aria-label={t("设置")}
        >
          <Icon name="settings" size={17} />
        </button>
        <button
          type="button"
          className="open-button"
          onClick={onOpenFile}
          title={t("打开 PDF ⌘O")}
        >
          <Icon name="folder" size={15} />
          <span>{t("打开")}</span>
        </button>
      </div>
    </header>
  );
}
