import { visit } from "unist-util-visit";
import { execFileSync } from "child_process";
import { writeFileSync, readFileSync, mkdirSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";
import { createHash } from "crypto";

const D2_BIN = process.env.D2_BIN || `${process.env.HOME}/.local/bin/d2`;
const THEME = 103;       // Earth Tones
const DARK_THEME = 200;  // Dark Mauve

export function remarkD2() {
  return (tree) => {
    const nodes = [];

    visit(tree, "code", (node, index, parent) => {
      if (node.lang !== "d2") return;
      nodes.push({ node, index, parent });
    });

    for (const { node, index, parent } of nodes) {
      const hash = createHash("md5").update(node.value).digest("hex").slice(0, 8);
      const tmpIn = join(tmpdir(), `d2-${hash}.d2`);
      const tmpOut = join(tmpdir(), `d2-${hash}.svg`);

      try {
        writeFileSync(tmpIn, node.value);

        execFileSync(D2_BIN, [
          "--sketch",
          `--theme=${THEME}`,
          tmpIn,
          tmpOut,
        ], { stdio: "pipe", timeout: 15000 });

        let svg = readFileSync(tmpOut, "utf-8");

        // Make background transparent: the first <rect> with fill-N7
        // is the SVG background. Replace its class to make it transparent.
        svg = svg.replace(
          /(<rect[^>]*class=")(\s*fill-N\d+)(")/,
          '$1$2$3 fill="transparent"'
        );
        // Override with a direct style attribute on the first rect
        svg = svg.replace(
          /(<rect[^>]*)(class="\s*fill-N\d+")/,
          '$1$2 style="fill:transparent"'
        );

        parent.children.splice(index, 1, {
          type: "html",
          value: `<div class="d2-diagram">${svg}</div>`,
        });
      } catch (e) {
        // On error, leave as code block
        console.error(`[remark-d2] Failed to render: ${e.message?.split("\n")[0]}`);
      }
    }
  };
}
