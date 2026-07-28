import type { Metadata } from "next";
import Link from "next/link";
import { Reveal } from "@/components/motion/Reveal";
import { Rule } from "@/components/ui/Rule";
import {
  formatDate,
  getPosts,
  getPostsByYear,
  getPostTags,
} from "@/lib/content";
import { TagRow } from "./_components/TagRow";

export const metadata: Metadata = {
  title: "Journal",
  description:
    "つくる途中で考えたことや、詰まったところの解き方を書き留めた記録の索引。年ごとにまとめています。",
};

export default function JournalPage() {
  const posts = getPosts();
  const years = getPostsByYear();
  const tags = getPostTags();

  return (
    <div className="spread py-12 sm:py-16">
      {/* 扉 */}
      <Reveal as="header">
        <Rule weight="double" />
        <div className="flex flex-wrap items-end justify-between gap-x-8 gap-y-3 pt-6">
          <h1 className="flex flex-wrap items-end gap-x-5 gap-y-1">
            <span className="display text-[clamp(3rem,13vw,7rem)]">
              Journal
            </span>
            <span className="jp-serif pb-1 text-sm text-ink-muted sm:text-base">
              記録
            </span>
          </h1>
          <p className="label pb-2 text-ink-faint">
            {String(posts.length).padStart(2, "0")} Entries
          </p>
        </div>
        <p className="jp-serif mt-6 max-w-[36rem] text-ink-muted">
          つくる途中で考えたこと、詰まったところ、その解き方を書き留めています。
          新しいものから順に、年ごとにまとめた索引です。
        </p>
      </Reveal>

      {/* 索引の見出し語 */}
      {tags.length > 0 ? (
        <Reveal
          as="section"
          className="mt-10 flex flex-wrap items-baseline gap-x-6 gap-y-2 border-t border-rule-faint pt-4"
        >
          <h2 className="label text-ink-faint">Topics</h2>
          <TagRow tags={tags} />
        </Reveal>
      ) : null}

      {years.length === 0 ? (
        <div className="mt-14 border-y border-rule-faint py-20 text-center">
          <p className="label text-ink-faint">No Entries Yet</p>
          <p className="jp-serif mt-4 text-ink-muted">
            まだ記事がありません。最初の1本を準備しています。
          </p>
        </div>
      ) : (
        <div className="mt-14 sm:mt-20">
          {years.map(({ year, posts: yearPosts }) => (
            <section
              key={year}
              className="mt-14 first:mt-0 md:grid md:grid-cols-[7rem_minmax(0,1fr)] md:gap-10 lg:grid-cols-[11rem_minmax(0,1fr)]"
            >
              {/* 年。広い画面では読み進めるあいだ左に残す。 */}
              <div className="md:sticky md:top-24 md:self-start">
                <h2 className="display text-4xl text-ink lg:text-6xl">
                  {year}
                </h2>
                <p className="label mt-2 text-ink-faint">
                  {String(yearPosts.length).padStart(2, "0")} Entries
                </p>
              </div>

              <Reveal
                as="ul"
                stagger
                className="mt-5 border-t border-rule md:mt-0"
              >
                {yearPosts.map((post) => (
                  <li key={post.slug} className="border-b border-rule-faint">
                    <Link
                      href={`/blog/${post.slug}`}
                      className="group block py-6 sm:py-7"
                    >
                      <time
                        dateTime={post.date}
                        className="label text-vermilion"
                      >
                        {formatDate(post.date)}
                      </time>
                      <h3 className="jp-serif mt-2 text-xl leading-snug transition-colors group-hover:text-vermilion sm:text-2xl">
                        {post.title}
                      </h3>
                      <p className="mt-3 max-w-[42rem] text-sm text-ink-muted">
                        {post.excerpt}
                      </p>
                      <TagRow tags={post.tags} className="mt-4" />
                    </Link>
                  </li>
                ))}
              </Reveal>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
