import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(__dirname, "..");
const portFile = resolve(projectRoot, ".runtime", "api-port.txt");

function resolveApiBase() {
  const envBase = process.env.VITE_API_BASE?.trim();
  if (envBase) return envBase;
  try {
    const port = readFileSync(portFile, "utf8").trim();
    if (port) return `http://localhost:${port}`;
  } catch {
    // ignore
  }
  return "http://localhost:3000";
}

const apiBase = resolveApiBase();
console.log(`[dev:admin:auto] Using API base ${apiBase}`);

const child = spawn("npm", ["--workspace", "@shop/admin", "run", "dev"], {
  cwd: projectRoot,
  stdio: "inherit",
  env: { ...process.env, VITE_API_BASE: apiBase },
  shell: true,
});

child.on("exit", (code) => process.exit(code ?? 0));
