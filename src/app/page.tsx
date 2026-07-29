import { AboutPreview } from "@/components/home/AboutPreview";
import { Contact } from "@/components/home/Contact";
import { Hero } from "@/components/home/Hero";
import { JournalPreview } from "@/components/home/JournalPreview";
import { WorksPreview } from "@/components/home/WorksPreview";
import { getFeaturedWorks, getRecentPosts } from "@/lib/content";

export default function Home() {
  return (
    <>
      <Hero />
      <WorksPreview works={getFeaturedWorks(4)} />
      <JournalPreview posts={getRecentPosts(3)} />
      <AboutPreview />
      <Contact />
    </>
  );
}
