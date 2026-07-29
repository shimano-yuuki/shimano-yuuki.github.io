import type { Metadata } from "next";
import { Reveal } from "@/components/motion/Reveal";
import { SplitHeading } from "@/components/motion/SplitHeading";
import { formatDate, getStackTags, getWorks } from "@/lib/content";
import { WorksIndex, type WorkCardItem } from "./_components/WorksIndex";

export const metadata: Metadata = {
  title: "Works",
  description:
    "これまでにつくったアプリと Web の一覧。技術タグで絞り込んで、それぞれの事例ページから制作の背景と中身を読めます。",
};

export default function WorksPage() {
  const works = getWorks();
  const tags = getStackTags();

  // 通し番号は絞り込んでも動かさない。作品に振った固定の番号として扱う。
  const items: WorkCardItem[] = works.map((work, i) => ({
    slug: work.slug,
    index: String(i + 1).padStart(2, "0"),
    title: work.title,
    subtitle: work.subtitle,
    summary: work.summary,
    stack: work.stack,
    date: work.date,
    dateLabel: formatDate(work.date),
    cover: work.cover,
  }));

  // 収録年。作品が無いときは何も出さない。
  const latestYear = works
    .map((work) => work.date.slice(0, 4))
    .sort()
    .at(-1);

  return (
    <div className="measure pt-36 pb-40 sm:pt-44 sm:pb-56">
      {/* 扉 */}
      <header className="mb-28 md:mb-36">
        <Reveal>
          <div className="flex flex-wrap items-baseline justify-between gap-x-10 gap-y-2">
            <span className="label text-fg-muted">Index</span>
            <span className="label text-fg-faint">
              {String(items.length).padStart(2, "0")} Works
              {latestYear ? ` — ${latestYear}` : ""}
            </span>
          </div>
        </Reveal>

        <SplitHeading
          as="h1"
          lines={["Works"]}
          className="display mt-8 text-[clamp(4rem,17vw,13rem)]"
        />

        <Reveal delay={0.15}>
          <div className="mt-12 max-w-[34rem]">
            <p className="text-base text-fg">つくったものと、その裏側の記録。</p>
            <p className="mt-5 text-sm leading-relaxed text-fg-muted">
              モバイルアプリと Web
              を中心に、企画から実装まで手を動かしたものを並べています。
              気になる技術があれば、下のタグで絞り込んでください。
            </p>
          </div>
        </Reveal>
      </header>

      <WorksIndex works={items} tags={tags} />
    </div>
  );
}
