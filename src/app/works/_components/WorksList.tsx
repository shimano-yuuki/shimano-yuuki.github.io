"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { FadeIn } from "@/components/FadeIn";

/**
 * 一覧に必要な分だけをサーバーから受け取る。
 * body まで渡すと RSC ペイロードが無駄に太るので、page.tsx 側で間引いている。
 */
export type WorkListItem = {
  slug: string;
  title: string;
  subtitle?: string;
  date: string;
  role: string[];
  stack: string[];
};

type WorksListProps = {
  works: WorkListItem[];
  tags: string[];
};

/**
 * 技術タグの絞り込みと、作品の定義リスト表。
 * 表の型はトップページの WorksTable と同じ。左に項目名、右に値、
 * 区切りは 1px の横罫だけ。タグは枠を持たせず、選択中だけ accent（青）にする。
 */
export function WorksList({ works, tags }: WorksListProps) {
  const [active, setActive] = useState<string | null>(null);

  const filtered = useMemo(
    () => (active ? works.filter((work) => work.stack.includes(active)) : works),
    [works, active],
  );

  return (
    <div>
      {tags.length > 0 ? (
        <ul className="mt-8 flex flex-wrap gap-x-5 gap-y-1" aria-label="技術で絞り込む">
          <li>
            <FilterButton
              label="すべて"
              active={active === null}
              onClick={() => setActive(null)}
            />
          </li>
          {tags.map((tag) => (
            <li key={tag}>
              <FilterButton
                label={tag}
                active={active === tag}
                onClick={() => setActive(active === tag ? null : tag)}
              />
            </li>
          ))}
        </ul>
      ) : null}

      {filtered.length === 0 ? (
        <p className="mt-16 border-t border-line pt-6 text-sm text-fg-muted" aria-live="polite">
          この技術の作品はまだありません。
        </p>
      ) : (
        <ul className="mt-12">
          {filtered.map((work, index) => (
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
                <span className="text-lg font-bold transition-colors group-hover:text-accent">
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
      )}
    </div>
  );
}

function FilterButton({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`label py-1 transition-colors ${
        active ? "text-accent" : "text-fg-faint hover:text-fg"
      }`}
    >
      {label}
    </button>
  );
}
