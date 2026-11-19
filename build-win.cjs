const { spawnSync } = require("node:child_process");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const root = __dirname;
const packageInfo = require(path.join(root, "package.json"));
const tempOutput = path.join(os.tmpdir(), `hadas-vs-monstruos-build-${process.pid}`);
const builderCli = path.join(root, "node_modules", "electron-builder", "cli.js");
const build = spawnSync(process.execPath, [
  builderCli,
  "--win",
  "portable",
  `--config.directories.output=${tempOutput}`
], { cwd: root, stdio: "inherit" });

if (build.error) throw build.error;
if (build.status !== 0) process.exit(build.status || 1);

const artifactName = `Hadas-vs-Monstruos-Portable-${packageInfo.version}.exe`;
const artifactPath = path.join(tempOutput, artifactName);
const outputDirectory = path.join(root, "dist");
fs.mkdirSync(outputDirectory, { recursive: true });
fs.copyFileSync(artifactPath, path.join(outputDirectory, artifactName));
fs.rmSync(tempOutput, { recursive: true, force: true });
console.log(`Ejecutable creado: ${path.join(outputDirectory, artifactName)}`);
