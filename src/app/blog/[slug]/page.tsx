import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Reveal } from "@/components/motion/Reveal";
import { SplitHeading } from "@/components/motion/SplitHeading";
import {
  formatDate,
  getPost,
  getPostNeighbors,
  getPosts,
  renderBody,
} from "@/lib/content";
import { PostNav } from "../_components/PostNav";
import { TableOfContents } from "../_components/TableOfContents";
import { TagRow } from "../_components/TagRow";

/** Next.js 16 では params が Promise で渡る。 */
type PostPageProps = {
  params: Promise<{ slug: string }>;
};

export function generateStaticParams() {
  return getPosts().map((post) => ({ slug: post.slug }));
}

export async function generateMetadata({
  params,
}: PostPageProps): Promise<Metadata> {
  const { slug } = await params;
  const post = getPost(slug);

  if (!post) return {};

  return {
    title: post.title,
    description: post.excerpt,
    openGraph: {
      type: "article",
      title: post.title,
      description: post.excerpt,
      url: `/blog/${post.slug}`,
      publishedTime: post.date,
      tags: post.tags,
    },
  };
}

export default async function PostPage({ params }: PostPageProps) {
  const { slug } = await params;
  const post = getPost(slug);

  if (!post) notFound();

  const { html, headings } = await renderBody(post.body);
  const { newer, older } = getPostNeighbors(post.slug);
  const showToc = headings.length >= 2;

  return (
    <article className="pt-32 pb-28 sm:pt-40 sm:pb-40">
      {/* 扉。日付とタグを細く置いて、タイトルだけを大きく立てる。 */}
      <header className="measure">
        <div className="flex flex-wrap items-center gap-x-5 gap-y-3">
          <time dateTime={post.date} className="label text-fg-muted">
            {formatDate(post.date)}
          </time>
          <span aria-hidden="true" className="h-px w-8 bg-line-bright" />
          <TagRow tags={post.tags} />
        </div>

        <SplitHeading
          as="h1"
          lines={[post.title]}
          className="font-jp mt-8 max-w-[54rem] text-[clamp(1.875rem,5.4vw,4rem)] leading-[1.22] font-bold tracking-[-0.02em] sm:mt-10"
        />

        <Reveal delay={0.15}>
          <p className="mt-8 max-w-[38rem] text-sm leading-loose text-fg-muted">
            {post.excerpt}
          </p>
        </Reveal>
      </header>

      {/* カバーは持っている記事だけ。多くの記事は文字だけで始める。 */}
      {post.cover ? (
        <Reveal className="measure mt-16 sm:mt-20">
          <div className="relative aspect-[16/9] w-full overflow-hidden bg-surface">
            <Image
              src={post.cover}
              alt={post.title}
              fill
              priority
              sizes="(min-width: 1280px) 84rem, 100vw"
              className="object-cover"
            />
          </div>
        </Reveal>
      ) : null}

      <div className="measure mt-16 border-t border-line pt-14 sm:mt-24 sm:pt-20 lg:grid lg:grid-cols-[minmax(0,1fr)_14rem] lg:gap-16 xl:gap-24">
        {/* 目次。DOM 上は本文より前に置き、広い画面だけ右の段へ送る。 */}
        {showToc ? (
          <TableOfContents
            headings={headings}
            className="mb-14 border-y border-line py-6 lg:sticky lg:top-28 lg:col-start-2 lg:row-start-1 lg:mb-0 lg:self-start lg:border-y-0 lg:border-l lg:border-line lg:py-0 lg:pl-6"
          />
        ) : null}

        {/*
          html は content/blog/ に自分で書いた Markdown をビルド時に変換したもので、
          外部からの入力は一切通らないため dangerouslySetInnerHTML で差し込んでいる。
        */}
        <div
          className="prose max-w-[46rem] lg:col-start-1 lg:row-start-1"
          dangerouslySetInnerHTML={{ __html: html }}
        />
      </div>

      {/* 前後の記事 */}
      <Reveal as="footer" className="measure mt-28 sm:mt-36">
        <p className="label text-fg-faint">Next Reading</p>
        <div className="mt-10 border-t border-line pt-12">
          <PostNav newer={newer} older={older} />
        </div>

        <div className="mt-20 border-t border-line pt-8">
          <Link
            href="/blog"
            className="group inline-flex flex-wrap items-baseline gap-x-4 gap-y-1"
          >
            <span className="label underline-sweep text-fg-muted transition-colors duration-500 group-hover:text-fg">
              ← Back to Index
            </span>
            <span className="text-xs text-fg-faint transition-colors duration-500 group-hover:text-fg-muted">
              Journal 一覧へ戻る
            </span>
          </Link>
        </div>
      </Reveal>
    </article>
  );
}
