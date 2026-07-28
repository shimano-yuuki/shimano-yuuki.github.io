import Link from "next/link";
import { Rule } from "./Rule";

type SectionHeadProps = {
  /** 誌面のノンブル。"01" のように渡す。 */
  index: string;
  title: string;
  titleJa?: string;
  action?: { label: string; href: string };
};

/**
 * 「(01) SELECTED WORKS ———— ALL →」のセクション見出し。
 * 通し番号があるだけで誌面の目次らしさが出る。
 */
export function SectionHead({
  index,
  title,
  titleJa,
  action,
}: SectionHeadProps) {
  return (
    <div>
      <Rule weight="double" />
      <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2 pt-4">
        <h2 className="flex items-baseline gap-3">
          <span className="label text-vermilion">({index})</span>
          <span className="display text-2xl sm:text-3xl">{title}</span>
          {titleJa ? (
            <span className="jp-serif text-xs text-ink-muted">{titleJa}</span>
          ) : null}
        </h2>
        {action ? (
          <Link
            href={action.href}
            className="label text-ink-muted transition-colors hover:text-vermilion"
          >
            {action.label} →
          </Link>
        ) : null}
      </div>
    </div>
  );
}
