import Link from "next/link";
import { Reveal } from "@/components/motion/Reveal";
import { SectionHead } from "@/components/ui/SectionHead";
import { site } from "@/lib/site";

/**
 * トップの自己紹介欄。詳細は /about に逃がし、ここは導入の数行だけ。
 */
export function AboutPreview() {
  return (
    <section className="spread py-14">
      <SectionHead
        index="03"
        title="About"
        titleJa="自己紹介"
        action={{ label: "Profile", href: "/about" }}
      />

      <Reveal className="mt-10 grid gap-8 md:grid-cols-12">
        <div className="md:col-span-4">
          <p className="display text-4xl leading-none">{site.fullName}</p>
          <p className="jp-serif mt-2 text-sm text-ink-muted">
            {site.nameJa} — {site.role}
          </p>
        </div>

        <div className="md:col-span-7 md:col-start-6">
          <p className="jp-serif text-lg leading-loose">
            モバイルアプリを Flutter で、Web を TypeScript でつくっています。
          </p>
          <p className="mt-5 leading-loose text-ink-muted">
            完成したものを並べるだけでなく、途中で何を考え、どこで詰まったかも
            一緒に残すようにしています。あとから自分が読み返したときに、
            一番役に立つのがそこだからです。
          </p>
          <Link
            href="/about"
            className="label mt-6 inline-block border-b border-vermilion pb-1 text-vermilion"
          >
            もっと読む →
          </Link>
        </div>
      </Reveal>
    </section>
  );
}
