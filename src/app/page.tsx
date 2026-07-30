import { JournalList } from "@/components/home/JournalList";
import { Plate } from "@/components/home/Plate";
import { WorksTable } from "@/components/home/WorksTable";
import { getRecentPosts, getWorks } from "@/lib/content";
import { site } from "@/lib/site";

export default function Home() {
  return (
    <>
      <h1 className="sr-only">
        {site.fullName} — {site.role}
      </h1>

      <div className="measure">
        <Plate />
      </div>

      <WorksTable works={getWorks()} />
      <JournalList posts={getRecentPosts(5)} />
    </>
  );
}
