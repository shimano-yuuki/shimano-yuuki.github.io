import { getPosts } from "@/lib/content";
import { site } from "@/lib/site";

/**
 * RSS 2.0 のフィード。/feed.xml で配る。
 * ビルド時に一度だけ生成する（記事は Markdown なので実行時に変わらない）。
 */
export const dynamic = "force-static";

const base = site.url.replace(/\/$/, "");

/** 最新何件を載せるか。 */
const FEED_LIMIT = 20;

/** XML の実体参照。& を最初に置き換えないと二重エスケープになる。 */
function escapeXml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

/** YYYY-MM-DD を RFC 822 の日付にする。 */
function toRfc822(date: string): string {
  return new Date(`${date}T00:00:00Z`).toUTCString();
}

export async function GET(): Promise<Response> {
  const posts = getPosts().slice(0, FEED_LIMIT);

  const lastBuildDate = toRfc822(
    posts[0]?.date ?? new Date().toISOString().slice(0, 10),
  );

  const items = posts
    .map((post) => {
      const url = `${base}/blog/${post.slug}`;
      return [
        "    <item>",
        `      <title>${escapeXml(post.title)}</title>`,
        `      <link>${escapeXml(url)}</link>`,
        `      <guid isPermaLink="true">${escapeXml(url)}</guid>`,
        `      <pubDate>${toRfc822(post.date)}</pubDate>`,
        `      <description>${escapeXml(post.excerpt)}</description>`,
        "    </item>",
      ].join("\n");
    })
    .join("\n");

  const xml = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">',
    "  <channel>",
    `    <title>${escapeXml(`${site.fullName} — Journal`)}</title>`,
    `    <link>${escapeXml(`${base}/blog`)}</link>`,
    `    <description>${escapeXml(site.description)}</description>`,
    "    <language>ja</language>",
    `    <lastBuildDate>${lastBuildDate}</lastBuildDate>`,
    `    <atom:link href="${escapeXml(`${base}/feed.xml`)}" rel="self" type="application/rss+xml" />`,
    items,
    "  </channel>",
    "</rss>",
    "",
  ]
    .filter((line) => line.length > 0)
    .join("\n");

  return new Response(xml, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, max-age=0, s-maxage=3600",
    },
  });
}
