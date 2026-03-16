import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests",
  timeout: 30000,
  expect: {
    toHaveScreenshot: {
      maxDiffPixelRatio: 0.01, // 1% pixel diff tolerance
      animations: "allow",     // keep animations running — we test their state
    },
  },
  use: {
    baseURL: "http://localhost:4321",
    viewport: { width: 1440, height: 900 },
  },
  webServer: {
    command: "npm run preview",
    port: 4321,
    reuseExistingServer: true,
  },
});
