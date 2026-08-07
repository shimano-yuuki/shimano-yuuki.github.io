import { GithubActivity } from "@/components/home/GithubActivity";
import { Hero } from "@/components/home/Hero";
import { JournalList } from "@/components/home/JournalList";
import { WorksSlideshow } from "@/components/home/WorksSlideshow";
import { WorksTable } from "@/components/home/WorksTable";
import { getRecentPosts, getWorks } from "@/lib/content";
import { getContributions, getRecentCommits } from "@/lib/github";

export default async function Home() {
  const works = getWorks();
  // GitHub の活動データはビルド時に取得する（失敗してもページは出る）
  const contributions = await getContributions();
  const commits = getRecentCommits(5);

  return (
    <>
      {/* 最上段は背景画つきのヘッダー。h1 はこの中にある */}
      <Hero />

      {/* その下に作品のスライドショー。featured の作品だけが流れる */}
      <WorksSlideshow
        works={works
          .filter((work) => work.featured)
          .map((work) => ({
            slug: work.slug,
            title: work.title,
            subtitle: work.subtitle,
            cover: work.cover,
            year: work.date.slice(0, 4),
          }))}
      />

      <WorksTable works={works} />
      <JournalList posts={getRecentPosts(5)} />

      {/* いちばん下に GitHub の草とこのサイトの更新履歴 */}
      <GithubActivity contributions={contributions} commits={commits} />
    </>
  );
}
