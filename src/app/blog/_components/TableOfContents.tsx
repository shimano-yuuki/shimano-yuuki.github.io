"use client";

import { useEffect, useState } from "react";
import type { Heading } from "@/lib/markdown";

type TableOfContentsProps = {
  headings: Heading[];
  className?: string;
};

/**
 * 本文の h2 / h3 から起こす目次。
 * 広い画面では本文の右に小さく添えて sticky に、狭い画面では本文の前に置く。
 * IntersectionObserver で現在位置の見出しだけを白く上げる。
 */
export function TableOfContents({
  headings,
  className = "",
}: TableOfContentsProps) {
  const [activeId, setActiveId] = useState(headings[0]?.id ?? "");

  // 依存に配列そのものを置くと毎レンダーで貼り直しになるので、id の並びを文字列にして見る。
  const idKey = headings.map((heading) => heading.id).join("\n");

  useEffect(() => {
    const elements = idKey
      .split("\n")
      .map((id) => document.getElementById(id))
      .filter((element): element is HTMLElement => element !== null);

    if (elements.length === 0) return;

    const visible = new Set<string>();

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) visible.add(entry.target.id);
          else visible.delete(entry.target.id);
        }

        // 画面に入っている見出しのうち、いちばん上のものを現在位置とする。
        const current = elements.find((element) => visible.has(element.id));
        if (current) {
          setActiveId(current.id);
          return;
        }

        // 帯の外（節の途中を読んでいるとき）は、直前に通り過ぎた見出しを保つ。
        const passed = [...elements]
          .reverse()
          .find((element) => element.getBoundingClientRect().top < 160);
        if (passed) setActiveId(passed.id);
      },
      { rootMargin: "-15% 0px -70% 0px", threshold: 0 },
    );

    for (const element of elements) observer.observe(element);
    return () => observer.disconnect();
  }, [idKey]);

  return (
    <nav aria-labelledby="toc-heading" className={className}>
      <h2 id="toc-heading" className="label text-fg-faint">
        Contents
      </h2>

      <ol className="mt-5">
        {headings.map((heading, index) => {
          const active = heading.id === activeId;

          return (
            <li
              key={`${heading.id}-${index}`}
              className={`mt-3 ${heading.depth === 3 ? "pl-5" : ""}`}
            >
              <a
                href={`#${heading.id}`}
                aria-current={active ? "location" : undefined}
                className={`group flex items-start gap-3 text-[0.8125rem] leading-relaxed break-words transition-colors duration-500 ${
                  active ? "text-fg" : "text-fg-faint hover:text-fg-muted"
                }`}
              >
                <span
                  aria-hidden="true"
                  className={`mt-[0.7em] h-px w-4 flex-none origin-left bg-current transition-transform duration-500 ease-[var(--ease-out-expo)] ${
                    active ? "scale-x-100" : "scale-x-[0.4]"
                  }`}
                />
                <span className="min-w-0">{heading.text}</span>
              </a>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
