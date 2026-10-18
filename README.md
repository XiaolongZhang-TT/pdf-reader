# Paper

一个安静、专注、界面精致的 **跨平台 PDF 阅读器**。使用 Tauri 2 + React + TypeScript + PDF.js 构建，在 macOS 上拥有原生的窗口材质与操作手感。

## 截图

![首页](docs/home.png)

| 浅色阅读 | 深色模式 |
| --- | --- |
| ![浅色阅读](docs/reader-light.png) | ![深色模式](docs/reader-dark.png) |

## 功能

**阅读**

- 连续滚动 / 单页两种视图，缩放（适合宽度、适合页面、实际大小、自由缩放）、90° 旋转
- 页面配色：原始白纸 / 护眼米色 / 夜间反色
- 自动记住每份文档的阅读位置，启动时可继续上次阅读
- 目录（含多级大纲）、缩略图、全文搜索（带上下文片段与精确命中高亮）、书签、标注五个侧边面板
- 最近打开列表（带首页缩略图封面）、拖拽打开、双击 PDF 由 Paper 打开
- PDF 密码输入、文档元数据（标题/作者）读取、页码标签（罗马数字等）

**标注**

- 选中文字后可高亮（6 种颜色）、加下划线、删除线、便签备注
- 标注与文档指纹绑定，本地持久化；移动文件位置也不会丢失
- 侧边栏集中管理全部标注，可跳转、改色、补充备注、删除
- `⌘Z` 撤销最近一次标注操作

**界面**

- macOS 原生质感：半透明侧边栏（vibrancy）、悬浮玻璃工具栏、跟随系统的浅色/深色外观
- 完全键盘可操作，所有按钮带悬停提示与快捷键说明
- 无网络依赖，所有数据只保存在本机

## 快速开始

### 环境要求

- Node.js ≥ 22 + pnpm
- Rust stable（`rustup` 安装）
- macOS 需要 Xcode Command Line Tools；Windows 需要 WebView2；Linux 需要 WebKitGTK 相关依赖

### 开发

```bash
pnpm install
pnpm tauri dev        # 启动桌面应用（自动拉起 Vite）
pnpm dev              # 只跑浏览器版本（PDF 通过文件选择器打开）
```

### 构建安装包

```bash
pnpm tauri build              # 同时生成 .app 与 .dmg
pnpm tauri build --bundles app  # 只生成 .app
```

产物位于 `src-tauri/target/release/bundle/`：

- `macos/Paper.app` —— 直接双击即可运行的 macOS 应用
- `dmg/Paper_0.1.0_aarch64.dmg` —— 可分发的磁盘映像

如果在受限环境（例如 CI 容器）里无法调用 `hdiutil` 创建磁盘映像，可以分两步：

```bash
./scripts/build.sh     # 构建 .app，并尝试生成 .dmg
./scripts/make-dmg.sh  # 只打包已有的 .app
```

### 本仓库内的工具链脚本

此工作区把 Rust 与 Node 工具链放在项目内（`.rustup` / `.cargo` / `.tools`，均已 gitignore），因此可以用：

```bash
./scripts/dev.sh      # 开发模式
./scripts/build.sh    # 打包
```

## 原生菜单

macOS 菜单栏提供完整入口，快捷键与按钮行为一致：

- **文件**：打开…（`⌘O`）、关闭文档（`⌘⇧W`）、关闭窗口
- **编辑**：撤销（`⌘Z`，输入框中撤销文字、阅读界面撤销标注）、拷贝、粘贴、全选
- **显示**：搜索（`⌘F`）、侧边栏（`⌘⌥S`）、放大/缩小/实际大小/适合宽度/适合页面、旋转、连续/单页、切换外观、切换页面配色、全屏（`⌃⌘F`）
- **窗口**：最小化、缩放
- **帮助**：快捷键

> 提示：本机开发时若遇到 Node 与 Rollup 原生模块签名不匹配的问题，可在项目内放置重新签名的 Node 并优先加入 `PATH`（见 `scripts/env.sh`）。

## 快捷键

| 快捷键 | 操作 |
| --- | --- |
| `⌘O` | 打开 PDF |
| `⌘F` | 全文搜索 |
| `⌘D` | 添加 / 移除当前页书签 |
| `⌘+` / `⌘-` | 放大 / 缩小 |
| `⌘0` | 实际大小 |
| `⌘9` / `⌘8` | 适合宽度 / 适合页面 |
| `⌘⌥S` | 展开 / 收起侧边栏 |
| `⌘⇧W` | 关闭当前文档 |
| `←` `→` | 上一页 / 下一页 |
| `↑` `↓` | 连续滚动 |
| `PageUp` `PageDown`、`Space` | 整屏滚动 / 翻页 |
| `Home` `End` | 第一页 / 最后一页 |
| `⌘Z` | 撤销（原生菜单，输入框内为撤销文字） |
| `⌃⌘F` | 切换全屏 |
| `Esc` | 关闭浮层 / 清除搜索 |

## 技术结构

```
src/
  App.tsx               应用编排：文档、搜索、标注、快捷键
  components/
    PageView.tsx        页面渲染（canvas + 文本层 + 标注层 + 搜索命中）
    Viewer.tsx          连续 / 单页视图、滚动定位、缩放锚点
    Sidebar.tsx         目录 / 缩略图 / 搜索 / 书签 / 标注面板
    Toolbar.tsx         悬浮阅读工具栏
    ...                 标题栏、空状态、浮层组件
  lib/
    pdf.ts              PDF.js 封装（文档加载、大纲、文本、搜索、缩略图）
    storage.ts          本地持久化（设置、进度、书签、标注、最近文件）
    platform.ts         Tauri / 浏览器双后端适配（文件选择、读取、拖拽）
  styles/global.css     设计系统与全部样式
src-tauri/
  src/lib.rs            Rust 端：文件读取、启动参数、Finder 打开事件
  tauri.conf.json       窗口（透明标题栏、vibrancy）、打包、PDF 文件关联
```

页面渲染要点：

- 画布按 `devicePixelRatio` 渲染，缩放时保持阅读锚点稳定
- 文本层由 PDF.js `TextLayer` 构建，页面旋转通过 CSS 变换与 viewport 坐标互转完成，保证旋转页面上的选择、命中与标注位置正确
- 连续视图只挂载视口附近的页面，滚动时自动回收，避免长文档占用过多内存
- “适合宽度”以文档中位页宽为基准，并对更宽的页面（如横向页）逐页自适应，避免裁切

## 数据保存

全部使用浏览器 `localStorage`（由系统 WebView 持久化）：

| Key | 内容 |
| --- | --- |
| `paper.settings` | 外观、页面配色、默认视图、启动行为 |
| `paper.recents` | 最近打开的文档与封面 |
| `paper.session` | 上次阅读的文档 |
| `paper.progress.<fingerprint>` | 阅读位置 |
| `paper.bookmarks.<fingerprint>` | 书签 |
| `paper.annotations.<fingerprint>` | 高亮 / 下划线 / 删除线 / 便签 |

`fingerprint` 是 PDF.js 计算出的文档指纹，因此移动或重命名文件后标注仍然有效。

## 已知限制

- 扫描版（纯图片）PDF 没有文本层，无法选择文字或全文搜索
- 暂不支持手写墨迹、PDF 表单填写与签名
- 超大文档（>500 MB）首次解析会占用较多内存
- 尚未做 Windows / Linux 的实机验证（代码路径已适配）

## License

MIT
