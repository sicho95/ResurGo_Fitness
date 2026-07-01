import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.resolve(__dirname, "..");
const src = path.join(root, "src");

async function ensureDir(dir) {
  await fs.mkdir(dir, { recursive: true });
}

async function copyFile(from, to) {
  await ensureDir(path.dirname(to));
  await fs.copyFile(from, to);
}

async function copyDir(from, to) {
  await ensureDir(to);
  const entries = await fs.readdir(from, { withFileTypes: true });
  for (const entry of entries) {
    const srcPath = path.join(from, entry.name);
    const destPath = path.join(to, entry.name);
    if (entry.isDirectory()) {
      await copyDir(srcPath, destPath);
    } else {
      await copyFile(srcPath, destPath);
    }
  }
}

async function writeBundle() {
  const appDir = path.join(src, "app");
  const parts = (await fs.readdir(appDir))
    .filter(name => /^part-\d+\.js$/.test(name))
    .sort((a, b) => a.localeCompare(b, "en"));
  const chunks = [];
  for (const part of parts) {
    chunks.push(await fs.readFile(path.join(appDir, part), "utf8"));
  }
  const bundle = chunks.join("\n").trimEnd();
  await fs.writeFile(path.join(root, "app.js"), `${bundle}\n`, "utf8");
}

async function copyStatic() {
  const staticDir = path.join(src, "static");
  const files = await fs.readdir(staticDir);
  for (const file of files) {
    await copyFile(path.join(staticDir, file), path.join(root, file));
  }
}

async function main() {
  await writeBundle();
  await copyStatic();
  await fs.rm(path.join(root, "assets", "app"), { recursive: true, force: true });
  await copyDir(path.join(src, "assets"), path.join(root, "assets"));
  await copyDir(path.join(src, "docs"), path.join(root, "docs"));
  await copyDir(path.join(src, "workers"), path.join(root, "workers"));
  console.log("Build complete.");
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
