import { chromium } from "playwright";
import { readFileSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const pub = join(root, "public");
const svg = readFileSync(join(pub, "favicon.svg"), "utf8");
const fullBleed = svg.replace(/rx="[^"]*"/, 'rx="0"');

async function launch() {
  try {
    return await chromium.launch();
  } catch {
    return await chromium.launch({ channel: "chrome" });
  }
}

const browser = await launch();
const page = await browser.newPage();

async function png(source, size) {
  await page.setViewportSize({ width: size, height: size });
  const src = "data:image/svg+xml;base64," + Buffer.from(source).toString("base64");
  await page.setContent(
    `<html><body style="margin:0;background:transparent"><img src="${src}" width="${size}" height="${size}" style="display:block"></body></html>`,
  );
  await page.locator("img").evaluate((img) => img.decode());
  return page.screenshot({ omitBackground: true, clip: { x: 0, y: 0, width: size, height: size } });
}

function ico(images) {
  const header = Buffer.alloc(6 + 16 * images.length);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(images.length, 4);
  let offset = header.length;
  images.forEach(({ size, data }, i) => {
    const e = 6 + 16 * i;
    header.writeUInt8(size >= 256 ? 0 : size, e);
    header.writeUInt8(size >= 256 ? 0 : size, e + 1);
    header.writeUInt16LE(1, e + 4);
    header.writeUInt16LE(32, e + 6);
    header.writeUInt32LE(data.length, e + 8);
    header.writeUInt32LE(offset, e + 12);
    offset += data.length;
  });
  return Buffer.concat([header, ...images.map((image) => image.data)]);
}

const icoSizes = [16, 32, 48];
const icoImages = [];
for (const size of icoSizes) icoImages.push({ size, data: await png(svg, size) });
writeFileSync(join(pub, "favicon.ico"), ico(icoImages));
writeFileSync(join(pub, "apple-touch-icon.png"), await png(fullBleed, 180));
writeFileSync(join(pub, "icon-192.png"), await png(svg, 192));
writeFileSync(join(pub, "icon-512.png"), await png(svg, 512));

await browser.close();
console.log("icons written to public/");
