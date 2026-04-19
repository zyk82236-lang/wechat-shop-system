import { spawn } from "node:child_process";
import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import net from "node:net";

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(__dirname, "..");
const minPort = Number(process.env.API_PORT_START ?? "3000");
const maxPort = Number(process.env.API_PORT_END ?? "3010");
const persistPath = resolve(projectRoot, ".runtime", "api-port.txt");

function isPortFree(port) {
  return new Promise((resolveFree) => {
    const server = net.createServer();
    server.unref();
    server.on("error", () => resolveFree(false));
    server.listen({ port, host: "127.0.0.1" }, () => {
      server.close(() => resolveFree(true));
    });
  });
}

async function findFreePort(start, end) {
  for (let port = start; port <= end; port += 1) {
    // eslint-disable-next-line no-await-in-loop
    if (await isPortFree(port)) return port;
  }
  // Fallback: ask OS for any free ephemeral port.
  return new Promise((resolvePort) => {
    const server = net.createServer();
    server.unref();
    server.listen({ port: 0, host: "127.0.0.1" }, () => {
      const address = server.address();
      const port = typeof address === "object" && address ? address.port : null;
      server.close(() => resolvePort(port));
    });
    server.on("error", () => resolvePort(null));
  });
}

function persistPort(port) {
  mkdirSync(dirname(persistPath), { recursive: true });
  writeFileSync(persistPath, `${port}\n`, "utf8");
}

async function main() {
  let port = await findFreePort(minPort, maxPort);
  if (!port) {
    // Final fallback if probing is blocked by environment policy.
    port = 3800 + (Date.now() % 800);
    console.warn(`[dev:api] Port probe failed, fallback to ${port}.`);
  }

  persistPort(port);
  console.log(`[dev:api] Using port ${port}`);
  console.log(`[dev:api] Saved to ${persistPath}`);

  if (process.argv.includes("--print-only")) {
    return;
  }

  const child = spawn("npm", ["--workspace", "@shop/api", "run", "start:dev"], {
    cwd: projectRoot,
    stdio: "inherit",
    env: { ...process.env, PORT: String(port) },
    shell: true,
  });

  child.on("exit", (code) => process.exit(code ?? 0));
}

void main();
