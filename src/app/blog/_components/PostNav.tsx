import Link from "next/link";
import { formatDate, type Post } from "@/lib/content";

type PostNavProps = {
  newer?: Post;
  older?: Post;
};

type PostNavLinkProps = {
  post: Post;
  label: string;
  align: "start" | "end";
};

function PostNavLink({ post, label, align }: PostNavLinkProps) {
  return (
    <Link
      href={`/blog/${post.slug}`}
      className={`group block flex-1 border border-rule-faint p-5 transition-colors hover:border-rule ${
        align === "end" ? "sm:text-right" : ""
      }`}
    >
      <span className="label text-vermilion">{label}</span>
      <span className="jp-serif mt-2 block text-base leading-snug transition-colors group-hover:text-vermilion">
        {post.title}
      </span>
      <time dateTime={post.date} className="label mt-3 block text-ink-faint">
        {formatDate(post.date)}
      </time>
    </Link>
  );
}

/**
 * 記事末尾の前後ナビ。片方しか無い記事（最新・最古）でも並びが崩れないように、
 * 欠けた側は幅だけ持つ空きにしておく。
 */
export function PostNav({ newer, older }: PostNavProps) {
  if (!newer && !older) return null;

  return (
    <nav
      aria-label="前後の記事"
      className="mt-6 flex flex-col gap-4 sm:flex-row sm:gap-6"
    >
      {newer ? (
        <PostNavLink post={newer} label="← Newer" align="start" />
      ) : (
        <div className="hidden flex-1 sm:block" aria-hidden="true" />
      )}
      {older ? (
        <PostNavLink post={older} label="Older →" align="end" />
      ) : (
        <div className="hidden flex-1 sm:block" aria-hidden="true" />
      )}
    </nav>
  );
}
