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
  const toEnd = align === "end";

  return (
    <Link
      href={`/blog/${post.slug}`}
      className={`group block ${toEnd ? "sm:text-right" : ""}`}
    >
      <span className="label text-fg-faint transition-colors duration-500 group-hover:text-fg-muted">
        {label}
      </span>
      <span
        className={`font-jp mt-4 block text-lg leading-snug font-medium text-fg-muted transition-[color,transform] duration-500 ease-[var(--ease-out-expo)] group-hover:text-fg sm:text-xl ${
          toEnd ? "group-hover:-translate-x-2" : "group-hover:translate-x-2"
        }`}
      >
        {post.title}
      </span>
      <time dateTime={post.date} className="label mt-4 block text-fg-faint">
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
      className="grid gap-12 sm:grid-cols-2 sm:gap-16"
    >
      {newer ? (
        <PostNavLink post={newer} label="← Newer" align="start" />
      ) : (
        <div className="hidden sm:block" aria-hidden="true" />
      )}
      {older ? (
        <PostNavLink post={older} label="Older →" align="end" />
      ) : (
        <div className="hidden sm:block" aria-hidden="true" />
      )}
    </nav>
  );
}
