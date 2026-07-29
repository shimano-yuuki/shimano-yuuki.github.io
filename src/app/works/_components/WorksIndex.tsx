"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Reveal } from "@/components/motion/Reveal";
import { StackFilter } from "./StackFilter";
import { WorkPlate } from "./WorkPlate";

/**
 * 一覧に必要な分だけをサーバーから受け取る。
 * body まで渡すと RSC ペイロードが無駄に太るので、page.tsx 側で間引いている。
 */
export type WorkCardItem = {
  slug: string;
  index: string;
  title: string;
  subtitle?: string;
  summary: string;
  stack: string[];
  date: string;
  dateLabel: string;
  cover?: string;
};

type WorksIndexProps = {
  works: WorkCardItem[];
  tags: string[];
};

export function WorksIndex({ works, tags }: WorksIndexProps) {
  const [active, setActive] = useState<string | null>(null);

  const filtered = useMemo(
    () => (active ? works.filter((work) => work.stack.includes(active)) : works),
    [works, active],
  );

  return (
    <div>
      <StackFilter
        tags={tags}
        active={active}
        onChange={setActive}
        shown={filtered.length}
        total={works.length}
      />

      {filtered.length === 0 ? (
        <div className="mt-24 flex flex-col items-start gap-8 bg-surface px-6 py-24 sm:px-12">
          <p className="display text-[clamp(2rem,7vw,4rem)] text-fg/30">
            No Works
          </p>
          <p className="text-sm leading-relaxed text-fg-muted">
            この技術タグに当てはまる作品はまだありません。
          </p>
          <button
            type="button"
            onClick={() => setActive(null)}
            className="label bg-fg px-5 py-3 text-void transition-all duration-500 ease-[var(--ease-out-expo)] hover:px-7"
          >
            Show All
          </button>
        </div>
      ) : (
        <ul className="mt-24 flex flex-col gap-y-28 md:mt-32 md:gap-y-44">
          {filtered.map((work, position) => (
            <li key={work.slug}>
              <Reveal>
                <WorkRow work={work} flip={position % 2 === 1} />
              </Reveal>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/** 全幅の行。段ごとに面と文字の左右を入れ替えて、送りに揺れを出す。 */
function WorkRow({ work, flip }: { work: WorkCardItem; flip: boolean }) {
  return (
    <article className="group">
      <Link
        href={`/works/${work.slug}`}
        className="block outline-offset-8 focus-visible:outline-offset-8"
      >
        <div className="grid gap-8 md:grid-cols-12 md:items-center md:gap-14">
          <div className={`md:col-span-7 ${flip ? "md:order-2" : ""}`}>
            <WorkPlate
              src={work.cover || undefined}
              title={work.title}
              index={work.index}
              sizes="(min-width: 768px) 55vw, 100vw"
              className="aspect-[4/3] w-full md:aspect-[16/10]"
            />
          </div>

          <div className={`md:col-span-5 ${flip ? "md:order-1" : ""}`}>
            <div className="flex items-baseline gap-5">
              <span className="label text-fg-faint">{work.index}</span>
              <time dateTime={work.date} className="label text-fg-faint">
                {work.dateLabel}
              </time>
            </div>

            <h3 className="display mt-6 break-words text-[clamp(2.25rem,6.5vw,3.75rem)] text-fg-muted transition-all duration-500 ease-[var(--ease-out-expo)] group-hover:translate-x-1.5 group-hover:text-fg">
              {work.title}
            </h3>

            {work.subtitle ? (
              <p className="mt-4 text-sm text-fg-muted">{work.subtitle}</p>
            ) : null}

            <p className="mt-5 max-w-[34rem] text-sm leading-relaxed text-fg-muted">
              {work.summary}
            </p>

            {work.stack.length > 0 ? (
              <ul className="mt-7 flex flex-wrap gap-x-5 gap-y-2">
                {work.stack.map((item) => (
                  <li
                    key={item}
                    className="label text-fg-faint transition-colors duration-500 group-hover:text-fg-muted"
                  >
                    {item}
                  </li>
                ))}
              </ul>
            ) : null}

            {/* 行全体のホバーで反応させたいので、下線は自前で伸ばす。 */}
            <span className="mt-9 inline-flex items-center gap-4">
              <span className="label text-fg-muted transition-colors duration-500 group-hover:text-fg">
                View Case
              </span>
              <span className="block h-px w-8 bg-fg-faint transition-all duration-700 ease-[var(--ease-out-expo)] group-hover:w-16 group-hover:bg-fg" />
            </span>
          </div>
        </div>
      </Link>
    </article>
  );
}
