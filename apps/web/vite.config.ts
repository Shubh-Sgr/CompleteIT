import {fileURLToPath} from "node:url";
import {existsSync, readFileSync} from "node:fs";
import {resolve} from "node:path";
import {parse} from "dotenv";
import {defineConfig} from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig(({mode}) => {
  // Proxy settings stay on the build server; server secrets are never injected into browser code.
  const root = fileURLToPath(new URL("../../", import.meta.url));
  // Parse without changing NODE_ENV: the monorepo's .env selects development for
  // the API, but must not accidentally bundle development React into a production build.
  const fileEnv: Record<string, string> = {};
  for (const directory of [root, process.cwd()]) {
    for (const name of [".env", ".env.local", `.env.${mode}`, `.env.${mode}.local`]) {
      const path = resolve(directory, name);
      if (existsSync(path)) Object.assign(fileEnv, parse(readFileSync(path)));
    }
  }
  const env = {...fileEnv, ...process.env};
  const configuredApi = env.API_PROXY_ORIGIN ?? env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";
  const target = configuredApi.replace(/\/api\/v1\/?$/, "").replace(/\/$/, "");
  const proxy = {"/api/v1": {target, changeOrigin: true, timeout: 180_000, proxyTimeout: 180_000}};
  return {
    plugins: [react()],
    resolve: {alias: {"@": fileURLToPath(new URL("./", import.meta.url))}, dedupe: ["react", "react-dom"]},
    server: {port: 3000, strictPort: true, proxy},
    preview: {port: 3000, strictPort: true, proxy},
    build: {target: ["chrome111", "edge111", "firefox111", "safari16.4"]}
  };
});
