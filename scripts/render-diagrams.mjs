/**
 * Pre-build: mermaid code blocks → Excalidraw SVG files.
 * Uses Playwright + esm.sh for browser-side rendering.
 *
 * Usage: node scripts/render-diagrams.mjs
 */

import { chromium } from "playwright";
import { readFileSync, writeFileSync, mkdirSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { createServer } from "http";
import { globSync } from "glob";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const CONTENT_DIR = join(ROOT, "src/content/posts");
const OUTPUT_DIR = join(ROOT, "public/diagrams");
const FONTS_DIR = join(ROOT, "src/plugins/fonts");

const virgilFont = readFileSync(join(FONTS_DIR, "Virgil.ttf"));
const excalifont = readFileSync(join(FONTS_DIR, "Excalifont.ttf"));

const CONVERTER_JS = `
import { parseMermaidToExcalidraw } from "https://esm.sh/@excalidraw/mermaid-to-excalidraw@2";
import { exportToSvg } from "https://esm.sh/@excalidraw/excalidraw@0.18.0?bundle-deps";

await document.fonts.load("20px Virgil");
await document.fonts.load("20px Excalifont");
await document.fonts.ready;

window.__convert = async (code) => {
  const { elements } = await parseMermaidToExcalidraw(code);
  const svg = await exportToSvg({
    elements,
    appState: { exportWithDarkMode: false, exportBackground: false, viewBackgroundColor: "transparent" },
    files: null,
  });
  return svg.outerHTML;
};
window.__ready = true;
`;

const CONVERTER_HTML = `<!DOCTYPE html><html><head>
<style>
  @font-face { font-family: 'Virgil'; src: url('/fonts/Virgil.ttf') format('truetype'); }
  @font-face { font-family: 'Excalifont'; src: url('/fonts/Excalifont.ttf') format('truetype'); }
</style>
</head>
<body>
<span style="font-family:Virgil">.</span>
<span style="font-family:Excalifont">.</span>
<script type="module" src="/converter.mjs"></script>
</body></html>`;

function startServer(port) {
  return new Promise((resolve) => {
    const server = createServer((req, res) => {
      if (req.url === "/fonts/Virgil.ttf") {
        res.writeHead(200, { "Content-Type": "font/ttf", "Access-Control-Allow-Origin": "*" });
        res.end(virgilFont);
      } else if (req.url === "/fonts/Excalifont.ttf") {
        res.writeHead(200, { "Content-Type": "font/ttf", "Access-Control-Allow-Origin": "*" });
        res.end(excalifont);
      } else if (req.url === "/converter.mjs") {
        res.writeHead(200, { "Content-Type": "application/javascript" });
        res.end(CONVERTER_JS);
      } else {
        res.writeHead(200, { "Content-Type": "text/html" });
        res.end(CONVERTER_HTML);
      }
    });
    server.listen(port, () => resolve(server));
  });
}

function extractMermaidBlocks(content) {
  const blocks = [];
  const regex = /```mermaid\n([\s\S]*?)```/g;
  let match;
  while ((match = regex.exec(content)) !== null) {
    blocks.push({ full: match[0], code: match[1].trim(), index: blocks.length });
  }
  return blocks;
}

async function main() {
  mkdirSync(OUTPUT_DIR, { recursive: true });

  const files = globSync("**/*.mdx", { cwd: CONTENT_DIR, absolute: true });
  if (!files.length) { console.log("No MDX files."); return; }

  const allBlocks = [];
  for (const file of files) {
    const content = readFileSync(file, "utf-8");
    const blocks = extractMermaidBlocks(content);
    if (blocks.length) {
      const slug = file.split("/").pop().replace(".mdx", "");
      allBlocks.push({ file, slug, content, blocks });
    }
  }

  const total = allBlocks.reduce((s, f) => s + f.blocks.length, 0);
  if (!total) { console.log("No mermaid blocks."); return; }
  console.log(`Found ${total} mermaid diagrams.\n`);

  const PORT = 18924;
  const server = await startServer(PORT);

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  page.on("pageerror", (e) => console.error("  Browser error:", e.message));

  await page.goto(`http://localhost:${PORT}`, { waitUntil: "networkidle" });
  await page.waitForFunction(() => window.__ready === true, { timeout: 60000 });
  console.log("Converter ready.\n");

  let converted = 0, failed = 0;

  for (const { file, slug, content, blocks } of allBlocks) {
    let updatedContent = content;

    for (const block of blocks) {
      const baseName = `${slug}-diagram-${block.index}`;
      const svgPath = join(OUTPUT_DIR, `${baseName}.svg`);

      try {
        process.stdout.write(`  ${baseName}... `);
        const svg = await page.evaluate(
          async (code) => await window.__convert(code),
          block.code
        );
        writeFileSync(svgPath, svg);

        const imgTag = `<img src="/diagrams/${baseName}.svg" alt="Diagram" class="excalidraw-diagram" />`;
        updatedContent = updatedContent.replace(block.full, imgTag);
        converted++;
        console.log(`✓ (${(svg.length / 1024).toFixed(1)}KB)`);
      } catch (e) {
        failed++;
        console.log(`✗ ${e.message?.split("\n")[0]}`);
      }
    }

    writeFileSync(file, updatedContent);
  }

  await browser.close();
  server.close();
  console.log(`\n${converted} converted, ${failed} failed.`);
}

main().catch(console.error);
