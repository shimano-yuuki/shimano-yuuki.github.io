import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import { cache } from "react";
import { z } from "zod";
import { extractHeadings, renderMarkdown, type Heading } from "./markdown";

const CONTENT_ROOT = path.join(process.cwd(), "content");

/* ==========================================================================
   スキーマ
   frontmatter の書き間違いはビルド時に落とす。
   ========================================================================== */

const dateString = z
  .string()
  .or(z.date())
  .transform((value) =>
    value instanceof Date ? value.toISOString().slice(0, 10) : value,
  )
  .refine((value) => /^\d{4}-\d{2}-\d{2}$/.test(value), {
    message: "date は YYYY-MM-DD 形式で書いてください",
  });

const workSchema = z.object({
  title: z.string(),
  subtitle: z.string().optional(),
  summary: z.string(),
  date: dateString,
  role: z.array(z.string()).default([]),
  stack: z.array(z.string()).default([]),
  cover: z.string().optional(),
  gallery: z.array(z.string()).default([]),
  links: z
    .record(z.string(), z.string())
    .default({})
    .transform((value) =>
      Object.entries(value).filter(([, href]) => href.length > 0),
    ),
  featured: z.boolean().default(false),
  order: z.number().default(999),
  draft: z.boolean().default(false),
});

const postSchema = z.object({
  title: z.string(),
  date: dateString,
  tags: z.array(z.string()).default([]),
  excerpt: z.string(),
  cover: z.string().optional(),
  draft: z.boolean().default(false),
});

export type Work = z.output<typeof workSchema> & { slug: string; body: string };
export type Post = z.output<typeof postSchema> & { slug: string; body: string };

/* ==========================================================================
   読み込み
   ========================================================================== */

type Collection = "works" | "blog";

function readCollection<T>(
  collection: Collection,
  schema: z.ZodType<T>,
): (T & { slug: string; body: string })[] {
  const dir = path.join(CONTENT_ROOT, collection);
  if (!fs.existsSync(dir)) return [];

  return fs
    .readdirSync(dir)
    .filter((file) => file.endsWith(".md") || file.endsWith(".mdx"))
    .map((file) => {
      const raw = fs.readFileSync(path.join(dir, file), "utf8");
      const { data, content } = matter(raw);
      const parsed = schema.safeParse(data);

      if (!parsed.success) {
        throw new Error(
          `content/${collection}/${file} の frontmatter が不正です:\n` +
            parsed.error.issues
              .map((issue) => `  - ${issue.path.join(".")}: ${issue.message}`)
              .join("\n"),
        );
      }

      return {
        ...parsed.data,
        slug: file.replace(/\.mdx?$/, ""),
        body: content,
      };
    });
}

/** 下書きは開発中だけ見えるようにする。 */
const includeDrafts = process.env.NODE_ENV === "development";

const loadWorks = cache((): Work[] =>
  readCollection("works", workSchema)
    .filter((work) => includeDrafts || !work.draft)
    .sort((a, b) => a.order - b.order || b.date.localeCompare(a.date)),
);

const loadPosts = cache((): Post[] =>
  readCollection("blog", postSchema)
    .filter((post) => includeDrafts || !post.draft)
    .sort((a, b) => b.date.localeCompare(a.date)),
);

/* ==========================================================================
   作品
   ========================================================================== */

export function getWorks(): Work[] {
  return loadWorks();
}

export function getFeaturedWorks(limit = 4): Work[] {
  const featured = loadWorks().filter((work) => work.featured);
  return (featured.length > 0 ? featured : loadWorks()).slice(0, limit);
}

export function getWork(slug: string): Work | undefined {
  return loadWorks().find((work) => work.slug === slug);
}

/** 作品ページ下部の「前の作品 / 次の作品」用。 */
export function getWorkNeighbors(slug: string) {
  const works = loadWorks();
  const index = works.findIndex((work) => work.slug === slug);
  return {
    previous: index > 0 ? works[index - 1] : undefined,
    next: index >= 0 && index < works.length - 1 ? works[index + 1] : undefined,
  };
}

/** 作品の絞り込みに使う技術タグ。使用数の多い順。 */
export function getStackTags(): string[] {
  const counts = new Map<string, number>();
  for (const work of loadWorks()) {
    for (const item of work.stack) {
      counts.set(item, (counts.get(item) ?? 0) + 1);
    }
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([tag]) => tag);
}

/* ==========================================================================
   記事
   ========================================================================== */

export function getPosts(): Post[] {
  return loadPosts();
}

export function getRecentPosts(limit = 3): Post[] {
  return loadPosts().slice(0, limit);
}

export function getPost(slug: string): Post | undefined {
  return loadPosts().find((post) => post.slug === slug);
}

export function getPostNeighbors(slug: string) {
  const posts = loadPosts();
  const index = posts.findIndex((post) => post.slug === slug);
  return {
    // 一覧は新しい順なので、配列の次が「古い記事」になる
    newer: index > 0 ? posts[index - 1] : undefined,
    older: index >= 0 && index < posts.length - 1 ? posts[index + 1] : undefined,
  };
}

/** 年でまとめた索引。/blog の一覧に使う。 */
export function getPostsByYear(): { year: string; posts: Post[] }[] {
  const groups = new Map<string, Post[]>();
  for (const post of loadPosts()) {
    const year = post.date.slice(0, 4);
    groups.set(year, [...(groups.get(year) ?? []), post]);
  }
  return [...groups.entries()]
    .sort((a, b) => b[0].localeCompare(a[0]))
    .map(([year, posts]) => ({ year, posts }));
}

export function getPostTags(): string[] {
  const tags = new Set<string>();
  for (const post of loadPosts()) {
    for (const tag of post.tags) tags.add(tag);
  }
  return [...tags].sort((a, b) => a.localeCompare(b, "ja"));
}

/* ==========================================================================
   本文
   ========================================================================== */

export async function renderBody(
  body: string,
): Promise<{ html: string; headings: Heading[] }> {
  const [html, headings] = await Promise.all([
    renderMarkdown(body),
    Promise.resolve(extractHeadings(body)),
  ]);
  return { html, headings };
}

/** 誌面の日付表記は 2026.07.29 で統一する。 */
export function formatDate(date: string): string {
  return date.replaceAll("-", ".");
}
