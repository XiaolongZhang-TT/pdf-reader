import { t } from "../lib/i18n";
import { Icon } from "../lib/icons";
import type {
  LanguageSetting,
  PageTheme,
  Settings,
  ThemeMode,
  ViewMode,
} from "../lib/types";

type Props = {
  settings: Settings;
  version: string;
  onChange: <K extends keyof Settings>(key: K, value: Settings[K]) => void;
  onClose: () => void;
};

const THEMES: Array<{ value: ThemeMode; label: string; icon: "sun" | "moon" | "display" }> = [
  { value: "light", label: "浅色", icon: "sun" },
  { value: "dark", label: "深色", icon: "moon" },
  { value: "system", label: "系统", icon: "display" },
];

const LANGUAGES: Array<{ value: LanguageSetting; label: string }> = [
  { value: "system", label: "跟随系统" },
  { value: "zh", label: "简体中文" },
  { value: "en", label: "English" },
];

const PAGE_THEMES: Array<{ value: PageTheme; label: string }> = [
  { value: "normal", label: "原始" },
  { value: "sepia", label: "护眼" },
  { value: "night", label: "夜间" },
];

const VIEW_MODES: Array<{ value: ViewMode; label: string }> = [
  { value: "continuous", label: "连续" },
  { value: "single", label: "单页" },
];

const SHORTCUTS: Array<[string, string]> = [
  ["⌘O", "打开 PDF"],
  ["⌘F", "搜索"],
  ["⌘D", "添加书签"],
  ["⌘+ / ⌘−", "缩放"],
  ["⌘0", "实际大小"],
  ["⌘9 / ⌘8", "适合宽度 / 页面"],
  ["⌘⌥S", "侧边栏"],
  ["⌘⇧W", "关闭文档"],
];

export function SettingsPopover({ settings, version, onChange, onClose }: Props) {
  return (
    <div className="settings-popover" role="dialog" aria-label={t("设置")}>
      <div className="settings-header">
        <span>{t("设置")}</span>
        <button
          type="button"
          className="mini-icon-button"
          onClick={onClose}
          aria-label={t("取消")}
        >
          <Icon name="close" size={13} />
        </button>
      </div>

      <div className="settings-section">
        <div className="settings-label">{t("外观")}</div>
        <div className="segmented">
          {THEMES.map((theme) => (
            <button
              key={theme.value}
              type="button"
              className={`segment ${settings.theme === theme.value ? "is-active" : ""}`}
              onClick={() => onChange("theme", theme.value)}
            >
              <Icon name={theme.icon} size={14} />
              {t(theme.label)}
            </button>
          ))}
        </div>
      </div>

      <div className="settings-section">
        <div className="settings-label">{t("语言")}</div>
        <div className="segmented">
          {LANGUAGES.map((language) => (
            <button
              key={language.value}
              type="button"
              className={`segment ${
                settings.language === language.value ? "is-active" : ""
              }`}
              onClick={() => onChange("language", language.value)}
            >
              {t(language.label)}
            </button>
          ))}
        </div>
      </div>

      <div className="settings-section">
        <div className="settings-label">{t("页面配色")}</div>
        <div className="segmented">
          {PAGE_THEMES.map((theme) => (
            <button
              key={theme.value}
              type="button"
              className={`segment ${
                settings.pageTheme === theme.value ? "is-active" : ""
              }`}
              onClick={() => onChange("pageTheme", theme.value)}
            >
              {t(theme.label)}
            </button>
          ))}
        </div>
      </div>

      <div className="settings-section">
        <div className="settings-label">{t("默认视图")}</div>
        <div className="segmented">
          {VIEW_MODES.map((mode) => (
            <button
              key={mode.value}
              type="button"
              className={`segment ${
                settings.viewMode === mode.value ? "is-active" : ""
              }`}
              onClick={() => onChange("viewMode", mode.value)}
            >
              {t(mode.label)}
            </button>
          ))}
        </div>
      </div>

      <div className="settings-section row">
        <div>
          <div className="settings-label">{t("继续上次阅读")}</div>
          <div className="settings-description">{t("启动时自动打开最近阅读的文档")}</div>
        </div>
        <button
          type="button"
          className={`switch ${
            settings.rememberLastDocument ? "is-on" : ""
          }`}
          role="switch"
          aria-checked={settings.rememberLastDocument}
          onClick={() =>
            onChange("rememberLastDocument", !settings.rememberLastDocument)
          }
        >
          <span className="switch-knob" />
        </button>
      </div>

      <div className="settings-section">
        <div className="settings-label">{t("快捷键")}</div>
        <div className="shortcut-grid">
          {SHORTCUTS.map(([keys, action]) => (
            <div className="shortcut-row" key={keys}>
              <span className="shortcut-keys">{keys}</span>
              <span className="shortcut-action">{t(action)}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="settings-footer">
        <span>{t("Paper {version}", { version })}</span>
        <span className="dot-separator" />
        <span>{t("PDF.js 渲染引擎")}</span>
      </div>
    </div>
  );
}
