import { test, expect } from "@playwright/test";

const posts = [
  "/posts/01-protondb-compatibility-ml-x-claude",
  "/posts/02-detector-before-protocol",
];

async function readGraph(page) {
  const scripts = await page.locator('script[type="application/ld+json"]').allTextContents();
  return scripts.flatMap((script) => JSON.parse(script)["@graph"]);
}

test.use({ javaScriptEnabled: false });

test("public profile is readable without JavaScript and matches its JSON export", async ({ page, request }) => {
  const response = await request.get("/cv.json");
  expect(response.status()).toBe(200);
  expect(response.headers()["content-type"]).toContain("application/json");
  const cv = await response.json();

  const html = await page.goto("/hire");
  expect(html.status()).toBe(200);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(cv.basics.name);
  await expect(page.locator("main")).toContainText(cv.basics.summary);
  await expect(page.locator("main")).toContainText("Belgrade, Serbia");
  for (const role of cv.work) {
    await expect(page.getByRole("heading", { name: role.name, exact: true })).toBeVisible();
    for (const highlight of role.highlights) {
      await expect(page.locator("main")).toContainText(highlight);
    }
  }
  for (const project of cv.projects) {
    await expect(page.getByRole("link", { name: project.name, exact: true })).toHaveAttribute("href", project.url);
  }

  const graph = await readGraph(page);
  const person = graph.find((node) => node["@type"] === "Person");
  const profilePage = graph.find((node) => node["@type"] === "ProfilePage");
  expect(person.name).toBe(cv.basics.name);
  expect(person.email).toBe(cv.basics.email);
  expect(person.sameAs).toEqual(cv.basics.profiles.map((entry) => entry.url));
  expect(profilePage.mainEntity["@id"]).toBe(person["@id"]);
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", cv.basics.url);
  await expect(page.locator('link[rel="alternate"][type="application/json"]')).toHaveAttribute("href", "/cv.json");
  await expect(page.getByRole("link", { name: cv.basics.email })).toHaveAttribute("href", `mailto:${cv.basics.email}`);
});

test("JSON export contains public professional fields and historical employment", async ({ request }) => {
  const cv = await (await request.get("/cv.json")).json();
  expect(cv.basics.email).toBe("contact@getjump.me");
  expect(cv.basics.location).toEqual({ city: "Belgrade", countryCode: "RS" });
  const privateKeys = ["phone", "address", "postalCode", "birthDate", "citizenship", "passport", "visa", "variants", "_note"];
  const inspect = (value) => {
    if (value === null || typeof value !== "object") return;
    for (const [key, child] of Object.entries(value)) {
      expect(privateKeys, `private field ${key} must not be exported`).not.toContain(key);
      inspect(child);
    }
  };
  inspect(cv);
  for (const role of cv.work) {
    expect(role.startDate).toMatch(/^\d{4}-\d{2}$/);
    expect(role.endDate).toMatch(/^\d{4}-\d{2}$/);
    expect(role.endDate >= role.startDate).toBe(true);
  }
  expect(JSON.stringify(cv)).not.toContain(".raw/");
  expect(JSON.stringify(cv)).not.toContain("wiki/");
});

for (const post of posts) {
  test(`article author and publication metadata resolve to the same identity: ${post}`, async ({ page, request }) => {
    await page.goto(post);
    const graph = await readGraph(page);
    const person = graph.find((node) => node["@type"] === "Person");
    const article = graph.find((node) => node["@type"] === "BlogPosting");
    expect(article.author["@id"]).toBe(person["@id"]);
    expect(article.datePublished).toBe(await page.locator(".article-meta time").getAttribute("datetime"));
    expect(article.url).toBe(await page.locator('link[rel="canonical"]').getAttribute("href"));
    expect(article.headline).toBe((await page.getByRole("heading", { level: 1 }).textContent()).trim());
    await expect(page.locator(".article-meta").getByRole("link", { name: person.name })).toHaveAttribute("href", "/hire/");
    expect((await request.get(new URL(article.image).pathname)).status()).toBe(200);
    expect(person).not.toHaveProperty("worksFor");
  });
}

test("site navigation and About expose the canonical profile", async ({ page, request }) => {
  const cv = await (await request.get("/cv.json")).json();
  for (const route of ["/", "/about", "/search"]) {
    await page.goto(route);
    await expect(page.getByRole("navigation", { name: "Main" }).getByRole("link", { name: "Hire me" })).toHaveAttribute("href", "/hire/");
  }
  await page.goto("/about");
  await expect(page.locator("main")).toContainText(cv.basics.summary);
  const person = (await readGraph(page)).find((node) => node["@type"] === "Person");
  expect(person.url).toBe(cv.basics.url);
  expect(person.email).toBe(cv.basics.email);
  expect((await request.get("/cv.pdf")).status()).toBe(200);
});

test("robots and sitemap expose profile and articles", async ({ request }) => {
  const robots = await request.get("/robots.txt");
  expect(robots.status()).toBe(200);
  expect(await robots.text()).toContain("Sitemap: https://getjump.me/sitemap-index.xml");
  expect(await robots.text()).not.toContain("Disallow: /");
  const index = await request.get("/sitemap-index.xml");
  expect(index.status()).toBe(200);
  const locations = [...(await index.text()).matchAll(/<loc>(.*?)<\/loc>/g)].map((match) => match[1]);
  expect(locations.length).toBeGreaterThan(0);
  const entries = [];
  for (const location of locations) {
    const response = await request.get(new URL(location).pathname);
    expect(response.status()).toBe(200);
    entries.push(await response.text());
  }
  const sitemap = entries.join("\n");
  expect(sitemap).toContain("https://getjump.me/hire/");
  for (const post of posts) expect(sitemap).toContain(`https://getjump.me${post}/`);
});

for (const width of [320, 390, 1440]) {
  test(`profile has no horizontal overflow at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/hire");
    const sizes = await page.evaluate(() => ({
      content: document.documentElement.scrollWidth,
      viewport: document.documentElement.clientWidth,
    }));
    expect(sizes.content).toBeLessThanOrEqual(sizes.viewport);
    await expect(page.getByRole("navigation").getByRole("link", { name: "Hire me" })).toBeVisible();
  });
}
