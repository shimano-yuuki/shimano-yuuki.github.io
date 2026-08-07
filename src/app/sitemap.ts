import type { MetadataRoute } from "next";
import { getPosts, getWorks } from "@/lib/content";
import { site } from "@/lib/site";

/** 末尾のスラッシュを落として site.url と繋ぐ。 */
const base = site.url.replace(/\/$/, "");

export default function sitemap(): MetadataRoute.Sitemap {
  const works = getWorks();
  const posts = getPosts();

  /** 一覧ページの lastModified は、その中で一番新しいコンテンツの日付にする。 */
  const latest = (dates: string[]): string | undefined =>
    dates.length > 0 ? dates.reduce((a, b) => (a > b ? a : b)) : undefined;

  const now = new Date();

  const staticPages: MetadataRoute.Sitemap = [
    {
      url: `${base}/`,
      lastModified:
        latest([...works, ...posts].map((item) => item.date)) ?? now,
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: `${base}/blog`,
      lastModified: latest(posts.map((post) => post.date)) ?? now,
      changeFrequency: "weekly",
      priority: 0.8,
    },
    {
      url: `${base}/about`,
      lastModified: now,
      changeFrequency: "yearly",
      priority: 0.6,
    },
  ];

  const workPages: MetadataRoute.Sitemap = works.map((work) => ({
    url: `${base}/works/${work.slug}`,
    lastModified: work.date,
    changeFrequency: "yearly",
    priority: 0.7,
  }));

  const postPages: MetadataRoute.Sitemap = posts.map((post) => ({
    url: `${base}/blog/${post.slug}`,
    lastModified: post.date,
    changeFrequency: "yearly",
    priority: 0.6,
  }));

  return [...staticPages, ...workPages, ...postPages];
}

/** 静的書き出し（output: "export"）でこのルートを事前生成するため。 */
export const dynamic = "force-static";
