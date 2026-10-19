import { defineConfig, devices } from "@playwright/test";

const isCI = Boolean(process.env.CI);

export default defineConfig({
  testDir: "./e2e",
  timeout: 60_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  workers: 1,
  retries: isCI ? 2 : 0,
  reporter: isCI ? [["github"], ["list"]] : [["list"]],
  use: {
    baseURL: "http://localhost:1420",
    viewport: { width: 1320, height: 880 },
    colorScheme: "light",
    reducedMotion: "reduce",
    // Use the installed Chrome locally; CI installs Playwright's Chromium.
    channel: isCI ? undefined : "chrome",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: {
    command: "pnpm dev",
    url: "http://localhost:1420",
    reuseExistingServer: !isCI,
    timeout: 120_000,
  },
});
