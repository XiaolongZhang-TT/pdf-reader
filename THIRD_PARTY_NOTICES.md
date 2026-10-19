# Third-party notices

Paper is distributed under the [MIT License](LICENSE). It bundles or depends on
the following third-party software. Full license texts are available in the
respective package sources and in the installed `node_modules` / Cargo registry.

## Runtime

| Component | License | Project |
| --- | --- | --- |
| PDF.js (`pdfjs-dist`) | Apache-2.0 | https://github.com/mozilla/pdf.js |
| Tauri (`tauri`, `tauri-plugin-dialog`) | MIT OR Apache-2.0 | https://github.com/tauri-apps/tauri |
| React / React DOM | MIT | https://github.com/facebook/react |
| Tauri JS API (`@tauri-apps/api`, `@tauri-apps/plugin-dialog`) | MIT OR Apache-2.0 | https://github.com/tauri-apps/tauri |
| Serde / serde_json | MIT OR Apache-2.0 | https://github.com/serde-rs/serde |
| Rust standard library | MIT OR Apache-2.0 | https://github.com/rust-lang/rust |

## PDF.js assets

The application copies PDF.js's `cmaps`, `standard_fonts`, `wasm` and `iccs`
resources at build time so that CJK text, standard fonts and certain image
formats render offline. These files are part of PDF.js and are covered by its
Apache-2.0 license and the licenses of the individual font files.

## Build tooling (not shipped)

Vite, TypeScript, React plugin for Vite, pnpm, the Tauri CLI and the Rust
toolchain are used at build time only and are not part of the distributed
application binary beyond their generated output.

If you redistribute Paper, keep this file and the MIT license notice, and
preserve the PDF.js Apache-2.0 notice as required by that license.
