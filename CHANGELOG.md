# Changelog

All notable changes to Paper are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/)
and this project adheres to [Semantic Versioning](https://semver.org/).

## [Unreleased]

## [0.2.0] - 2026-10-19

### Added

- Interface language switch (follow system / 中文 / English) with a native menu
  that rebuilds in the selected language
- Playwright end-to-end tests for outline selection, search and language
  switching, plus a generated multi-page fixture PDF
- Visible keyboard focus styles, a focus trap in the password dialog and
  `prefers-reduced-motion` support
- CI job for end-to-end tests
- Checksums for release artifacts
- Contributor documentation, issue/PR templates and Dependabot

### Changed

- Bundle identifier is now `io.github.xiaolongzhangtt.pdfreader`
- Shared Tauri configuration no longer contains macOS-only window chrome;
  platform overrides live in `tauri.macos.conf.json`, `tauri.windows.conf.json`
  and `tauri.linux.conf.json`
- Native menu is cross-platform and localised
- Removed unused mobile icons

## [0.1.0] - 2026-10-19

### Added

- Continuous and single-page reading modes, zoom (fit width / fit page / actual
  size / custom), 90° rotation
- Paper / sepia / night page themes, light / dark / system appearance
- Table of contents with multi-level outline, thumbnail panel, full-text search
  with context snippets and precise hit highlighting, bookmarks and annotations
  (highlight / underline / strikeout / sticky note)
- Recent documents with page thumbnails, drag & drop, PDF file association,
  password-protected PDF support and page labels
- Local persistence of reading progress, bookmarks and annotations keyed by the
  document fingerprint
- Native menu bar, configurable global keyboard shortcuts, fullscreen mode
- Cross-platform Tauri configuration for macOS, Windows and Linux
- GitHub Actions CI (typecheck, unit tests, Rust fmt/clippy, compile checks on
  macOS and Windows) and release workflow building `.dmg`, `.msi`/`.exe`,
  `.deb` and `.AppImage`
- Contributor documentation, code of conduct, security policy and issue/PR
  templates

### Fixed

- Only one outline entry is highlighted when several entries point at the same
  page (common in long reports)
