import Link from "next/link";
import { Reveal } from "@/components/motion/Reveal";
import { SectionHead } from "@/components/ui/SectionHead";
import { formatDate, type Post } from "@/lib/content";

/**
 * トップの記録欄。索引らしく、罫線で区切った行として積む。
 */
export function JournalPreview({ posts }: { posts: Post[] }) {
  if (posts.length === 0) return null;

  return (
    <section className="spread py-14">
      <SectionHead
        index="02"
        title="Journal"
        titleJa="記録"
        action={{ label: "All Entries", href: "/blog" }}
      />

      <Reveal as="ul" stagger className="mt-8">
        {posts.map((post) => (
          <li key={post.slug} className="border-b border-rule-faint">
            <Link
              href={`/blog/${post.slug}`}
              className="group grid gap-x-6 gap-y-1 py-5 md:grid-cols-12 md:items-baseline"
            >
              <span className="label text-ink-faint md:col-span-2">
                {formatDate(post.date)}
              </span>

              <h3 className="jp-serif text-lg transition-colors group-hover:text-vermilion md:col-span-5">
                {post.title}
              </h3>

              <p className="text-sm leading-relaxed text-ink-muted md:col-span-4">
                {post.excerpt}
              </p>

              <span className="label text-ink-faint transition-colors group-hover:text-vermilion md:col-span-1 md:text-right">
                Read →
              </span>
            </Link>
          </li>
        ))}
      </Reveal>
    </section>
  );
}
