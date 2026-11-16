import { existsSync } from "node:fs";
import { join } from "node:path";
import type { CollectionEntry } from "astro:content";

export type Post = CollectionEntry<"posts">;

export function postPath(post: Post) {
  return `/posts/${post.id}/`;
}

export function sortByDate(posts: Post[]) {
  return [...posts].sort((a, b) => b.data.date.valueOf() - a.data.date.valueOf());
}

export function readingMinutes(post: Post) {
  const text = (post.body ?? "")
    .replace(/^import .*$/gm, "")
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/<[^>]+>/g, " ");
  const words = text.split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 230));
}

export function formatDate(date: Date, month: "long" | "short" = "long") {
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month,
    day: "numeric",
    timeZone: "UTC",
  });
}

export function ogImageFor(post: Post) {
  if (post.data.ogImage) return post.data.ogImage;
  const generated = `/og/${post.id}.png`;
  return existsSync(join(process.cwd(), "public", generated)) ? generated : "/og/default.png";
}
