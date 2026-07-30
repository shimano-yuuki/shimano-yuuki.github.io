import type { Metadata } from "next";
import Link from "next/link";
import { FadeIn } from "@/components/FadeIn";
import { formatDate, getPosts, getPostsByYear } from "@/lib/content";

export const metadata: Metadata = {
  title: "記録",
  description:
    "つくる途中で考えたことや、詰まったところの解き方を書き留めた記録。新しいものから年ごとに並べています。",
};

export default function BlogPage() {
  const posts = getPosts();
  const years = getPostsByYear();

  return (
    <div className="measure pt-32 pb-28 sm:pt-40 sm:pb-40">
      <header className="flex items-baseline justify-between gap-6">
        <h1 className="text-sm text-fg-faint">記録</h1>
        <p className="label text-fg-faint">{posts.length}本</p>
      </header>

      {years.length === 0 ? (
        <p className="mt-16 text-sm text-fg-muted">
          まだ記事がありません。最初の1本を準備しています。
        </p>
      ) : (
        years.map(({ year, posts: yearPosts }) => (
          <section key={year} className="mt-16 first:mt-10">
            <h2 className="mb-2 text-sm text-fg-faint">{year}</h2>

            <ul>
              {yearPosts.map((post) => (
                <FadeIn
                  as="li"
                  key={post.slug}
                  className="border-t border-line"
                >
                  <Link
                    href={`/blog/${post.slug}`}
                    className="group flex flex-wrap items-baseline gap-x-6 gap-y-1 py-4"
                  >
                    <time dateTime={post.date} className="label text-fg-faint">
                      {formatDate(post.date)}
                    </time>
                    <span className="transition-colors group-hover:text-cyan">
                      {post.title}
                    </span>
                    {post.tags.length > 0 ? (
                      <span className="label text-fg-faint">
                        {post.tags.join(" / ")}
                      </span>
                    ) : null}
                  </Link>
                </FadeIn>
              ))}
            </ul>
          </section>
        ))
      )}
    </div>
  );
}
