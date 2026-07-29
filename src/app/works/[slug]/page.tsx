import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Reveal } from "@/components/motion/Reveal";
import { SplitHeading } from "@/components/motion/SplitHeading";
import {
  formatDate,
  getWork,
  getWorkNeighbors,
  getWorks,
  renderBody,
  type Work,
} from "@/lib/content";
import { WorkPlate } from "../_components/WorkPlate";

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

/** 一覧と同じ通し番号を事例ページでも使う。 */
function serialOf(slug: string): string {
  const index = getWorks().findIndex((work) => work.slug === slug);
  return String(index + 1).padStart(2, "0");
}

export default async function WorkPage({ params }: Props) {
  const { slug } = await params;
  const work = getWork(slug);

  if (!work) notFound();

  const { html } = await renderBody(work.body);
  const { previous, next } = getWorkNeighbors(slug);
  const serial = serialOf(slug);

  return (
    <article className="measure pt-36 pb-40 sm:pt-44 sm:pb-56">
      {/* 1. 扉 */}
      <header>
        <Reveal>
          <div className="flex flex-wrap items-baseline justify-between gap-x-10 gap-y-2">
            <span className="label text-fg-muted">Case {serial}</span>
            <Link
              href="/works"
              className="label underline-sweep text-fg-faint transition-colors duration-500 hover:text-fg"
            >
              All Works
            </Link>
          </div>
        </Reveal>

        <SplitHeading
          as="h1"
          lines={[work.title]}
          className="display mt-8 break-words text-[clamp(2.75rem,11vw,8.5rem)]"
        />

        <Reveal delay={0.15}>
          <div className="mt-12 max-w-[38rem]">
            {work.subtitle ? (
              <p className="text-base text-fg sm:text-lg">{work.subtitle}</p>
            ) : null}
            <p className="mt-5 text-sm leading-relaxed text-fg-muted sm:text-base">
              {work.summary}
            </p>
          </div>
        </Reveal>
      </header>

      {/* 2. 面 */}
      <Reveal className="mt-20 sm:mt-28">
        <WorkPlate
          src={work.cover || undefined}
          title={work.title}
          index={serial}
          priority
          sizes="(min-width: 1280px) 84rem, 100vw"
          className="aspect-[4/3] w-full sm:aspect-[16/9]"
        />
      </Reveal>

      {/* 3. 定型項目。表組みにせず、ラベルと値を縦に積むだけにする。 */}
      <Reveal className="mt-20 sm:mt-28">
        <h2 className="sr-only">Specification</h2>
        <dl className="grid grid-cols-2 gap-x-10 gap-y-12 sm:grid-cols-4 sm:gap-x-12">
          <MetaItem label="Role">
            {work.role.length > 0 ? (
              <ul className="space-y-1.5">
                {work.role.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            ) : (
              <span className="text-fg-faint">—</span>
            )}
          </MetaItem>

          <MetaItem label="Stack">
            {work.stack.length > 0 ? (
              <ul className="space-y-1.5">
                {work.stack.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            ) : (
              <span className="text-fg-faint">—</span>
            )}
          </MetaItem>

          <MetaItem label="Date">
            <time dateTime={work.date}>{formatDate(work.date)}</time>
          </MetaItem>

          <MetaItem label="Links">
            {work.links.length > 0 ? (
              <ul className="space-y-1.5">
                {work.links.map(([label, href]) => (
                  <li key={label}>
                    <a
                      href={href}
                      target="_blank"
                      rel="noreferrer noopener"
                      className="underline-sweep inline-block text-fg transition-colors duration-500"
                    >
                      {label} ↗
                    </a>
                  </li>
                ))}
              </ul>
            ) : (
              <span className="text-fg-faint">—</span>
            )}
          </MetaItem>
        </dl>
      </Reveal>

      {/* 4. 本文 */}
      <Reveal className="mt-24 sm:mt-32">
        <div
          className="prose max-w-[46rem]"
          dangerouslySetInnerHTML={{ __html: html }}
        />
      </Reveal>

      {/* 5. 図版 */}
      {work.gallery.length > 0 ? (
        <Reveal className="mt-28 sm:mt-40">
          <h2 className="label text-fg-faint">Gallery</h2>
          <ul className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 sm:gap-8">
            {work.gallery.map((src, i) => (
              <li
                key={src}
                className="relative aspect-[4/3] overflow-hidden bg-surface-raised"
              >
                <Image
                  src={src}
                  alt={`${work.title} の図版 ${i + 1}`}
                  fill
                  sizes="(min-width: 640px) 50vw, 100vw"
                  className="object-cover grayscale brightness-90 transition-all duration-700 ease-[var(--ease-out-expo)] hover:brightness-110"
                />
              </li>
            ))}
          </ul>
        </Reveal>
      ) : null}

      {/* 6. 前後ナビ */}
      <nav
        aria-label="前後の作品"
        className="mt-32 border-t border-line sm:mt-44"
      >
        <div className="grid grid-cols-1 sm:grid-cols-2">
          <NeighborCell work={previous} direction="prev" />
          <NeighborCell work={next} direction="next" />
        </div>
      </nav>

      {/* 7. 一覧へ戻る */}
      <div className="mt-20">
        <Link
          href="/works"
          className="label underline-sweep inline-block text-fg-muted transition-colors duration-500 hover:text-fg"
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

function MetaItem({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="min-w-0">
      <dt className="label text-fg-faint">{label}</dt>
      <dd className="mt-4 text-sm leading-relaxed break-words text-fg">
        {children}
      </dd>
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

  if (!work) {
    // 片方が無くても段が崩れないよう、空の枡を残しておく。
    return <div className="hidden py-14 sm:block" aria-hidden="true" />;
  }

  return (
    <Link
      href={`/works/${work.slug}`}
      className={`group block border-b border-line py-12 sm:border-b-0 sm:py-16 ${
        isNext ? "sm:pl-10 sm:text-right" : "sm:pr-10"
      }`}
    >
      <span className="label text-fg-faint transition-colors duration-500 group-hover:text-fg-muted">
        {isNext ? "Next" : "Previous"}
      </span>
      <p
        className={`display-soft mt-4 break-words text-[clamp(1.75rem,5vw,3rem)] text-fg-muted transition-all duration-500 ease-[var(--ease-out-expo)] group-hover:text-fg ${
          isNext ? "group-hover:translate-x-1.5" : "group-hover:-translate-x-1.5"
        }`}
      >
        {work.title}
      </p>
      {work.subtitle ? (
        <p className="mt-3 text-xs text-fg-faint">{work.subtitle}</p>
      ) : null}
    </Link>
  );
}
