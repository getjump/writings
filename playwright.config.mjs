import { defineConfig } from "@playwright/test";

const baseURL = process.env.BASE_URL;

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
    baseURL: baseURL ?? "http://localhost:4321",
    channel: process.env.PW_CHANNEL,
    viewport: { width: 1440, height: 900 },
  },
  webServer: baseURL ? undefined : {
    command: "npm run preview",
    port: 4321,
    reuseExistingServer: true,
  },
});
