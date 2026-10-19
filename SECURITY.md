# Security policy

## Supported versions

Paper is pre-1.0. Only the latest release receives security fixes.

| Version | Supported |
| --- | --- |
| 0.1.x | ✅ |
| < 0.1 | ❌ |

## Reporting a vulnerability

Please **do not open a public issue** for security problems.

Report vulnerabilities privately through GitHub's
[security advisory form](https://github.com/XiaolongZhang-TT/pdf-reader/security/advisories/new).
Please include:

- a description of the issue and its impact,
- steps or a proof of concept to reproduce it,
- the affected version and platform.

You can expect an initial response within a few days. Please give us reasonable
time to publish a fix before disclosing the issue publicly.

## Scope and threat model

Paper is a local-first desktop application:

- It does not send documents, metadata or telemetry anywhere.
- Documents are only read when the user opens them (file picker, drag & drop,
  CLI argument or double-click).
- Reading progress, bookmarks and annotations are stored locally in the
  WebView's `localStorage`.
- The frontend runs without remote content; a Content Security Policy is set in
  `src-tauri/tauri.conf.json`.

Issues that are especially relevant:

- sandbox escapes or arbitrary file write/execute through a crafted PDF,
- remote code execution through the WebView or the Tauri IPC bridge,
- path traversal in the Rust file-reading command,
- npm/Cargo dependency vulnerabilities.

## Release integrity

- Builds are produced by GitHub Actions from this repository
  (`.github/workflows/release.yml`).
- macOS builds are **unsigned and not notarized**; they are distributed as-is
  from the Releases page. Verify the checksum published with each release.
- Windows and Linux builds are unsigned as well.
- No build secrets are stored in the repository.
