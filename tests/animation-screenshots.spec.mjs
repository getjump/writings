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

test.describe("F1 Timeline animation states", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(POST, { waitUntil: "networkidle" });
    await page.waitForTimeout(500);
  });

  test("parked at the research loop before phases", async ({ page }) => {
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForTimeout(300);

    const timeline = page.locator("#f1-timeline");
    await expect(timeline).toHaveCSS("position", "absolute");
    await expect(timeline.locator(".f1tl-value")).toHaveText("0.000");
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

  test("parked at the end anchor after phases", async ({ page }) => {
    await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
    await page.waitForTimeout(700);

    const timeline = page.locator("#f1-timeline");
    await expect(timeline).toHaveCSS("position", "absolute");
    await expect(timeline.locator(".f1tl-value")).toHaveText("0.871");
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

test.describe("D2 diagrams", () => {
  test("cascade diagram renders as SVG", async ({ page }) => {
    await page.goto(POST, { waitUntil: "networkidle" });

    const diagram = page.locator(".d2-diagram").first();
    test.skip((await diagram.count()) === 0, "d2 binary not installed, diagram stays a code block");
    await diagram.scrollIntoViewIfNeeded();
    await page.waitForTimeout(500);

    expect(await diagram.locator("svg").count()).toBeGreaterThan(0);
    await expect(diagram).toHaveScreenshot("d2-cascade.png");
  });
});
