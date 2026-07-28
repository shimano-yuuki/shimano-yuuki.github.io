import { AboutPreview } from "@/components/home/AboutPreview";
import { Contact } from "@/components/home/Contact";
import { Hero } from "@/components/home/Hero";
import { JournalPreview } from "@/components/home/JournalPreview";
import { WorksPreview } from "@/components/home/WorksPreview";
import { getFeaturedWorks, getRecentPosts } from "@/lib/content";

export default function Home() {
  const works = getFeaturedWorks(4);
  const posts = getRecentPosts(3);

  return (
    <>
      <Hero lead={works[0]} />
      <WorksPreview works={works} />
      <JournalPreview posts={posts} />
      <AboutPreview />
      <Contact />
    </>
  );
}
