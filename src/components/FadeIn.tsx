"use client";

import { useEffect, useRef } from "react";

type FadeInProps = {
  children: React.ReactNode;
  className?: string;
  as?: "div" | "section" | "ul" | "li" | "header";
  /** 現れるまでの時間差（ms）。行の連なりに波を作る。 */
  delay?: number;
};

/**
 * ビューポートに入ったらそっと現れる。演出はサイト全体でこれ1種類だけ。
 * 実体は IntersectionObserver が .is-visible を付けるだけで、
 * 見た目は globals.css の .fade-in が持つ。reduced-motion では即表示。
 */
export function FadeIn({
  children,
  className = "",
  as: Tag = "div",
  delay = 0,
}: FadeInProps) {
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          node.classList.add("is-visible");
          observer.disconnect();
        }
      },
      { rootMargin: "0px 0px -8% 0px" },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return (
    <Tag
      // @ts-expect-error 動的タグに ref を渡すため
      ref={ref}
      className={`fade-in ${className}`}
      style={delay ? { transitionDelay: `${delay}ms` } : undefined}
    >
      {children}
    </Tag>
  );
}
