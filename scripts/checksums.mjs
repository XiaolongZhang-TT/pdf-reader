// Generate a SHA-256 checksum file for the installers produced by `tauri build`.
import { createHash } from "node:crypto";
import { readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { join, relative } from "node:path";

const root = "src-tauri/target/release/bundle";
const extensions = [
  ".dmg",
  ".msi",
  ".exe",
  ".deb",
  ".rpm",
  ".AppImage",
  ".app.tar.gz",
  ".tar.gz",
];

function walk(dir) {
  const files = [];
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    const stat = statSync(path);
    if (stat.isDirectory()) files.push(...walk(path));
    else files.push(path);
  }
  return files;
}

const files = walk(root).filter((file) =>
  extensions.some((extension) => file.endsWith(extension)),
);

if (files.length === 0) {
  console.warn("No bundle files found, skipping checksums.");
  process.exit(0);
}

const lines = files.map((file) => {
  const hash = createHash("sha256").update(readFileSync(file)).digest("hex");
  return `${hash}  ${relative(root, file)}`;
});

const os = process.env.RUNNER_OS ?? process.platform;
const output = `checksums-${os}.txt`;
writeFileSync(output, `${lines.join("\n")}\n`);
console.log(`Wrote ${output}:\n${lines.join("\n")}`);
