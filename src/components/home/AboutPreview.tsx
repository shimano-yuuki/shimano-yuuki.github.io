import Link from "next/link";
import { Reveal } from "@/components/motion/Reveal";
import { site } from "@/lib/site";

export function AboutPreview() {
  return (
    <section className="measure py-28 sm:py-36">
      <Reveal className="grid gap-10 md:grid-cols-12">
        <h2 className="label text-fg-faint md:col-span-3">About</h2>

        <div className="md:col-span-8 md:col-start-5">
          <p className="display-soft text-[clamp(1.5rem,3.4vw,2.75rem)] text-fg">
            モバイルアプリを Flutter で、
            <br />
            Web を TypeScript でつくっています。
          </p>

          <p className="mt-8 max-w-xl leading-loose text-fg-muted">
            完成したものを並べるだけでなく、途中で何を考え、どこで詰まったかも
            一緒に残すようにしています。あとから自分が読み返したときに、
            一番役に立つのがそこだからです。
          </p>

          <Link
            href="/about"
            className="label underline-sweep mt-10 inline-block text-fg transition-opacity hover:opacity-70"
          >
            {site.fullName} について
          </Link>
        </div>
      </Reveal>
    </section>
  );
}
