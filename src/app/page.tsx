import { Hero } from "@/components/home/Hero";
import { JournalList } from "@/components/home/JournalList";
import { WorksSlideshow } from "@/components/home/WorksSlideshow";
import { WorksTable } from "@/components/home/WorksTable";
import { getRecentPosts, getWorks } from "@/lib/content";
import { site } from "@/lib/site";

export default function Home() {
  const works = getWorks();

  return (
    <>
      <h1 className="sr-only">
        {site.fullName} — {site.role}
      </h1>

      {/* 主役。作品が数秒ごとに移り変わり、押すと詳細へ */}
      <WorksSlideshow
        works={works.map((work) => ({
          slug: work.slug,
          title: work.title,
          subtitle: work.subtitle,
          cover: work.cover,
          year: work.date.slice(0, 4),
        }))}
      />

      <div className="measure">
        <Hero />
      </div>

      <WorksTable works={works} />
      <JournalList posts={getRecentPosts(5)} />
    </>
  );
}
