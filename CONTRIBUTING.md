# Contributing to Paper

Thanks for your interest in improving Paper! This document explains how to set
up the project, run checks and get a change merged.

## Ways to contribute

- Report bugs with a sample PDF when possible
- Suggest features or UI improvements
- Improve documentation and translations
- Fix bugs, add tests or implement roadmap items
- Review pull requests and help other users

Please be kind and follow our [Code of Conduct](CODE_OF_CONDUCT.md).

## Development setup

### Prerequisites

- **Node.js** ≥ 22.12 and **pnpm** 12 (`brew install node pnpm`, or `corepack enable`)
- **Rust** stable via [rustup](https://rustup.rs/) (the repository pins the toolchain in `rust-toolchain.toml`)
- **macOS**: Xcode Command Line Tools (`xcode-select --install`)
- **Windows**: Microsoft Edge WebView2 Runtime and the Visual Studio C++ build tools
- **Linux**: WebKitGTK and friends, for example on Debian/Ubuntu:

  ```bash
  sudo apt install libwebkit2gtk-4.1-dev libappindicator3-dev \
    librsvg2-dev patchelf libgtk-3-dev
  ```

### Install and run

```bash
pnpm install
pnpm tauri dev     # desktop app with hot reload
pnpm dev           # browser preview (open PDFs via the file picker)
```

### Useful scripts

| Command | Description |
| --- | --- |
| `pnpm dev` | Vite dev server only (browser preview) |
| `pnpm tauri dev` | Desktop app in development mode |
| `pnpm build` | Type-check and build the frontend bundle |
| `pnpm typecheck` | TypeScript only |
| `pnpm test` | Vitest unit tests |
| `pnpm tauri build` | Build installers for the current platform |
| `pnpm format:rust` | Format Rust sources |
| `cargo fmt --manifest-path src-tauri/Cargo.toml --all -- --check` | Check Rust formatting |
| `cargo clippy --manifest-path src-tauri/Cargo.toml --all-targets -- -D warnings` | Lint Rust |

CI runs the same checks on every pull request, including a compile check on
macOS and Windows.

## Project layout

```text
src/                  React frontend
  components/         UI components
  lib/                Pure helpers: PDF.js wrapper, storage, outline, platform
src-tauri/            Rust backend (Tauri)
  src/lib.rs          Commands, menu and file-open events
  tauri.conf.json     Shared config
  tauri.macos.conf.json / tauri.windows.conf.json / tauri.linux.conf.json
                      Platform-specific window and bundle overrides
.github/workflows/    CI and release automation
```

## Platform-specific configuration

Tauri merges `tauri.<platform>.conf.json` with the base `tauri.conf.json`.
macOS-only window chrome (transparent title bar, vibrancy) lives in
`tauri.macos.conf.json`; Windows and Linux keep the native window frame. When
adding a window option, check whether it belongs in the shared config or in a
platform override.

The native menu is built in Rust and intentionally uses custom menu items plus
only the predefined items that work on all platforms (copy / paste / select
all). macOS-only items such as "Hide" are gated with `#[cfg(target_os = "macos")]`.

## Tests

- Pure logic (outline indexing, geometry, storage helpers) belongs in
  `src/lib/*.test.ts` and should run with `pnpm test`.
- PDF-dependent behaviour is verified against real documents. If you fix a bug
  that depends on a specific PDF structure, add a unit test for the extracted
  helper where possible, and describe the manual verification in the PR.
- A Playwright end-to-end suite is planned; do not add heavy E2E fixtures
  without discussing it first.

## Coding guidelines

- TypeScript is `strict`; avoid `any` and type assertions unless necessary.
- Keep components focused. New cross-cutting state should go through a hook
  rather than growing `App.tsx`.
- UI strings are currently Chinese; new user-facing strings should stay
  consistent with the existing tone and be easy to extract for future i18n.
- Follow the existing CSS variable system in `src/styles/global.css`; do not
  hard-code platform-specific colours.
- Rust: run `cargo fmt` and keep `clippy -D warnings` clean.
- Avoid adding dependencies if a small helper does the job. If a dependency is
  required, explain why in the PR.

## Pull requests

1. Fork the repo and create a feature branch.
2. Keep commits focused; use a descriptive subject
   (`fix: highlight only one outline entry ...`).
3. Add or update tests and documentation.
4. Make sure all checks above pass.
5. Describe what you tested and on which platform (macOS / Windows / Linux).
6. Link related issues.

For large changes or new features, please open an issue first so we can agree on
the approach.

## License

By contributing you agree that your contributions are licensed under the
[MIT License](LICENSE).
