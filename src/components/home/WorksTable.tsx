import Link from "next/link";
import { FadeIn } from "@/components/FadeIn";
import type { Work } from "@/lib/content";

/**
 * 作品の定義リスト表。左に項目名、右に値。区切りは 1px の横罫だけ。
 * 参照サイト（tndhjm.com）の Title / Client / Year / Role の型を、
 * エンジニアの項目（作品名 / 年 / 担当 / 技術）に置き換えたもの。
 */
export function WorksTable({ works }: { works: Work[] }) {
  return (
    <section className="measure mt-20">
      <h2 className="mb-2 text-sm text-fg-faint">作品 — 新しい順</h2>

      <ul>
        {works.map((work, index) => (
          <FadeIn
            as="li"
            key={work.slug}
            delay={Math.min(index, 5) * 70}
            className="border-t border-line"
          >
            <Link
              href={`/works/${work.slug}`}
              className="group grid gap-x-8 gap-y-1 py-6 sm:grid-cols-[7rem_minmax(0,1fr)] sm:py-7"
            >
              <span className="text-sm text-fg-faint">作品名</span>
              <span className="text-lg font-bold transition-colors group-hover:text-cyan">
                {work.title}
                {work.subtitle ? (
                  <span className="ml-3 text-sm font-normal text-fg-muted">
                    {work.subtitle}
                  </span>
                ) : null}
              </span>

              <span className="mt-2 text-sm text-fg-faint sm:mt-0">年</span>
              <span className="label text-fg-muted">{work.date.slice(0, 4)}</span>

              {work.role.length > 0 ? (
                <>
                  <span className="mt-2 text-sm text-fg-faint sm:mt-0">担当</span>
                  <span className="text-sm text-fg-muted">
                    {work.role.join(" / ")}
                  </span>
                </>
              ) : null}

              {work.stack.length > 0 ? (
                <>
                  <span className="mt-2 text-sm text-fg-faint sm:mt-0">技術</span>
                  <span className="label text-fg-muted">
                    {work.stack.join(" · ")}
                  </span>
                </>
              ) : null}
            </Link>
          </FadeIn>
        ))}
      </ul>
    </section>
  );
}
