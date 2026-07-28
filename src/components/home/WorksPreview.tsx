import Link from "next/link";
import { Reveal } from "@/components/motion/Reveal";
import { CoverPlate } from "@/components/ui/CoverPlate";
import { SectionHead } from "@/components/ui/SectionHead";
import { formatDate, type Work } from "@/lib/content";

/**
 * トップの作品欄。均等グリッドにせず、偶数番目を下げて誌面の非対称さを出す。
 */
export function WorksPreview({ works }: { works: Work[] }) {
  if (works.length === 0) return null;

  return (
    <section className="spread py-14">
      <SectionHead
        index="01"
        title="Selected Works"
        titleJa="作品"
        action={{ label: "All Works", href: "/works" }}
      />

      <Reveal as="ul" stagger className="mt-10 grid gap-x-10 gap-y-14 sm:grid-cols-2">
        {works.map((work, index) => (
          <li key={work.slug} className={index % 2 === 1 ? "sm:mt-16" : ""}>
            <Link href={`/works/${work.slug}`} className="group block">
              <CoverPlate
                src={work.cover || undefined}
                alt={`${work.title} のカバー`}
                label={work.title}
                index={String(index + 1).padStart(2, "0")}
                sizes="(min-width: 640px) 45vw, 100vw"
                className={`transition-transform duration-500 ease-[var(--ease-paper)] group-hover:-translate-y-1 ${
                  index % 2 === 1 ? "aspect-4/5" : "aspect-3/2"
                }`}
              />

              <div className="mt-4 flex items-baseline gap-3">
                <span className="label text-vermilion">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <h3 className="jp-serif text-xl transition-colors group-hover:text-vermilion">
                  {work.title}
                </h3>
                {work.subtitle ? (
                  <span className="label text-ink-faint">{work.subtitle}</span>
                ) : null}
              </div>

              <p className="mt-2 text-sm leading-relaxed text-ink-muted">
                {work.summary}
              </p>

              <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-rule-faint pt-2">
                <span className="label text-ink-faint">
                  {formatDate(work.date)}
                </span>
                {work.stack.map((item) => (
                  <span key={item} className="label text-ink-faint">
                    {item}
                  </span>
                ))}
              </div>
            </Link>
          </li>
        ))}
      </Reveal>
    </section>
  );
}
