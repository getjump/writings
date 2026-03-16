import { test, expect } from "@playwright/test";
import { devices } from "./devices.mjs";

const POST = "/posts/01-protondb-compatibility-ml-x-claude";
const HOME = "/";

/**
 * Scroll positions to capture for the post.
 * Each entry: [label, scrollFn]
 */
const postSections = [
  ["top", async (page) => page.evaluate(() => window.scrollTo(0, 0))],
  ["tldr", async (page) => {
    const el = page.locator("aside").filter({ hasText: "TL;DR" }).first();
    await el.scrollIntoViewIfNeeded();
  }],
  ["mermaid", async (page) => {
    const el = page.locator("pre.mermaid").first();
    await el.scrollIntoViewIfNeeded();
  }],
  ["table", async (page) => {
    const el = page.locator("table").first();
    await el.scrollIntoViewIfNeeded();
  }],
  ["collapsible", async (page) => {
    const el = page.locator("details").first();
    await el.scrollIntoViewIfNeeded();
  }],
  ["formula", async (page) => {
    const el = page.locator(".katex").first();
    await el.scrollIntoViewIfNeeded();
  }],
  ["bottom", async (page) => {
    await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
  }],
];

for (const device of devices) {
  test.describe(`${device.name} (${device.width}x${device.height})`, () => {
    test.use({
      viewport: { width: device.width, height: device.height },
      isMobile: device.mobile,
    });

    // Home page
    test("home", async ({ page }) => {
      await page.goto(HOME, { waitUntil: "networkidle" });
      await page.waitForTimeout(500);
      await expect(page).toHaveScreenshot(`${device.name}-home.png`);
    });

    // Post sections
    for (const [label, scrollFn] of postSections) {
      test(`post-${label}`, async ({ page }) => {
        await page.goto(POST, { waitUntil: "networkidle" });
        await page.waitForTimeout(1000);
        await scrollFn(page);
        await page.waitForTimeout(700);
        await expect(page).toHaveScreenshot(`${device.name}-post-${label}.png`);
      });
    }
  });
}
