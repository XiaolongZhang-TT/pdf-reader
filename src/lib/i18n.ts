import type { LanguageSetting, Locale } from "./types";

/**
 * Lightweight i18n.
 *
 * The Chinese strings are used as translation keys (they are the source of
 * truth for the original UI). English translations live in the map below and
 * missing entries fall back to Chinese, so the UI never breaks when a string
 * is added. `syncLocale` is called from `App` on every render, which is enough
 * because changing the language always re-renders the whole tree.
 */
const en: Record<string, string> = {
  // ---------------------------------------------------------------- shell
  "打开 PDF": "Open PDF",
  "打开 PDF ⌘O": "Open PDF (⌘O)",
  "打开": "Open",
  "设置": "Settings",
  "搜索": "Search",
  "搜索 ⌘F": "Search (⌘F)",
  "收起/展开侧边栏 ⌘⌥S": "Toggle sidebar (⌘⌥S)",
  "收起侧边栏": "Collapse sidebar",
  "关闭文档 ⌘⇧W": "Close document (⌘⇧W)",
  "关闭文档": "Close document",
  "切换外观": "Change appearance",
  "{label}（点击切换）": "{label} (click to change)",
  "浅色外观": "Light appearance",
  "深色外观": "Dark appearance",
  "跟随系统": "Follow system",

  // ---------------------------------------------------------------- home
  "安静、专注的 PDF 阅读器": "A quiet, focused PDF reader",
  "也可以把 PDF 文件拖到这里": "You can also drop a PDF here",
  "最近打开": "Recent documents",
  "在访达中显示": "Show in folder",
  "从最近列表中移除": "Remove from recent list",
  "支持 macOS · Windows · Linux": "macOS · Windows · Linux",
  "基于 PDF.js 渲染": "Powered by PDF.js",
  "第 {page} / {total} 页 · {time}": "Page {page} / {total} · {time}",

  // ---------------------------------------------------------------- loading
  "正在打开文档": "Opening document",
  "正在解析 PDF": "Parsing PDF",

  // ---------------------------------------------------------------- password
  "此文档已加密": "This document is encrypted",
  "密码不正确，请重试。": "Incorrect password. Try again.",
  "请输入打开该 PDF 所需的密码。": "Enter the password required to open this PDF.",
  "密码": "Password",
  "需要密码": "Password required",
  "PDF 文档": "PDF document",
  "取消": "Cancel",
  "解锁": "Unlock",

  // ---------------------------------------------------------------- drop
  "松开以打开 PDF": "Drop to open PDF",
  "文件只会在本机打开，不会上传": "The file stays on your device and is never uploaded",

  // ---------------------------------------------------------------- toolbar
  "阅读工具栏": "Reading toolbar",
  "上一页 ←": "Previous page (←)",
  "下一页 →": "Next page (→)",
  "上一页": "Previous page",
  "下一页": "Next page",
  "页码": "Page number",
  "缩小 ⌘-": "Zoom out (⌘-)",
  "放大 ⌘+": "Zoom in (⌘+)",
  "实际大小 ⌘0": "Actual size (⌘0)",
  "适合宽度 ⌘9": "Fit width (⌘9)",
  "适合页面 ⌘8": "Fit page (⌘8)",
  "旋转 90°（当前 {rotation}°）": "Rotate 90° (currently {rotation}°)",
  "旋转": "Rotate",
  "切换到单页视图": "Switch to single-page view",
  "切换到连续视图": "Switch to continuous view",
  "切换视图": "Toggle view mode",
  "切换页面配色": "Change page theme",
  "夜间页面": "Night page",
  "护眼纸张": "Sepia page",
  "原始页面": "Original page",
  "原始": "Original",
  "护眼": "Sepia",
  "夜间": "Night",
  "连续": "Continuous",
  "单页": "Single page",

  // ---------------------------------------------------------------- settings
  "外观": "Appearance",
  "浅色": "Light",
  "深色": "Dark",
  "系统": "System",
  "页面配色": "Page theme",
  "默认视图": "Default view",
  "继续上次阅读": "Resume last document",
  "启动时自动打开最近阅读的文档": "Open the most recent document on launch",
  "语言": "Language",
  "简体中文": "中文",
  "English": "English",
  "快捷键": "Shortcuts",
  "缩放": "Zoom",
  "实际大小": "Actual size",
  "适合宽度 / 页面": "Fit width / page",
  "侧边栏": "Sidebar",
  "Paper {version}": "Paper {version}",
  "PDF.js 渲染引擎": "PDF.js rendering engine",

  // ---------------------------------------------------------------- annotations UI
  "高亮颜色": "Highlight colour",
  "高亮": "Highlight",
  "下划线": "Underline",
  "删除线": "Strikeout",
  "便签": "Note",
  "添加便签": "Add note",
  "复制文字 ⌘C": "Copy text (⌘C)",
  "复制文字": "Copy text",
  "第 {page} 页": "Page {page}",
  "打开一个 PDF 开始阅读": "Open a PDF to get started",
  "收起": "Collapse",
  "展开": "Expand",
  "删除书签": "Delete bookmark",
  "删除标注": "Delete annotation",
  "添加备注": "Add note",
  "写下你的想法…": "Write your note…",
  "⌘↩ 保存": "⌘↩ to save",
  "删除": "Delete",
  "黄色": "Yellow",
  "绿色": "Green",
  "蓝色": "Blue",
  "粉色": "Pink",
  "紫色": "Purple",
  "橙色": "Orange",
  "{color}高亮": "{color} highlight",

  // ---------------------------------------------------------------- sidebar
  "目录": "Outline",
  "缩略图": "Thumbnails",
  "书签": "Bookmarks",
  "标注": "Annotations",
  "此文档没有目录": "This document has no outline",
  "可以使用缩略图或搜索来导航": "Use thumbnails or search to navigate",
  "还没有书签": "No bookmarks yet",
  "按 {shortcut} 或点击上方按钮添加": "Press {shortcut} or use the button above",
  "为当前页添加书签": "Bookmark current page",
  "移除当前页书签": "Remove page bookmark",
  "还没有标注": "No annotations yet",
  "选中文字后即可高亮、划线或添加便签": "Select text to highlight, underline or add a note",
  "共 {count} 条标注 · {pages} 页": "{count} annotations · {pages} pages",
  "第 {page} 页 · {type}": "Page {page} · {type}",
  "（无文字）": "(no text)",
  "在文档中搜索…": "Search in document…",
  "正在搜索… {percent}%": "Searching… {percent}%",
  "{count} 个结果": "{count} results",
  "没有找到匹配内容": "No matches",
  "清空搜索": "Clear search",
  "上一个结果": "Previous result",
  "下一个结果": "Next result",
  "没有找到“{query}”": "No matches for “{query}”",

  // ---------------------------------------------------------------- toasts
  "已打开 {name}": "Opened {name}",
  "无法打开这个 PDF，文件可能已损坏或被移动": "Could not open this PDF. It may be damaged or moved.",
  "无法打开文件选择器": "Could not open the file picker.",
  "已复制文字": "Text copied",
  "复制失败": "Copy failed",
  "已添加书签": "Bookmark added",
  "已移除书签": "Bookmark removed",
  "已添加高亮": "Highlight added",
  "已添加下划线": "Underline added",
  "已添加删除线": "Strikeout added",
  "已删除标注": "Annotation deleted",
  "已撤销标注": "Annotation undone",
  "已恢复标注": "Annotation restored",
  "没有可撤销的标注操作": "Nothing to undo",
  "第 {page} / {total} 页": "Page {page} / {total}",
  "{name} · 第 {page} / {total} 页": "{name} · page {page} / {total}",

  // ---------------------------------------------------------------- relative time
  "Paper 遇到了一点问题": "Paper ran into a problem",
  "重新载入": "Reload",
  "刚刚": "just now",
  "{n} 分钟前": "{n} min ago",
  "{n} 小时前": "{n} h ago",
  "{n} 天前": "{n} d ago",

  // ---------------------------------------------------------------- native menu (Rust also has its own labels)
  "关于 Paper": "About Paper",
  "退出 Paper": "Quit Paper",
  "文件": "File",
  "编辑": "Edit",
  "显示": "View",
  "窗口": "Window",
  "帮助": "Help",
  "关闭窗口": "Close Window",
  "最小化": "Minimize",
  "撤销": "Undo",
  "拷贝": "Copy",
  "粘贴": "Paste",
  "全选": "Select All",
  "适合宽度": "Fit width",
  "适合页面": "Fit page",
  "连续 / 单页视图": "Continuous / single page",
  "切换全屏": "Toggle fullscreen",
  "打开…": "Open…",
};

let currentSetting: LanguageSetting = "system";
let currentLocale: Locale = "zh";

function detectLocale(): Locale {
  if (typeof navigator === "undefined") return "zh";
  const languages = navigator.languages?.length
    ? navigator.languages
    : [navigator.language ?? "zh"];
  return languages.some((lang) => lang.toLowerCase().startsWith("zh"))
    ? "zh"
    : "en";
}

export function resolveLocale(setting: LanguageSetting): Locale {
  return setting === "system" ? detectLocale() : setting;
}

export function getLocale(): Locale {
  return currentLocale;
}

export function syncLocale(setting: LanguageSetting) {
  currentSetting = setting;
  currentLocale = resolveLocale(setting);
}

export function t(
  key: string,
  params?: Record<string, string | number>,
): string {
  let text = currentLocale === "en" ? (en[key] ?? key) : key;
  if (params) {
    for (const [name, value] of Object.entries(params)) {
      text = text.split(`{${name}}`).join(String(value));
    }
  }
  return text;
}

export function currentLanguageSetting(): LanguageSetting {
  return currentSetting;
}
