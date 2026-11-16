import { test, expect } from "@playwright/test";

const posts = [
  "/posts/01-protondb-compatibility-ml-x-claude/",
  "/posts/02-detector-before-protocol/",
  "/posts/03-huntrole-fake-take-home/",
];

test("unknown paths return a real 404 that is not indexed", async ({ page }) => {
  const response = await page.goto("/no-such-page/");
  expect(response.status()).toBe(404);
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
  await expect(page.locator('link[rel="canonical"]')).toHaveCount(0);
});

test("robots.txt and sitemap are served as text and list only canonical pages", async ({ request }) => {
  const robots = await request.get("/robots.txt");
  expect(robots.headers()["content-type"]).toContain("text/plain");
  expect(await robots.text()).toContain("Sitemap: https://getjump.me/sitemap-index.xml");

  const sitemap = await (await request.get("/sitemap-0.xml")).text();
  for (const post of posts) expect(sitemap).toContain(`<loc>https://getjump.me${post}</loc>`);
  expect(sitemap).not.toContain("/search/");
  expect(sitemap).not.toContain("/404");
});

for (const post of posts) {
  test(`post has a per-post preview card and canonical URL: ${post}`, async ({ page, request }) => {
    await page.goto(post);
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", `https://getjump.me${post}`);
    await expect(page.locator('meta[property="og:url"]')).toHaveAttribute("content", `https://getjump.me${post}`);
    const title = await page.locator("h1").first().textContent();
    await expect(page.locator('meta[property="og:title"]')).toHaveAttribute("content", title.trim());
    const image = await page.locator('meta[property="og:image"]').getAttribute("content");
    expect(image).not.toContain("/og/default.png");
    const png = await request.get(new URL(image).pathname);
    expect(png.status()).toBe(200);
    expect(png.headers()["content-type"]).toBe("image/png");
  });
}

test("internal links point at canonical trailing-slash URLs", async ({ page }) => {
  for (const path of ["/", "/about/", "/hire/", ...posts]) {
    await page.goto(path);
    const hrefs = await page.locator('a[href^="/"]').evaluateAll((links) => links.map((a) => a.getAttribute("href")));
    const offenders = hrefs.filter((href) => !/\.[a-z]+$/.test(href) && !href.includes("#") && !href.endsWith("/"));
    expect(offenders, `links without trailing slash on ${path}`).toEqual([]);
  }
});

test("search page is excluded from the index", async ({ page }) => {
  await page.goto("/search/");
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
});
