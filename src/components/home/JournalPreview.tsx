import Link from "next/link";
import { Reveal } from "@/components/motion/Reveal";
import { formatDate, type Post } from "@/lib/content";

export function JournalPreview({ posts }: { posts: Post[] }) {
  if (posts.length === 0) return null;

  return (
    <section className="measure py-28 sm:py-36">
      <div className="flex items-baseline justify-between gap-6 border-b border-line pb-5">
        <h2 className="label text-fg-faint">Journal</h2>
        <Link
          href="/blog"
          className="label underline-sweep text-fg-muted transition-colors hover:text-fg"
        >
          All Entries
        </Link>
      </div>

      <Reveal as="ul" stagger>
        {posts.map((post) => (
          <li key={post.slug} className="border-b border-line">
            <Link
              href={`/blog/${post.slug}`}
              className="group grid gap-x-8 gap-y-2 py-8 transition-transform duration-700 ease-[var(--ease-out-expo)] hover:translate-x-2 md:grid-cols-12 md:items-baseline"
            >
              <time
                dateTime={post.date}
                className="label text-fg-faint md:col-span-2"
              >
                {formatDate(post.date)}
              </time>

              <h3 className="display-soft text-xl text-fg-muted transition-colors duration-500 group-hover:text-fg md:col-span-5 md:text-2xl">
                {post.title}
              </h3>

              <p className="text-sm leading-relaxed text-fg-muted md:col-span-5">
                {post.excerpt}
              </p>
            </Link>
          </li>
        ))}
      </Reveal>
    </section>
  );
}
