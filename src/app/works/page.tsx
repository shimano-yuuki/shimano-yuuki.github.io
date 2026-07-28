import type { Metadata } from "next";
import { Reveal } from "@/components/motion/Reveal";
import { Rule } from "@/components/ui/Rule";
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

  // 通し番号は絞り込んでも動かさない。誌面のノンブルと同じ扱い。
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
    <div className="spread pt-14 pb-28 sm:pt-20">
      {/* 扉 */}
      <Reveal as="header">
        <Rule weight="double" />
        <div className="flex flex-wrap items-baseline justify-between gap-x-8 gap-y-2 pt-4">
          <span className="label text-vermilion">(Index)</span>
          <span className="label text-ink-faint">
            {items.length} Works
            {latestYear ? ` — ${latestYear}` : ""}
          </span>
        </div>

        <h1 className="display mt-6 text-[clamp(3rem,1.5rem+9vw,8rem)] break-words">
          Works
        </h1>

        <div className="mt-6 max-w-[36rem] border-t border-rule-faint pt-5">
          <p className="jp-serif text-base text-ink">
            つくったものと、その裏側の記録。
          </p>
          <p className="mt-3 text-sm leading-relaxed text-ink-muted">
            モバイルアプリと Web を中心に、企画から実装まで手を動かしたものを並べています。
            気になる技術があれば、下のタグで絞り込んでください。
          </p>
        </div>
      </Reveal>

      <WorksIndex works={items} tags={tags} />
    </div>
  );
}
