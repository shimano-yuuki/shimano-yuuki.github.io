import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Reveal } from "@/components/motion/Reveal";
import { CoverPlate } from "@/components/ui/CoverPlate";
import { Rule } from "@/components/ui/Rule";
import {
  formatDate,
  getWork,
  getWorkNeighbors,
  getWorks,
  renderBody,
  type Work,
} from "@/lib/content";

type Params = { slug: string };
type Props = { params: Promise<Params> };

export function generateStaticParams(): Params[] {
  return getWorks().map((work) => ({ slug: work.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const work = getWork(slug);

  if (!work) return { title: "Not Found" };

  const title = work.subtitle ? `${work.title} — ${work.subtitle}` : work.title;

  return {
    title: work.title,
    description: work.summary,
    openGraph: {
      type: "article",
      title,
      description: work.summary,
      url: `/works/${work.slug}`,
      publishedTime: work.date,
      images: work.cover ? [{ url: work.cover, alt: work.title }] : undefined,
    },
  };
}

/** 一覧と同じノンブルを事例ページでも使う。 */
function nombre(slug: string): string {
  const index = getWorks().findIndex((work) => work.slug === slug);
  return String(index + 1).padStart(2, "0");
}

export default async function WorkPage({ params }: Props) {
  const { slug } = await params;
  const work = getWork(slug);

  if (!work) notFound();

  const { html } = await renderBody(work.body);
  const { previous, next } = getWorkNeighbors(slug);
  const index = nombre(slug);

  return (
    <article className="spread pt-14 pb-28 sm:pt-20">
      {/* 1. 扉 */}
      <header>
        <Rule weight="double" />
        <div className="flex flex-wrap items-baseline justify-between gap-x-8 gap-y-2 pt-4">
          <span className="label text-vermilion">Case ({index})</span>
          <Link
            href="/works"
            className="label text-ink-faint transition-colors hover:text-vermilion"
          >
            ← Works
          </Link>
        </div>

        <h1 className="display mt-6 text-[clamp(2.5rem,1.4rem+6.5vw,6rem)] break-words">
          {work.title}
        </h1>

        {work.subtitle ? (
          <p className="jp-serif mt-4 text-base text-ink-muted sm:text-lg">
            {work.subtitle}
          </p>
        ) : null}

        <p className="mt-6 max-w-[38rem] border-t border-rule-faint pt-5 text-sm leading-relaxed text-ink-muted sm:text-base">
          {work.summary}
        </p>
      </header>

      {/* 2. カバー */}
      <Reveal className="mt-12">
        <CoverPlate
          src={work.cover || undefined}
          alt={work.title}
          label={work.title}
          index={index}
          priority
          sizes="(min-width: 1280px) 76rem, 100vw"
          className="aspect-[4/3] w-full sm:aspect-[16/9]"
        />
      </Reveal>

      {/* 3. 定型項目 */}
      <Reveal className="mt-16">
        <h2 className="label text-ink-faint">Specification</h2>
        <dl className="mt-4 border-t-[3px] border-rule">
          <SpecRow label="Role">
            {work.role.length > 0 ? (
              <span className="jp-serif">{work.role.join("／")}</span>
            ) : (
              <span className="text-ink-faint">—</span>
            )}
          </SpecRow>

          <SpecRow label="Stack">
            {work.stack.length > 0 ? (
              <ul className="flex flex-wrap gap-2">
                {work.stack.map((item) => (
                  <li
                    key={item}
                    className="label border border-rule-faint px-2 py-1 text-ink-muted"
                  >
                    {item}
                  </li>
                ))}
              </ul>
            ) : (
              <span className="text-ink-faint">—</span>
            )}
          </SpecRow>

          <SpecRow label="Date">
            <time dateTime={work.date} className="label text-ink">
              {formatDate(work.date)}
            </time>
          </SpecRow>

          {work.links.length > 0 ? (
            <SpecRow label="Links">
              <ul className="flex flex-wrap gap-x-5 gap-y-2">
                {work.links.map(([label, href]) => (
                  <li key={label}>
                    <a
                      href={href}
                      target="_blank"
                      rel="noreferrer noopener"
                      className="label text-vermilion underline decoration-1 underline-offset-4 transition-colors hover:bg-vermilion hover:text-paper hover:no-underline"
                    >
                      {label} ↗
                    </a>
                  </li>
                ))}
              </ul>
            </SpecRow>
          ) : null}
        </dl>
      </Reveal>

      {/* 4. 本文 */}
      <Reveal className="mt-20">
        <div
          className="prose max-w-[46rem]"
          dangerouslySetInnerHTML={{ __html: html }}
        />
      </Reveal>

      {/* 5. 図版 */}
      {work.gallery.length > 0 ? (
        <Reveal className="mt-24">
          <h2 className="label text-ink-faint">Gallery</h2>
          <ul className="mt-5 grid grid-cols-1 gap-6 sm:grid-cols-2">
            {work.gallery.map((src, i) => (
              <li
                key={src}
                className="relative aspect-[4/3] overflow-hidden border border-rule bg-paper-tint"
              >
                <Image
                  src={src}
                  alt={`${work.title} の図版 ${i + 1}`}
                  fill
                  sizes="(min-width: 640px) 50vw, 100vw"
                  className="object-cover"
                />
              </li>
            ))}
          </ul>
        </Reveal>
      ) : null}

      {/* 6. 前後ナビ */}
      <nav aria-label="前後の作品" className="mt-24 border-t-[3px] border-rule">
        <div className="grid grid-cols-1 sm:grid-cols-2">
          <NeighborCell work={previous} direction="prev" />
          <NeighborCell work={next} direction="next" />
        </div>
      </nav>

      {/* 7. 一覧へ戻る */}
      <div className="mt-16 border-t border-rule-faint pt-6 text-center">
        <Link
          href="/works"
          className="label inline-block border border-rule px-6 py-3 text-ink transition-colors hover:bg-vermilion hover:border-vermilion hover:text-paper"
        >
          ← Works 一覧へ戻る
        </Link>
      </div>
    </article>
  );
}

/* ==========================================================================
   部品
   ========================================================================== */

function SpecRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="grid grid-cols-1 gap-x-6 border-b border-rule-faint py-4 sm:grid-cols-[7rem_minmax(0,1fr)] sm:items-baseline">
      <dt className="label pt-0.5 text-ink-faint">{label}</dt>
      <dd className="mt-2 min-w-0 text-sm sm:mt-0">{children}</dd>
    </div>
  );
}

function NeighborCell({
  work,
  direction,
}: {
  work: Work | undefined;
  direction: "prev" | "next";
}) {
  const isNext = direction === "next";
  const alignment = isNext
    ? "sm:pl-6 sm:text-right sm:border-l sm:border-rule-faint"
    : "sm:pr-6";

  if (!work) {
    // 片方が無くても段が崩れないよう、空の枡を残しておく。
    return (
      <div className={`hidden py-6 sm:block ${alignment}`} aria-hidden="true">
        <span className="label text-ink-faint/50">
          {isNext ? "Next" : "Previous"}
        </span>
        <p className="jp-serif mt-2 text-sm text-ink-faint/50">—</p>
      </div>
    );
  }

  return (
    <Link
      href={`/works/${work.slug}`}
      className={`group block border-b border-rule-faint py-6 sm:border-b-0 ${alignment}`}
    >
      <span className="label text-vermilion">
        {isNext ? "Next →" : "← Previous"}
      </span>
      <p className="display mt-2 break-words text-2xl text-ink transition-colors group-hover:text-vermilion sm:text-3xl">
        {work.title}
      </p>
      {work.subtitle ? (
        <p className="jp-serif mt-1 text-xs text-ink-muted">{work.subtitle}</p>
      ) : null}
    </Link>
  );
}
