import Link from "next/link";
import { Reveal } from "@/components/motion/Reveal";
import { formatDate, type Work } from "@/lib/content";

/**
 * トップの作品欄。
 * カードを並べるのではなく、全幅の大きな行として積む。
 * ホバーで行がわずかに右へ動き、作品名が白へ抜ける。
 */
export function WorksPreview({ works }: { works: Work[] }) {
  if (works.length === 0) return null;

  return (
    <section className="measure py-28 sm:py-40">
      <div className="flex items-baseline justify-between gap-6 border-b border-line pb-5">
        <h2 className="label text-fg-faint">Selected Works</h2>
        <Link
          href="/works"
          className="label underline-sweep text-fg-muted transition-colors hover:text-fg"
        >
          All Works
        </Link>
      </div>

      <Reveal as="ul" stagger>
        {works.map((work, index) => (
          <li key={work.slug} className="border-b border-line">
            <Link
              href={`/works/${work.slug}`}
              className="group block py-10 transition-transform duration-700 ease-[var(--ease-out-expo)] hover:translate-x-2 sm:py-14"
            >
              <div className="flex items-baseline gap-4 sm:gap-8">
                <span className="label shrink-0 text-fg-faint">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <h3 className="display text-[clamp(2.25rem,8vw,6rem)] text-fg-muted transition-colors duration-500 group-hover:text-fg">
                  {work.title}
                </h3>
              </div>

              <div className="mt-5 grid gap-3 pl-0 sm:grid-cols-12 sm:pl-16">
                <p className="text-sm leading-relaxed text-fg-muted sm:col-span-6">
                  {work.summary}
                </p>
                <div className="flex flex-wrap items-start gap-x-4 gap-y-1 sm:col-span-4">
                  {work.stack.map((item) => (
                    <span key={item} className="label text-fg-faint">
                      {item}
                    </span>
                  ))}
                </div>
                <span className="label text-fg-faint sm:col-span-2 sm:text-right">
                  {formatDate(work.date)}
                </span>
              </div>
            </Link>
          </li>
        ))}
      </Reveal>
    </section>
  );
}
