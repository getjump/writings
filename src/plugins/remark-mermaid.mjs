import { visit } from "unist-util-visit";
import { chromium } from "playwright";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const virgilFont = readFileSync(join(__dirname, "fonts/Virgil.ttf"));
const excalifont = readFileSync(join(__dirname, "fonts/Excalifont.ttf"));

let browserPromise = null;
let pagePromise = null;

function getBrowser() {
  if (!browserPromise) {
    browserPromise = chromium.launch({ headless: true });
  }
  return browserPromise;
}

async function getConverterPage() {
  if (pagePromise) return pagePromise;

  pagePromise = (async () => {
    const browser = await getBrowser();
    const page = await browser.newPage();

    // Serve fonts locally via route interception
    await page.route("**/Virgil*", (route) =>
      route.fulfill({ body: virgilFont, contentType: "font/ttf" })
    );
    await page.route("**/Excalifont*", (route) =>
      route.fulfill({ body: excalifont, contentType: "font/ttf" })
    );

    // Use a real origin to avoid CORS issues
    await page.goto("data:text/html,<html></html>");

    await page.setContent(`
      <!DOCTYPE html><html><head>
        <style>
          @font-face {
            font-family: 'Virgil';
            src: url('/Virgil.ttf') format('truetype');
          }
          @font-face {
            font-family: 'Excalifont';
            src: url('/Excalifont.ttf') format('truetype');
          }
        </style>
        <script type="module">
          import { parseMermaidToExcalidraw } from "https://esm.sh/@excalidraw/mermaid-to-excalidraw@2";
          import { exportToSvg } from "https://esm.sh/@excalidraw/excalidraw@0.18.0?bundle-deps";

          // Force font loading
          await document.fonts.load("20px Virgil");
          await document.fonts.load("20px Excalifont");
          await document.fonts.ready;

          window.__convert = async (code) => {
            const { elements } = await parseMermaidToExcalidraw(code);
            const svg = await exportToSvg({
              elements,
              appState: {
                exportWithDarkMode: false,
                exportBackground: false,
                viewBackgroundColor: "transparent",
              },
              files: null,
            });
            return svg.outerHTML;
          };
          window.__ready = true;
        </script>
      </head>
      <body>
        <span style="font-family:Virgil">.</span>
        <span style="font-family:Excalifont">.</span>
      </body></html>
    `);

    await page.waitForFunction(() => window.__ready === true, { timeout: 45000 });
    return page;
  })();

  return pagePromise;
}

function metaToAttrs(meta) {
  if (!meta) return "";
  return meta
    .split(/\s+/)
    .filter((p) => p.includes("="))
    .map((p) => {
      const [key, ...rest] = p.split("=");
      const val = rest.join("=");
      return ` data-${key}="${val.replace(/"/g, "&quot;")}"`;
    })
    .join("");
}

export function remarkMermaid() {
  return async (tree) => {
    const mermaidNodes = [];

    visit(tree, "code", (node, index, parent) => {
      if (node.lang !== "mermaid") return;
      mermaidNodes.push({ node, index, parent });
    });

    if (mermaidNodes.length === 0) return;

    for (const { node, index, parent } of mermaidNodes) {
      const attrs = metaToAttrs(node.meta);
      let html;

      try {
        const page = await getConverterPage();
        const svg = await page.evaluate(
          async (code) => await window.__convert(code),
          node.value
        );
        if (svg) {
          html = `<div class="excalidraw-diagram"${attrs}>${svg}</div>`;
        }
      } catch (e) {
        // fall through
      }

      if (!html) {
        html = `<pre class="mermaid"${attrs}>${node.value}</pre>`;
      }

      parent.children.splice(index, 1, { type: "html", value: html });
    }

    if (browserPromise) {
      const browser = await browserPromise;
      await browser.close();
      browserPromise = null;
      pagePromise = null;
    }
  };
}
