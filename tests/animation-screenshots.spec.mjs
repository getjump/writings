import { test, expect } from "@playwright/test";

const POST = "/posts/01-protondb-compatibility-ml-x-claude";

// Helper: scroll to a data-phase element and wait for transitions
async function scrollToPhase(page, index) {
  const span = page.locator("[data-phase]").nth(index);
  await span.scrollIntoViewIfNeeded();
  // Wait for CSS transitions to complete (longest transition is 0.5s)
  await page.waitForTimeout(700);
}

// Helper: scroll to a heading by text
async function scrollToHeading(page, text) {
  const heading = page.locator(`h2, h3`, { hasText: text }).first();
  await heading.scrollIntoViewIfNeeded();
  await page.waitForTimeout(700);
}

// Helper: wait for mermaid to render
async function waitForMermaid(page) {
  await page.waitForFunction(
    () => document.querySelectorAll(".mermaid svg").length > 0,
    { timeout: 10000 }
  ).catch(() => {}); // OK if no mermaid
}

test.describe("F1 Timeline animation states", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(POST, { waitUntil: "networkidle" });
    await waitForMermaid(page);
    await page.waitForTimeout(500);
  });

  test("hidden before phases", async ({ page }) => {
    // Scroll to top — timeline should not be visible
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForTimeout(300);

    const timeline = page.locator("#f1-timeline");
    await expect(timeline).toHaveCSS("opacity", "0");
  });

  test("Phase 1 — first node appears", async ({ page }) => {
    await scrollToPhase(page, 0);

    await expect(page).toHaveScreenshot("f1-phase-1.png", {
      clip: { x: 1050, y: 250, width: 390, height: 400 },
    });
  });

  test("Phase 3 — three nodes, line grows", async ({ page }) => {
    // Scroll through phases 1 and 2 first so they reveal
    await scrollToPhase(page, 0);
    await scrollToPhase(page, 1);
    await scrollToPhase(page, 2);

    await expect(page).toHaveScreenshot("f1-phase-3.png", {
      clip: { x: 1050, y: 250, width: 390, height: 400 },
    });
  });

  test("Phase 5 — all nodes revealed", async ({ page }) => {
    // Scroll through all phases
    for (let i = 0; i < 5; i++) {
      await scrollToPhase(page, i);
    }

    await expect(page).toHaveScreenshot("f1-phase-5.png", {
      clip: { x: 1050, y: 250, width: 390, height: 400 },
    });
  });

  test("hidden after phases section", async ({ page }) => {
    // Scroll well past the phases
    await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
    await page.waitForTimeout(700);

    const timeline = page.locator("#f1-timeline");
    // Should fade out after leaving phase zone
    const opacity = await timeline.evaluate((el) => getComputedStyle(el).opacity);
    expect(parseFloat(opacity)).toBeLessThan(0.5);
  });
});

test.describe("ToC scroll highlighting", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(POST, { waitUntil: "networkidle" });
    await page.waitForTimeout(500);
  });

  test("highlights 'The problem' when scrolled there", async ({ page }) => {
    await scrollToHeading(page, "The problem");

    await expect(page).toHaveScreenshot("toc-the-problem.png", {
      clip: { x: 0, y: 80, width: 250, height: 600 },
    });
  });

  test("highlights 'Everything we tried' when scrolled there", async ({ page }) => {
    await scrollToHeading(page, "Everything we tried");

    await expect(page).toHaveScreenshot("toc-everything.png", {
      clip: { x: 0, y: 80, width: 250, height: 600 },
    });
  });
});

test.describe("Callout and Collapsible states", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(POST, { waitUntil: "networkidle" });
    await page.waitForTimeout(500);
  });

  test("TL;DR callout renders", async ({ page }) => {
    const callout = page.locator("aside").filter({ hasText: "TL;DR" }).first();
    await callout.scrollIntoViewIfNeeded();
    await page.waitForTimeout(300);

    await expect(callout).toHaveScreenshot("callout-tldr.png");
  });

  test("collapsible closed state", async ({ page }) => {
    const details = page.locator("details").filter({ hasText: "didn't work" }).first();
    await details.scrollIntoViewIfNeeded();
    await page.waitForTimeout(300);

    await expect(details).toHaveScreenshot("collapsible-closed.png");
  });

  test("collapsible open state", async ({ page }) => {
    const details = page.locator("details").filter({ hasText: "didn't work" }).first();
    await details.scrollIntoViewIfNeeded();
    await page.waitForTimeout(300);

    // Open it
    await details.locator("summary").click();
    await page.waitForTimeout(500);

    await expect(details).toHaveScreenshot("collapsible-open.png");
  });
});

test.describe("Table enhancements", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(POST, { waitUntil: "networkidle" });
    await page.waitForTimeout(500);
  });

  test("ΔF1 values are color-coded", async ({ page }) => {
    const table = page.locator("table").filter({ hasText: "IRT game difficulty" }).first();
    await table.scrollIntoViewIfNeeded();
    await page.waitForTimeout(500);

    await expect(table).toHaveScreenshot("table-color-coded.png");
  });

  test("table sort changes on header click", async ({ page }) => {
    const table = page.locator("table").filter({ hasText: "IRT game difficulty" }).first();
    await table.scrollIntoViewIfNeeded();
    await page.waitForTimeout(300);

    // Click ΔF1 header to sort
    const header = table.locator("th").filter({ hasText: "ΔF1" });
    await header.click();
    await page.waitForTimeout(300);

    await expect(table).toHaveScreenshot("table-sorted.png");
  });
});

test.describe("Mermaid diagrams", () => {
  test("cascade diagram renders as SVG", async ({ page }) => {
    await page.goto(POST, { waitUntil: "networkidle" });
    await waitForMermaid(page);

    const mermaid = page.locator("pre.mermaid").first();
    await mermaid.scrollIntoViewIfNeeded();
    await page.waitForTimeout(1000);

    // Should contain rendered SVG
    const hasSvg = await mermaid.locator("svg").count();
    expect(hasSvg).toBeGreaterThan(0);

    await expect(mermaid).toHaveScreenshot("mermaid-cascade.png");
  });
});
