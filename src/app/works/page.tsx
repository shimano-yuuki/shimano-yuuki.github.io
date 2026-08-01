import type { Metadata } from "next";
import { getStackTags, getWorks } from "@/lib/content";
import { WorksList, type WorkListItem } from "./_components/WorksList";

export const metadata: Metadata = {
  title: "作品",
  description:
    "これまでにつくったアプリと Web の一覧。技術タグで絞り込んで、それぞれの事例ページから制作の背景と中身を読めます。",
};

export default function WorksPage() {
  const works = getWorks();
  const tags = getStackTags();

  const items: WorkListItem[] = works.map((work) => ({
    slug: work.slug,
    title: work.title,
    subtitle: work.subtitle,
    date: work.date,
    role: work.role,
    stack: work.stack,
  }));

  return (
    <div className="measure pt-28 pb-32 sm:pt-32 sm:pb-40">
      <header className="flex flex-wrap items-baseline gap-x-4">
        <h1 className="text-sm text-fg-faint">作品</h1>
        <p className="label text-fg-faint">{items.length} 件 — 新しい順</p>
      </header>

      <WorksList works={items} tags={tags} />
    </div>
  );
}
