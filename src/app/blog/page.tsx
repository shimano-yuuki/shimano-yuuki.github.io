import type { Metadata } from "next";
import { Reveal } from "@/components/motion/Reveal";
import { SplitHeading } from "@/components/motion/SplitHeading";
import { getPosts, getPostsByYear, getPostTags } from "@/lib/content";
import { PostRow } from "./_components/PostRow";
import { TagRow } from "./_components/TagRow";

export const metadata: Metadata = {
  title: "Journal",
  description:
    "つくる途中で考えたことや、詰まったところの解き方を書き留めた記録。新しいものから年ごとに並べています。",
};

export default function JournalPage() {
  const posts = getPosts();
  const years = getPostsByYear();
  const tags = getPostTags();

  return (
    <div className="measure pt-32 pb-28 sm:pt-40 sm:pb-40">
      {/* 扉。ページに入ってまず出会うのは、この一語だけでいい。 */}
      <header>
        <div className="flex items-baseline justify-between gap-6">
          <p className="label text-fg-faint">Journal — 記録</p>
          <p className="label text-fg-faint">
            {String(posts.length).padStart(2, "0")} Entries
          </p>
        </div>

        <SplitHeading
          as="h1"
          lines={["Journal"]}
          className="display mt-5 text-[clamp(3.5rem,13vw,12rem)] sm:mt-6"
        />

        <div className="mt-12 flex flex-col gap-10 border-t border-line pt-10 sm:mt-16 sm:flex-row sm:items-start sm:justify-between sm:gap-16">
          <Reveal delay={0.1}>
            <p className="max-w-[34rem] text-sm leading-loose text-fg-muted">
              つくる途中で考えたこと、詰まったところ、その解き方を書き留めています。
              新しいものから順に、年ごとに並べた記録です。
            </p>
          </Reveal>

          {tags.length > 0 ? (
            <Reveal delay={0.2} className="sm:max-w-[24rem]">
              <p className="label text-fg-faint">Topics</p>
              <TagRow tags={tags} tone="muted" className="mt-4" />
            </Reveal>
          ) : null}
        </div>
      </header>

      {years.length === 0 ? (
        <div className="py-32 text-center sm:py-40">
          <p className="display text-3xl text-fg-muted">No Entries Yet</p>
          <p className="mt-5 text-sm text-fg-faint">
            まだ記事がありません。最初の1本を準備しています。
          </p>
        </div>
      ) : (
        years.map(({ year, posts: yearPosts }) => (
          <section
            key={year}
            className="mt-20 first:mt-16 sm:mt-32 sm:first:mt-24"
          >
            {/* 年は数字そのものを標識として大きく置く。囲みは持たせない。 */}
            <Reveal className="flex items-baseline gap-5">
              <h2 className="display text-[clamp(3rem,11vw,7rem)] text-fg-faint">
                {year}
              </h2>
              <p className="label text-fg-faint">
                {String(yearPosts.length).padStart(2, "0")} Entries
              </p>
            </Reveal>

            <Reveal as="ul" stagger className="mt-2 sm:mt-4">
              {yearPosts.map((post, index) => (
                <PostRow key={post.slug} post={post} index={index + 1} />
              ))}
            </Reveal>
          </section>
        ))
      )}
    </div>
  );
}
