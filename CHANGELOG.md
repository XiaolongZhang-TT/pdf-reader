# Changelog

All notable changes to Paper are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/)
and this project adheres to [Semantic Versioning](https://semver.org/).

## [Unreleased]

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
