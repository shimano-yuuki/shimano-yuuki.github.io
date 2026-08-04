import { Hero } from "@/components/home/Hero";
import { JournalList } from "@/components/home/JournalList";
import { WorksSlideshow } from "@/components/home/WorksSlideshow";
import { WorksTable } from "@/components/home/WorksTable";
import { getRecentPosts, getWorks } from "@/lib/content";

export default function Home() {
  const works = getWorks();

  return (
    <>
      {/* 最上段は名前と自己紹介のヘッダー。h1 はこの中にある */}
      <div className="measure">
        <Hero />
      </div>

      {/* その下に作品のスライドショー。数秒ごとに移り変わり、押すと詳細へ */}
      <WorksSlideshow
        works={works.map((work) => ({
          slug: work.slug,
          title: work.title,
          subtitle: work.subtitle,
          cover: work.cover,
          year: work.date.slice(0, 4),
        }))}
      />

      <WorksTable works={works} />
      <JournalList posts={getRecentPosts(5)} />
    </>
  );
}
