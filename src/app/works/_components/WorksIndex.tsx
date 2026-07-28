"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Reveal } from "@/components/motion/Reveal";
import { CoverPlate } from "@/components/ui/CoverPlate";

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

/** 誌面の組み。1件目は扉、以降は 7:5 の非対称2段組を左右入れ替えながら送る。 */
type Variant = "lead" | "large" | "small";

function variantOf(position: number): Variant {
  if (position === 0) return "lead";
  const rest = position - 1;
  const pair = Math.floor(rest / 2);
  const slot = rest % 2;
  // 偶数ペアは「大→小」、奇数ペアは「小→大」。段ごとに重心が振れる。
  const isLarge = pair % 2 === 0 ? slot === 0 : slot === 1;
  return isLarge ? "large" : "small";
}

const SPAN: Record<Variant, string> = {
  lead: "md:col-span-12",
  large: "md:col-span-7",
  small: "md:col-span-5 md:mt-20",
};

export function WorksIndex({ works, tags }: WorksIndexProps) {
  const [active, setActive] = useState<string | null>(null);

  const filtered = useMemo(
    () => (active ? works.filter((work) => work.stack.includes(active)) : works),
    [works, active],
  );

  return (
    <div>
      {tags.length > 0 ? (
        <div className="mt-14 border-t border-rule pt-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-baseline sm:gap-6">
            <h2 className="label shrink-0 text-ink-faint">Filter by Stack</h2>
            <ul className="flex flex-wrap gap-2">
              <li>
                <FilterButton
                  label="All"
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
          </div>
          <p className="label mt-4 text-ink-faint" aria-live="polite">
            {filtered.length} / {works.length} Works
          </p>
        </div>
      ) : null}

      {/* Reveal は絞り込みで出し入れしない。中身だけ差し替える。 */}
      <Reveal className="mt-12">
        {filtered.length === 0 ? (
          <div className="border-y border-rule py-20 text-center">
            <p className="display text-3xl text-ink/60">No Works Found</p>
            <p className="jp-serif mt-4 text-sm text-ink-muted">
              この技術タグに当てはまる作品はまだありません。
            </p>
            <button
              type="button"
              onClick={() => setActive(null)}
              className="label mt-6 border border-rule px-4 py-2 text-ink transition-colors hover:bg-vermilion hover:text-paper"
            >
              Show All →
            </button>
          </div>
        ) : (
          <ul className="grid grid-cols-1 gap-y-16 md:grid-cols-12 md:gap-x-8 md:gap-y-16">
            {filtered.map((work, position) => {
              const variant = variantOf(position);
              return (
                <li key={work.slug} className={SPAN[variant]}>
                  <WorkCard work={work} variant={variant} />
                </li>
              );
            })}
          </ul>
        )}
      </Reveal>
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
      className={`label border px-3 py-1.5 transition-colors ${
        active
          ? "border-ink bg-ink text-paper"
          : "border-rule-faint text-ink-muted hover:border-rule hover:text-vermilion"
      }`}
    >
      {label}
    </button>
  );
}

const COVER_ASPECT: Record<Variant, string> = {
  lead: "aspect-[4/3] md:aspect-[16/10]",
  large: "aspect-[4/3]",
  small: "aspect-[4/3] md:aspect-[4/5]",
};

const COVER_SIZES: Record<Variant, string> = {
  lead: "(min-width: 768px) 56vw, 100vw",
  large: "(min-width: 768px) 46vw, 100vw",
  small: "(min-width: 768px) 32vw, 100vw",
};

const TITLE_SIZE: Record<Variant, string> = {
  lead: "text-[clamp(2rem,1.2rem+3.4vw,3.75rem)]",
  large: "text-[clamp(1.75rem,1.2rem+1.8vw,2.5rem)]",
  small: "text-[clamp(1.5rem,1.1rem+1.2vw,2rem)]",
};

function WorkCard({ work, variant }: { work: WorkCardItem; variant: Variant }) {
  const meta = (
    <div className={variant === "lead" ? "md:self-end md:pb-1" : ""}>
      <div className="flex items-baseline justify-between gap-4 border-t border-rule pt-3">
        <span className="label text-vermilion">{work.index}</span>
        <time dateTime={work.date} className="label text-ink-faint">
          {work.dateLabel}
        </time>
      </div>

      <h3
        className={`display mt-3 break-words text-ink transition-colors group-hover:text-vermilion ${TITLE_SIZE[variant]}`}
      >
        {work.title}
      </h3>

      {work.subtitle ? (
        <p className="jp-serif mt-2 text-sm text-ink-muted">{work.subtitle}</p>
      ) : null}

      <p className="mt-3 max-w-[34rem] text-sm leading-relaxed text-ink-muted">
        {work.summary}
      </p>

      {work.stack.length > 0 ? (
        <ul className="mt-4 flex flex-wrap gap-x-2 gap-y-2">
          {work.stack.map((item) => (
            <li
              key={item}
              className="label border border-rule-faint px-2 py-1 text-ink-faint"
            >
              {item}
            </li>
          ))}
        </ul>
      ) : null}

      <span className="label mt-5 inline-block text-ink-muted transition-colors group-hover:text-vermilion">
        Read Case →
      </span>
    </div>
  );

  return (
    <article className="group">
      <Link
        href={`/works/${work.slug}`}
        className="block focus-visible:outline-offset-6"
      >
        {variant === "lead" ? (
          <div className="md:grid md:grid-cols-12 md:gap-8">
            <div className="md:col-span-7">
              <CoverPlate
                src={work.cover || undefined}
                alt={work.title}
                label={work.title}
                index={work.index}
                sizes={COVER_SIZES.lead}
                className={`${COVER_ASPECT.lead} w-full`}
              />
            </div>
            <div className="mt-6 md:col-span-5 md:mt-0 md:flex md:flex-col md:justify-end">
              {meta}
            </div>
          </div>
        ) : (
          <>
            <CoverPlate
              src={work.cover || undefined}
              alt={work.title}
              label={work.title}
              index={work.index}
              sizes={COVER_SIZES[variant]}
              className={`${COVER_ASPECT[variant]} w-full`}
            />
            <div className="mt-6">{meta}</div>
          </>
        )}
      </Link>
    </article>
  );
}
