import { chromium } from "playwright";
import { readFileSync, readdirSync, writeFileSync, mkdirSync } from "node:fs";
import { join, dirname, basename, extname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const postsDir = join(root, "src", "content", "posts");
const outDir = join(root, "public", "og");
mkdirSync(outDir, { recursive: true });

function frontmatter(file) {
  const text = readFileSync(file, "utf8");
  const block = text.match(/^---\n([\s\S]*?)\n---/);
  if (!block) return {};
  const data = {};
  for (const line of block[1].split("\n")) {
    const m = line.match(/^(\w+):\s*(.*)$/);
    if (m) data[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
  return data;
}

const plex = readFileSync(
  join(root, "node_modules", "@fontsource-variable", "ibm-plex-sans", "files", "ibm-plex-sans-latin-standard-normal.woff2"),
).toString("base64");
const fonts = `@font-face { font-family: "IBM Plex Sans Variable"; font-weight: 100 700; font-stretch: 75% 100%; src: url(data:font/woff2;base64,${plex}) format("woff2"); }`;

const escape = (s) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);

const mark = (size, ink, accent) => `
<svg width="${size}" height="${size}" viewBox="4 4 24 24">
  <path d="M7.5 23C9.5 7.5 20 7.5 23.5 19.5" fill="none" stroke="${ink}" stroke-width="2.4" stroke-linecap="round"/>
  <circle cx="7.5" cy="23.5" r="2.7" fill="${ink}"/>
  <circle cx="24" cy="23" r="3.7" fill="${accent}"/>
</svg>`;

function html({ title, footer }) {
  return `<!doctype html><html><head>
<style>
  ${fonts}
  * { margin: 0; box-sizing: border-box; }
  body { width: 1200px; height: 630px; background: #fafaf9; color: #1a1a1a; position: relative; overflow: hidden; font-family: "IBM Plex Sans Variable", sans-serif; }
  .card { position: absolute; inset: 64px 80px 56px; display: flex; flex-direction: column; }
  .brand { display: flex; align-items: center; gap: 16px; font-size: 28px; font-weight: 600; }
  .title { font-weight: 700; font-stretch: 85%; letter-spacing: -0.01em; line-height: 1; margin-top: auto; margin-bottom: auto; max-width: 940px; text-wrap: balance; }
  .foot { display: flex; justify-content: space-between; border-top: 3px solid #1a1a1a; padding-top: 20px; font-size: 24px; font-weight: 500; color: #555; }
  .arc { position: absolute; right: -150px; top: -170px; opacity: .07; }
</style></head><body>
  <div class="arc">${mark(620, "#1a1a1a", "#1a1a1a")}</div>
  <div class="card">
    <div class="brand">${mark(44, "#1a1a1a", "#2d4bc4")}Pavel Savinov</div>
    <h1 class="title">${escape(title)}</h1>
    <div class="foot"><span>${escape(footer)}</span><span>getjump.me</span></div>
  </div>
</body></html>`;
}

async function launch() {
  try {
    return await chromium.launch();
  } catch {
    return await chromium.launch({ channel: "chrome" });
  }
}

const cards = [
  {
    file: "default.png",
    title: "Notes on distributed systems, testing and building with AI agents",
    footer: "Senior backend engineer (Go), Belgrade",
  },
];

for (const name of readdirSync(postsDir)) {
  if (![".md", ".mdx"].includes(extname(name))) continue;
  const data = frontmatter(join(postsDir, name));
  if (!data.title) continue;
  const date = data.date ? new Date(`${data.date}T00:00:00Z`) : null;
  cards.push({
    file: `${basename(name, extname(name))}.png`,
    title: data.title,
    footer: date
      ? date.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric", timeZone: "UTC" })
      : "Writing",
  });
}

const only = process.argv.slice(2);
const browser = await launch();
const page = await browser.newPage({ viewport: { width: 1200, height: 630 } });

for (const card of cards) {
  if (only.length && !only.some((o) => card.file.includes(o))) continue;
  await page.setContent(html(card), { waitUntil: "load" });
  await page.evaluate(async () => {
    await document.fonts.ready;
    const title = document.querySelector(".title");
    const limit = 360;
    let size = 76;
    title.style.fontSize = `${size}px`;
    while (title.scrollHeight > limit && size > 40) {
      size -= 2;
      title.style.fontSize = `${size}px`;
    }
  });
  writeFileSync(join(outDir, card.file), await page.screenshot({ type: "png" }));
  console.log(`og/${card.file}`);
}

await browser.close();
