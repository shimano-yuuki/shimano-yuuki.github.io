import Link from "next/link";
import { FadeIn } from "@/components/FadeIn";
import { formatDate, type Post } from "@/lib/content";

/**
 * 記録は日付とタイトルの行だけ。
 */
export function JournalList({ posts }: { posts: Post[] }) {
  if (posts.length === 0) return null;

  return (
    <section className="measure mt-20">
      <div className="mb-2 flex items-baseline justify-between gap-6">
        <h2 className="text-sm text-fg-faint">記録</h2>
        <Link
          href="/blog"
          className="text-sm text-fg-muted transition-colors hover:text-cyan"
        >
          すべて見る
        </Link>
      </div>

      <ul>
        {posts.map((post) => (
          <FadeIn as="li" key={post.slug} className="border-t border-line">
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
            </Link>
          </FadeIn>
        ))}
      </ul>
    </section>
  );
}
