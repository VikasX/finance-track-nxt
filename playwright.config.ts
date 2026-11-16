/*
 * playwright.config.ts
 * Controls the existing browser suite. It starts a production app on port 3100, chooses an installed browser, and stores failure artifacts under ignored .local files.
 * Beginner syntax: @/ means src/ (tsconfig paths); import type is compile-time only.
 */
// Import the existing Playwright test/assertion tools (or browser Page type). Assertions wait for UI conditions rather than assuming rendering is immediate.
import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "./tests",
  // Run the existing browser cases sequentially with one worker, limiting resource usage and making local failure output easier to follow.
  fullyParallel: false,
  workers: 1,
  timeout: 45000,
  expect: { timeout: 10000 },
  reporter: "list",
  outputDir: ".local/test-results",
  use: {
    baseURL: "http://127.0.0.1:3100",
    // An environment override wins; Windows defaults to installed Edge. This selects a test browser, not the browser used by app visitors.
    channel:
      process.env.PLAYWRIGHT_CHANNEL ??
      (process.platform === "win32" ? "msedge" : undefined),
    headless: true,
    viewport: { width: 1440, height: 1000 },
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
  },
  // Playwright starts the built app here (npm run build must happen first). Reuse an existing local server outside CI; CI requires a clean owned process.
  webServer: {
    command: "npm run start -- --hostname 127.0.0.1 --port 3100",
    url: "http://127.0.0.1:3100",
    reuseExistingServer: !process.env.CI,
    timeout: 60000,
  },
});
