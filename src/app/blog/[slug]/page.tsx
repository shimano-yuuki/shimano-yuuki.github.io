import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  formatDate,
  getPost,
  getPostNeighbors,
  getPosts,
  renderBody,
} from "@/lib/content";
import { PostNav } from "../_components/PostNav";
import { TableOfContents } from "../_components/TableOfContents";

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
    <article className="measure pt-32 pb-28 sm:pt-40 sm:pb-40">
      <p>
        <Link
          href="/blog"
          className="label text-fg-muted transition-colors hover:text-accent"
        >
          ← 記録
        </Link>
      </p>

      <header className="mt-10">
        <div className="flex flex-wrap items-baseline gap-x-5 gap-y-1">
          <time dateTime={post.date} className="label text-fg-faint">
            {formatDate(post.date)}
          </time>
          {post.tags.length > 0 ? (
            <p className="label text-fg-faint">
              タグ: {post.tags.join(" / ")}
            </p>
          ) : null}
        </div>

        <h1 className="mt-4 max-w-[42rem] text-2xl leading-relaxed font-bold">
          {post.title}
        </h1>
      </header>

      {post.cover ? (
        <div className="relative mt-10 aspect-[16/9] w-full max-w-[42rem] overflow-hidden">
          <Image
            src={post.cover}
            alt={post.title}
            fill
            priority
            sizes="(min-width: 48rem) 42rem, 100vw"
            className="object-cover"
          />
        </div>
      ) : null}

      <div className="mt-12 lg:grid lg:grid-cols-[minmax(0,42rem)_14rem] lg:gap-16">
        {/* 目次。DOM 上は本文より前に置き、広い画面だけ右の段へ送る。 */}
        {showToc ? (
          <TableOfContents
            headings={headings}
            className="mb-12 lg:sticky lg:top-28 lg:col-start-2 lg:row-start-1 lg:mb-0 lg:self-start"
          />
        ) : null}

        {/*
          html は content/blog/ に自分で書いた Markdown をビルド時に変換したもので、
          外部からの入力は一切通らないため dangerouslySetInnerHTML で差し込んでいる。
        */}
        <div
          className="prose max-w-[42rem] lg:col-start-1 lg:row-start-1"
          dangerouslySetInnerHTML={{ __html: html }}
        />
      </div>

      <footer className="mt-24 max-w-[42rem] border-t border-line pt-6">
        <PostNav newer={newer} older={older} />
      </footer>
    </article>
  );
}
