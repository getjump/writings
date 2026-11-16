import { test, expect } from "@playwright/test";

test.use({ colorScheme: "dark" });

test("theme is resolved in the head before the body renders", async ({ request }) => {
  const html = await (await request.get("/")).text();
  const head = html.slice(0, html.indexOf("</head>"));
  expect(head).toContain("root.dataset.theme = theme");
});

test("theme follows the system until the toggle overrides it", async ({ page }) => {
  await page.goto("/");
  const root = page.locator("html");
  const body = page.locator("body");
  const toggle = page.getByRole("button", { name: "Dark theme" });

  await expect(root).toHaveAttribute("data-theme", "dark");
  await expect(toggle).toHaveAttribute("aria-pressed", "true");
  await expect(body).toHaveCSS("background-color", "rgb(22, 22, 21)");

  await toggle.click();
  await expect(root).toHaveAttribute("data-theme", "light");
  await expect(toggle).toHaveAttribute("aria-pressed", "false");
  await expect(body).toHaveCSS("background-color", "rgb(250, 250, 249)");
  await expect(page.locator('meta[name="theme-color"]')).toHaveAttribute("content", "#fafaf9");

  await page.reload();
  await expect(root).toHaveAttribute("data-theme", "light");

  await toggle.click();
  await expect(root).toHaveAttribute("data-theme", "dark");
  expect(await page.evaluate(() => localStorage.getItem("theme"))).toBeNull();
});
