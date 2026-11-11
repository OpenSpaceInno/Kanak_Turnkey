import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "..");

console.log("🚀 Starting Kanak Turnkey Application...");
console.log("   - API Server on http://localhost:3000");
console.log("   - Web UI on http://localhost:5173");

const isWin = process.platform === "win32";
const pnpmCmd = isWin ? "pnpm.cmd" : "pnpm";

const apiServer = spawn(pnpmCmd, ["run", "dev"], {
  cwd: path.resolve(rootDir, "artifacts/api-server"),
  stdio: "inherit",
  shell: isWin,
  env: { ...process.env, PORT: "3000", NODE_ENV: "development" },
});

const viteServer = spawn(pnpmCmd, ["run", "dev"], {
  cwd: path.resolve(rootDir, "artifacts/kanak-turnkey"),
  stdio: "inherit",
  shell: isWin,
  env: { ...process.env, PORT: "5173", BASE_PATH: "/" },
});

function cleanup() {
  console.log("\nShutting down servers...");
  apiServer.kill();
  viteServer.kill();
  process.exit();
}

process.on("SIGINT", cleanup);
process.on("SIGTERM", cleanup);

apiServer.on("error", (err) => {
  console.error("API Server process error:", err);
});

viteServer.on("error", (err) => {
  console.error("Vite Server process error:", err);
});
