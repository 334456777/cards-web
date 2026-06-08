import { defineCollection, z } from "astro:content";
import { glob } from "astro/loaders";
import { fileURLToPath } from "node:url";
import path from "node:path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/* ── 花色集合 ── */
const suits = defineCollection({
  loader: glob({ pattern: "*.json", base: path.join(__dirname, "content/suits") }),
  schema: z.object({
    cn: z.string(),
    sym: z.string(),
    cls: z.enum(["r", "k"]),
    accent: z.string(),
    latin: z.string(),
    yy: z.string(),
    group: z.string(),
    keys: z.string(),
    short: z.string(),
    pos: z.string(),
    neg: z.string(),
    tags: z.array(z.string()),
    lede: z.string(),
    posH: z.string(),
    negH: z.string(),
    combos: z.array(z.array(z.string())),
  }),
});

/* ── 数字层级集合 ── */
const ranks = defineCollection({
  loader: glob({ pattern: "*.json", base: path.join(__dirname, "content/ranks") }),
  schema: z.object({
    cn: z.string(),
    latin: z.string(),
    label: z.string(),
    group: z.string(),
    pos: z.string(),
    neg: z.string(),
  }),
});

/* ── 精选组合集合 ── */
const combinations = defineCollection({
  loader: glob({ pattern: "*.json", base: path.join(__dirname, "content/combinations") }),
  schema: z.object({
    suits: z.array(z.string()),
    name: z.string(),
    yy: z.string(),
    pos: z.string(),
    neg: z.string(),
    tag: z.string().optional(),
    warn: z.boolean().optional(),
  }),
});

export const collections = { suits, ranks, combinations };
