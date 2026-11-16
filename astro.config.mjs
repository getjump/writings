import { defineConfig } from "astro/config";
import mdx from "@astrojs/mdx";
import sitemap from "@astrojs/sitemap";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import { remarkMermaid } from "./src/plugins/remark-mermaid.mjs";
import { remarkD2 } from "./src/plugins/remark-d2.mjs";
import { readdirSync, readFileSync } from "node:fs";

const postsDir = new URL("./src/content/posts/", import.meta.url);
const postLastmod = new Map(
  readdirSync(postsDir)
    .filter((file) => /\.mdx?$/.test(file))
    .map((file) => {
      const front = readFileSync(new URL(file, postsDir), "utf8").split(/^---$/m)[1] ?? "";
      const field = (name) => front.match(new RegExp(`^${name}:\\s*["']?([0-9-]+)`, "m"))?.[1];
      const date = field("updated") ?? field("date");
      return [`/posts/${file.replace(/\.mdx?$/, "")}/`, date && new Date(date).toISOString()];
    })
    .filter(([, date]) => date),
);

export default defineConfig({
  site: "https://getjump.me",
  integrations: [
    mdx(),
    sitemap({
      filter: (page) => !/\/(search|404)\/?$/.test(new URL(page).pathname),
      serialize(item) {
        const lastmod = postLastmod.get(new URL(item.url).pathname);
        return lastmod ? { ...item, lastmod } : item;
      },
    }),
  ],
  markdown: {
    shikiConfig: {
      themes: {
        light: "github-light-high-contrast",
        dark: "github-dark-high-contrast",
      },
    },
    remarkPlugins: [remarkMath, remarkD2, remarkMermaid],
    rehypePlugins: [rehypeKatex],
  },
  image: {
    service: { entrypoint: "astro/assets/services/noop" },
  },
});
