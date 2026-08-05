import Link from "next/link";
import type { Post } from "@/lib/content";

type PostNavProps = {
  newer?: Post;
  older?: Post;
};

/**
 * 記事末尾の前後ナビ。「← 新しい記事」「古い記事 →」のテキスト行だけを置く。
 */
export function PostNav({ newer, older }: PostNavProps) {
  if (!newer && !older) return null;

  return (
    <nav aria-label="前後の記事" className="flex flex-col gap-3 text-sm">
      {newer ? (
        <p className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
          <span className="label text-fg-faint">← 新しい記事</span>
          <Link
            href={`/blog/${newer.slug}`}
            className="text-fg-muted transition-colors hover:text-accent"
          >
            {newer.title}
          </Link>
        </p>
      ) : null}
      {older ? (
        <p className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
          <span className="label text-fg-faint">古い記事 →</span>
          <Link
            href={`/blog/${older.slug}`}
            className="text-fg-muted transition-colors hover:text-accent"
          >
            {older.title}
          </Link>
        </p>
      ) : null}
    </nav>
  );
}
