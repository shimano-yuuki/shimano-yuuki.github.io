import Link from "next/link";
import { formatDate, type Post } from "@/lib/content";
import { TagRow } from "./TagRow";

type PostRowProps = {
  post: Post;
  /** 年ごとに振り直す通し番号。 */
  index: number;
};

/**
 * 一覧の1行。細い罫で区切らず、余白でひとかたまりに見せる。
 * ホバーでタイトルが右へ動いて白に上がり、行の下に線が伸びる。
 */
export function PostRow({ post, index }: PostRowProps) {
  return (
    <li>
      <Link
        href={`/blog/${post.slug}`}
        className="group relative block py-8 sm:py-12"
      >
        {/* ホバーのときだけ現れる下線。常設の罫は置かない。 */}
        <span
          aria-hidden="true"
          className="absolute inset-x-0 bottom-0 h-px origin-right scale-x-0 bg-line-bright transition-transform duration-700 ease-[var(--ease-out-expo)] group-hover:origin-left group-hover:scale-x-100"
        />

        <div className="grid gap-x-10 gap-y-4 md:grid-cols-[6rem_minmax(0,1fr)_auto] md:items-start">
          <div className="flex items-center gap-4 md:block">
            <span className="label text-fg-faint">
              {String(index).padStart(2, "0")}
            </span>
            <time
              dateTime={post.date}
              className="label text-fg-faint md:mt-2 md:block"
            >
              {formatDate(post.date)}
            </time>
          </div>

          <div className="min-w-0">
            <h3 className="font-jp text-[clamp(1.375rem,4.4vw,2.375rem)] leading-[1.28] font-medium tracking-[-0.015em] text-fg-muted transition-[color,transform] duration-500 ease-[var(--ease-out-expo)] group-hover:translate-x-2 group-hover:text-fg">
              {post.title}
            </h3>
            <p className="mt-4 max-w-[40rem] text-sm leading-loose text-fg-muted">
              {post.excerpt}
            </p>
            <TagRow tags={post.tags} className="mt-5" />
          </div>

          <span
            aria-hidden="true"
            className="label hidden text-fg-faint transition-[color,transform] duration-500 ease-[var(--ease-out-expo)] group-hover:translate-x-2 group-hover:text-fg md:block md:pt-1"
          >
            Read →
          </span>
        </div>
      </Link>
    </li>
  );
}
