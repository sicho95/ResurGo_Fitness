import { execSync } from "node:child_process";
import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.resolve(__dirname, "..");
const assetsDir = path.join(root, "assets");
const docsDir = path.join(root, "docs");
const workersDir = path.join(root, "workers");
const sourceFiles = ["app.js", "index.html", "styles.css", "sw.js", "manifest.webmanifest", "icon.svg", "version.json"];

function argValue(flag, fallback) {
  const index = process.argv.indexOf(flag);
  return index >= 0 ? process.argv[index + 1] : fallback;
}

function gitShortSha() {
  try {
    return execSync("git rev-parse --short HEAD", { cwd: root, stdio: ["ignore", "pipe", "ignore"] }).toString().trim();
  } catch {
    return "local";
  }
}

function buildStamp() {
  return new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
}

function replaceTokens(content, meta) {
  return content
    .replaceAll("__APP_VERSION__", meta.version)
    .replaceAll("__APP_BUILD__", meta.buildId)
    .replaceAll("__BUILD_DATE__", meta.updatedAt)
    .replaceAll("__COMMIT_SHA__", meta.commitSha);
}

async function ensureDir(dir) {
  await fs.mkdir(dir, { recursive: true });
}

async function copyFile(from, to, meta = null) {
  await ensureDir(path.dirname(to));
  if (!meta) {
    await fs.copyFile(from, to);
    return;
  }
  const content = await fs.readFile(from, "utf8");
  await fs.writeFile(to, replaceTokens(content, meta), "utf8");
}

async function copyDir(from, to, meta = null) {
  await ensureDir(to);
  const entries = await fs.readdir(from, { withFileTypes: true });
  for (const entry of entries) {
    const srcPath = path.join(from, entry.name);
    const destPath = path.join(to, entry.name);
    if (entry.isDirectory()) {
      await copyDir(srcPath, destPath, meta);
    } else {
      await copyFile(srcPath, destPath, meta);
    }
  }
}

async function copyRootSource(outDir, meta) {
  for (const file of sourceFiles) {
    await copyFile(path.join(root, file), path.join(outDir, file), meta);
  }
}

async function main() {
  const outDir = path.resolve(root, argValue("--out", ".webapp-build"));
  const template = JSON.parse(await fs.readFile(path.join(root, "version.json"), "utf8"));
  const baseVersion = String(template.version || "0.0.0").trim();
  const sha = process.env.GITHUB_SHA?.slice(0, 7) || gitShortSha();
  const runNumber = process.env.GITHUB_RUN_NUMBER?.trim();
  const buildId = runNumber ? `${baseVersion}-web.${runNumber}` : `${baseVersion}-local.${sha}.${buildStamp()}`;
  const meta = {
    version: baseVersion,
    buildId,
    updatedAt: new Date().toISOString().slice(0, 10),
    commitSha: process.env.GITHUB_SHA || sha
  };

  await fs.rm(outDir, { recursive: true, force: true });
  await ensureDir(outDir);
  await copyRootSource(outDir, meta);
  await copyDir(assetsDir, path.join(outDir, "assets"));
  await copyDir(docsDir, path.join(outDir, "docs"));
  await copyDir(workersDir, path.join(outDir, "workers"));
  await fs.writeFile(path.join(outDir, ".nojekyll"), "", "utf8");

  console.log(`Build complete in ${outDir}`);
  console.log(`Version: ${meta.version}`);
  console.log(`Build ID: ${meta.buildId}`);
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
