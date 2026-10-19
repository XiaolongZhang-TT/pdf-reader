# Paper

[![CI](https://github.com/XiaolongZhang-TT/pdf-reader/actions/workflows/ci.yml/badge.svg)](https://github.com/XiaolongZhang-TT/pdf-reader/actions/workflows/ci.yml)
[![Release](https://img.shields.io/github/v/release/XiaolongZhang-TT/pdf-reader?include_prereleases)](https://github.com/XiaolongZhang-TT/pdf-reader/releases/latest)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

[中文](README.md) · **English**

A quiet, focused, native-feeling PDF reader for macOS, Windows and Linux, built
with **Tauri 2 + React + TypeScript + PDF.js**.

## Screenshots

![Home](docs/home.png)

| Light | Dark |
| --- | --- |
| ![Light](docs/reader-light.png) | ![Dark](docs/reader-dark.png) |

## Download

Get the latest build from [Releases](https://github.com/XiaolongZhang-TT/pdf-reader/releases/latest):

| Platform | Artifact | Notes |
| --- | --- | --- |
| macOS 11+ (Apple Silicon) | `.dmg` | **Unsigned / not notarized.** If macOS blocks it: right-click → Open, or run `xattr -dr com.apple.quarantine /Applications/Paper.app` |
| Windows 10/11 (x64) | `.msi` / `-setup.exe` | Unsigned; for SmartScreen choose "More info" → "Run anyway" |
| Linux (x64) | `.AppImage` / `.deb` | Run `chmod +x` on the AppImage first |

> Status: macOS is fully tested. Windows and Linux are built and compile-checked
> in CI and use the native window frame — feedback is very welcome.

## Features

**Reading**

- Continuous and single-page modes, zoom (fit width / fit page / actual size /
  custom), 90° rotation
- Page themes (paper / sepia / night) and light / dark / system appearance
- Remembers the reading position per document and reopens the last document
- Sidebar panels: multi-level outline, thumbnails, full-text search with context
  snippets and precise hit highlighting, bookmarks and annotations
- Recent documents with cover thumbnails, drag & drop, PDF file association
- Password-protected PDFs, metadata and page labels

**Annotations**

- Highlight (6 colours), underline, strikeout and sticky notes on selected text
- Annotations are stored locally and keyed by the PDF fingerprint, so moving or
  renaming the file keeps them
- Manage, recolour, comment on and delete annotations from the sidebar
- `⌘/Ctrl+Z` undoes the last annotation operation

**UI**

- macOS: translucent sidebar (vibrancy), floating glass toolbar, transparent
  title bar
- Windows / Linux: native window frame
- Native menu bar, keyboard shortcuts, fullscreen, accessible labels
- **Local-first**: no document upload, no telemetry, no account

## Development

### Requirements

- Node.js ≥ 22.12 and pnpm 12 (`brew install node pnpm`, or `corepack enable`)
- Rust stable via [rustup](https://rustup.rs/) (pinned by `rust-toolchain.toml`)
- macOS: Xcode Command Line Tools
- Windows: WebView2 Runtime and the C++ build tools
- Linux: `libwebkit2gtk-4.1-dev libappindicator3-dev librsvg2-dev patchelf libgtk-3-dev`

```bash
pnpm install
pnpm tauri dev      # desktop app (starts Vite automatically)
pnpm dev            # browser preview (open PDFs through the file picker)
```

### Checks

```bash
pnpm typecheck
pnpm test
pnpm build
cargo fmt --manifest-path src-tauri/Cargo.toml --all -- --check
cargo clippy --manifest-path src-tauri/Cargo.toml --all-targets -- -D warnings
```

CI runs these on every pull request and compile-checks macOS and Windows.

### Packaging

```bash
pnpm tauri build
```

Artifacts land in `src-tauri/target/release/bundle/`:

- macOS: `macos/Paper.app`, `dmg/Paper_0.1.0_aarch64.dmg`
- Windows: `msi/`, `nsis/`
- Linux: `deb/`, `appimage/`

Platform overrides live in `src-tauri/tauri.macos.conf.json`,
`tauri.windows.conf.json` and `tauri.linux.conf.json`.

macOS builds are ad-hoc signed only (no Apple Developer ID), so Gatekeeper will
warn on first launch. This is intentional for now — see [SECURITY.md](SECURITY.md).

## Keyboard shortcuts

`Cmd` on macOS, `Ctrl` on Windows/Linux; `Alt` is used instead of `Option`.

| Shortcut | Action |
| --- | --- |
| `Cmd/Ctrl+O` | Open a PDF |
| `Cmd/Ctrl+F` | Search |
| `Cmd/Ctrl+D` | Toggle bookmark on current page |
| `Cmd/Ctrl++` / `-` | Zoom in / out |
| `Cmd/Ctrl+0` | Actual size |
| `Cmd/Ctrl+9` / `8` | Fit width / fit page |
| `Cmd/Ctrl+Alt+S` | Toggle sidebar |
| `Cmd/Ctrl+Shift+W` | Close document |
| `Cmd/Ctrl+Z` | Undo annotation (undo text in inputs) |
| `←` / `→` | Previous / next page |
| `↑` / `↓` | Scroll |
| `PageUp` / `PageDown`, `Space` | Page scroll |
| `Home` / `End` | First / last page |
| `Ctrl+Cmd/Ctrl+F` | Toggle fullscreen |
| `Esc` | Close popover / clear search |

## Native menu

The menu is built in Rust and shares actions across platforms: Paper/File
(About, Open, Close document, Close window, Quit), Edit (Undo, Copy, Paste,
Select all), View (search, sidebar, zoom, fit width/page, rotate, view mode,
appearance, page theme, fullscreen), Window (minimize, zoom) and Help
(shortcuts).

## Architecture

```text
src/
  App.tsx               document, search, annotations and shortcuts orchestration
  components/           Viewer / PageView / Sidebar / Toolbar / overlays
  lib/
    pdf.ts              PDF.js wrapper (document, outline, text, search, thumbs)
    outline.ts          outline flattening and single active entry selection
    storage.ts          local persistence (settings, progress, bookmarks, annotations)
    platform.ts         Tauri / browser adapters
    utils.ts            geometry, selection and clipboard helpers
  styles/global.css     design tokens and styles
src-tauri/
  src/lib.rs            file reading, native menu, file-open events
  tauri.conf.json       shared config
  tauri.*.conf.json     platform-specific window and bundle overrides
.github/workflows/      CI and cross-platform releases
```

Rendering highlights:

- Canvas renders at `devicePixelRatio`; zoom keeps a stable reading anchor
- The text layer is built with PDF.js `TextLayer`; page rotation uses CSS
  transforms plus viewport coordinate conversion so selection, search hits and
  annotation positions stay correct on rotated pages
- Only pages near the viewport stay mounted, so long documents use little memory
- "Fit width" uses the median page width and clamps wider landscape pages
- The outline tracks a single active entry by id, so entries that share a page
  never highlight together

## Data and privacy

Everything is stored locally in the WebView's `localStorage`:

| Key | Content |
| --- | --- |
| `paper.settings` | appearance, page theme, view mode, startup behaviour |
| `paper.recents` | recent documents and cover thumbnails |
| `paper.session` | last opened document |
| `paper.progress.<fingerprint>` | reading position |
| `paper.bookmarks.<fingerprint>` | bookmarks |
| `paper.annotations.<fingerprint>` | highlights / underlines / strikeouts / notes |

`fingerprint` is the PDF.js document fingerprint, so annotations survive file
moves and renames. Paper has no telemetry, account or sync features.

## Known limitations

- Scanned PDFs without a text layer cannot be selected or searched
- No ink annotations, form filling or signing yet
- Very large documents (>500 MB) may use a lot of memory on first parse
- Windows/Linux builds are not long-term tested by the maintainer
- macOS builds are unsigned and not notarized

## Contributing

Issues and pull requests are welcome. Please read
[CONTRIBUTING.md](CONTRIBUTING.md) and
[CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md) first.

Security reports: see [SECURITY.md](SECURITY.md).

Third-party notices: [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).

## License

[MIT](LICENSE) © 2026 Xiaolong Zhang
