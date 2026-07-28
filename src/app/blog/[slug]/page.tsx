import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Reveal } from "@/components/motion/Reveal";
import { CoverPlate } from "@/components/ui/CoverPlate";
import { Rule } from "@/components/ui/Rule";
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
    <article className="spread py-12 sm:py-16">
      {/* 扉 */}
      <Reveal as="header">
        <Rule weight="double" />
        <div className="flex flex-wrap items-baseline gap-x-5 gap-y-2 pt-6">
          <time dateTime={post.date} className="label text-vermilion">
            {formatDate(post.date)}
          </time>
          <TagRow tags={post.tags} />
        </div>
        <h1 className="jp-serif mt-5 max-w-[46rem] text-[clamp(1.75rem,5vw,3rem)] leading-[1.45] font-semibold">
          {post.title}
        </h1>
        <p className="mt-5 max-w-[42rem] text-ink-muted">{post.excerpt}</p>
      </Reveal>

      {/* カバーは持っている記事だけ。多くの記事は文字だけで始める。 */}
      {post.cover ? (
        <div className="mt-10">
          <CoverPlate
            src={post.cover}
            alt={post.title}
            label={post.title}
            className="aspect-[16/9]"
            priority
            sizes="(min-width: 1024px) 60rem, 100vw"
          />
        </div>
      ) : null}

      <div className="mt-12 sm:mt-16 lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,15rem)] lg:gap-12">
        {/* 目次。DOM 上は本文より前に置き、広い画面だけ右の段へ送る。 */}
        {showToc ? (
          <TableOfContents
            headings={headings}
            className="mb-10 border-y border-rule-faint py-4 lg:sticky lg:top-24 lg:col-start-2 lg:row-start-1 lg:mb-0 lg:self-start lg:border-y-0 lg:border-l lg:border-rule-faint lg:py-0 lg:pl-5"
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
      <Reveal as="footer" className="mt-20 sm:mt-24">
        <Rule weight="double" />
        <PostNav newer={newer} older={older} />

        <div className="mt-10 border-t border-rule-faint pt-6">
          <Link
            href="/blog"
            className="group inline-flex flex-wrap items-baseline gap-x-3 gap-y-1"
          >
            <span className="label text-vermilion">← Index</span>
            <span className="jp-serif text-sm text-ink-muted transition-colors group-hover:text-ink">
              Journal 一覧へ戻る
            </span>
          </Link>
        </div>
      </Reveal>
    </article>
  );
}
