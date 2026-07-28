import { Reveal } from "@/components/motion/Reveal";
import { SectionHead } from "@/components/ui/SectionHead";
import { getFeaturedWorks, getRecentPosts } from "@/lib/content";

export default function Home() {
  const works = getFeaturedWorks();
  const posts = getRecentPosts();

  return (
    <div className="spread py-16">
      <Reveal>
        <SectionHead index="01" title="Selected Works" titleJa="作品" />
        <ul className="mt-6">
          {works.map((work) => (
            <li key={work.slug}>{work.title}</li>
          ))}
        </ul>
      </Reveal>
      <Reveal className="mt-16">
        <SectionHead index="02" title="Journal" titleJa="記録" />
        <ul className="mt-6">
          {posts.map((post) => (
            <li key={post.slug}>{post.title}</li>
          ))}
        </ul>
      </Reveal>
    </div>
  );
}
