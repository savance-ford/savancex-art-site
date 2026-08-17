import { defineConfig, devices } from "@playwright/test";

const isCI = Boolean(process.env.CI);

export default defineConfig({
  testDir: "./tests",
  outputDir: "test-results",
  fullyParallel: false,
  workers: 1,
  forbidOnly: isCI,
  retries: isCI ? 1 : 0,
  reporter: [["list"], ["html", { open: "never" }]],
  timeout: 45_000,
  expect: {
    timeout: 8_000,
  },
  use: {
    ...devices["Desktop Chrome"],
    baseURL: "http://127.0.0.1:3100",
    colorScheme: "light",
    locale: "en-US",
    serviceWorkers: "block",
    screenshot: "only-on-failure",
    timezoneId: "America/Chicago",
    trace: "retain-on-failure",
    video: "off",
  },
  webServer: [
    {
      command:
        "npm run start -- --hostname 127.0.0.1 --port 3100",
      url: "http://127.0.0.1:3100",
      reuseExistingServer: !isCI,
      timeout: 120_000,
    },
    {
      command: "node reference-static/serve.mjs",
      url: "http://127.0.0.1:4173",
      reuseExistingServer: !isCI,
      timeout: 30_000,
    },
  ],
});
