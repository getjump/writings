import { defineConfig } from "astro/config";
import mdx from "@astrojs/mdx";
import sitemap from "@astrojs/sitemap";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import { remarkMermaid } from "./src/plugins/remark-mermaid.mjs";
import { remarkD2 } from "./src/plugins/remark-d2.mjs";

export default defineConfig({
  site: "https://getjump.me",
  integrations: [
    mdx(),
    sitemap({
      filter: (page) => !/\/(search|404)\/?$/.test(new URL(page).pathname),
    }),
  ],
  markdown: {
    shikiConfig: {
      theme: "github-light",
    },
    remarkPlugins: [remarkMath, remarkD2, remarkMermaid],
    rehypePlugins: [rehypeKatex],
  },
  image: {
    service: { entrypoint: "astro/assets/services/noop" },
  },
});
