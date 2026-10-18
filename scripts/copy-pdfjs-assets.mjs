import { copyFileSync, cpSync, existsSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..");
const pdfjsRoot = join(root, "node_modules", "pdfjs-dist");
const out = join(root, "public", "pdfjs");

const resources = ["cmaps", "standard_fonts", "wasm", "iccs"];

mkdirSync(out, { recursive: true });

for (const name of resources) {
  const from = join(pdfjsRoot, name);
  const to = join(out, name);
  if (!existsSync(from)) {
    console.warn(`[pdfjs-assets] skip missing ${name}`);
    continue;
  }
  cpSync(from, to, { recursive: true, force: true });
  console.log(`[pdfjs-assets] copied ${name}`);
}

// Keep the repository clean when node_modules is freshly installed.
if (!existsSync(join(out, "README.md"))) {
  const fs = await import("node:fs");
  fs.writeFileSync(
    join(out, "README.md"),
    "Assets copied from pdfjs-dist at build time — do not edit.\n",
  );
}
