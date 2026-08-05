import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  formatDate,
  getWork,
  getWorkNeighbors,
  getWorks,
  renderBody,
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

export default async function WorkPage({ params }: Props) {
  const { slug } = await params;
  const work = getWork(slug);

  if (!work) notFound();

  const { html } = await renderBody(work.body);
  const { previous, next } = getWorkNeighbors(slug);

  return (
    <article className="measure pt-28 pb-32 sm:pt-32 sm:pb-40">
      <Link
        href="/works"
        className="text-sm text-fg-faint transition-colors hover:text-accent"
      >
        ← 作品一覧
      </Link>

      {/* 扉。見出しは普通の太字にとどめる */}
      <header className="mt-10">
        <h1 className="text-2xl font-bold break-words">
          {work.title}
          {work.subtitle ? (
            <span className="ml-3 text-sm font-normal text-fg-muted">
              {work.subtitle}
            </span>
          ) : null}
        </h1>
        <p className="mt-4 max-w-[42rem] text-sm leading-relaxed text-fg-muted">
          {work.summary}
        </p>
      </header>

      {/* 定型項目。一覧と同じ定義リストの型 */}
      <dl className="mt-12 max-w-[42rem] border-b border-line">
        <MetaRow label="年">
          <time dateTime={work.date} className="label text-fg-muted">
            {formatDate(work.date)}
          </time>
        </MetaRow>

        {work.role.length > 0 ? (
          <MetaRow label="担当">
            <span className="text-sm text-fg-muted">{work.role.join(" / ")}</span>
          </MetaRow>
        ) : null}

        {work.stack.length > 0 ? (
          <MetaRow label="技術">
            <span className="label text-fg-muted">{work.stack.join(" · ")}</span>
          </MetaRow>
        ) : null}

        {work.links.length > 0 ? (
          <MetaRow label="リンク">
            <ul className="space-y-1">
              {work.links.map(([label, href]) => (
                <li key={label}>
                  <a
                    href={href}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="text-sm text-fg underline decoration-accent underline-offset-4 transition-colors hover:text-accent"
                  >
                    {label} ↗
                  </a>
                </li>
              ))}
            </ul>
          </MetaRow>
        ) : null}
      </dl>

      {/*
        html は content/works/ に自分で書いた Markdown をビルド時に変換したもので、
        外部からの入力は一切通らないため dangerouslySetInnerHTML で差し込んでいる。
      */}
      <div
        className="prose mt-16 max-w-[42rem]"
        dangerouslySetInnerHTML={{ __html: html }}
      />

      {/* 図版。画像はこの詳細ページだけの世界にする */}
      {work.gallery.length > 0 ? (
        <section className="mt-20 max-w-[42rem]">
          <h2 className="text-sm text-fg-faint">図版</h2>
          <ul className="mt-6 space-y-6">
            {work.gallery.map((src, i) => (
              <li key={src} className="relative aspect-[4/3] overflow-hidden">
                <Image
                  src={src}
                  alt={`${work.title} の図版 ${i + 1}`}
                  fill
                  sizes="(min-width: 640px) 42rem, 100vw"
                  className="object-cover"
                />
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {/* 前後ナビ。テキスト行だけにする */}
      <nav
        aria-label="前後の作品"
        className="mt-20 flex max-w-[42rem] flex-wrap items-baseline justify-between gap-x-8 gap-y-2 border-t border-line pt-6 text-sm"
      >
        {previous ? (
          <Link
            href={`/works/${previous.slug}`}
            className="text-fg-muted transition-colors hover:text-accent"
          >
            ← 前の作品
          </Link>
        ) : (
          <span aria-hidden="true" />
        )}
        {next ? (
          <Link
            href={`/works/${next.slug}`}
            className="text-fg-muted transition-colors hover:text-accent"
          >
            次の作品 →
          </Link>
        ) : null}
      </nav>
    </article>
  );
}

/* ==========================================================================
   部品
   ========================================================================== */

function MetaRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="grid gap-x-8 gap-y-1 border-t border-line py-4 sm:grid-cols-[7rem_minmax(0,1fr)]">
      <dt className="text-sm text-fg-faint">{label}</dt>
      <dd className="min-w-0 break-words">{children}</dd>
    </div>
  );
}
