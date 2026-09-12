import {defineConfig,devices} from "@playwright/test";

// A dedicated port prevents silently testing a stale development server.
const port = Number(process.env.E2E_PORT ?? 3100);
export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  workers: 1,
  timeout: 45_000,
  use: {baseURL: `http://localhost:${port}`, trace: "retain-on-failure"},
  webServer: {
    command: `npm run ${process.env.E2E_PREVIEW === "1" ? "preview" : "dev"} -w @completeit/web -- --port ${port}`,
    url: `http://localhost:${port}`,
    reuseExistingServer: false,
    timeout: 120_000
  },
  projects: [
    {name: "chromium", use: {...devices["Desktop Chrome"]}},
    {name: "mobile", use: {...devices["Pixel 7"]}}
  ]
});
