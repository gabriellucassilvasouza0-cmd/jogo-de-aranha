#!/usr/bin/env node
// Inicia o chrome-devtools-mcp com as flags certas para cada ambiente.
//
// - Nuvem (Claude Code na web / app do celular): usa o Chromium pré-instalado,
//   sem interface gráfica e sem sandbox (o container roda como root).
// - Computador local: usa o Google Chrome instalado, com janela visível.
//
// Variáveis opcionais para ajuste local:
//   CHROME_DEVTOOLS_MCP_EXECUTABLE  caminho de um Chrome/Chromium específico
//   CHROME_DEVTOOLS_MCP_HEADLESS=1  força o modo sem janela
import { spawn } from "node:child_process";
import { existsSync } from "node:fs";

const PACKAGE = "chrome-devtools-mcp@latest";
const CLOUD_CHROMIUM = "/opt/pw-browsers/chromium";

const isCloud = existsSync(CLOUD_CHROMIUM);
const args = ["-y", PACKAGE, "--isolated"];

const customExecutable = process.env.CHROME_DEVTOOLS_MCP_EXECUTABLE;
if (customExecutable) {
  args.push(`--executablePath=${customExecutable}`);
} else if (isCloud) {
  args.push(`--executablePath=${CLOUD_CHROMIUM}`);
}

if (isCloud || process.env.CHROME_DEVTOOLS_MCP_HEADLESS === "1") {
  args.push("--headless");
}

if (isCloud) {
  args.push("--chromeArg=--no-sandbox");
}

// Repassa argumentos extras vindos do .mcp.json (ex.: --viewport=1280x720).
args.push(...process.argv.slice(2));

// No Windows o npx é um script .cmd e precisa de shell para ser executado.
const isWindows = process.platform === "win32";
const child = spawn(isWindows ? "npx.cmd" : "npx", args, {
  stdio: "inherit",
  shell: isWindows,
});

child.on("error", (err) => {
  console.error(`[chrome-devtools-mcp] falha ao iniciar o npx: ${err.message}`);
  process.exit(1);
});

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, () => child.kill(signal));
}

child.on("exit", (code, signal) => {
  process.exit(signal ? 1 : (code ?? 0));
});
