"use client";

import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useRef } from "react";
import { prefersReducedMotion } from "@/hooks/useReducedMotion";

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
}

type SplitHeadingProps = {
  /** 1要素が1行。行ごとにマスクの下から迫り上がる。 */
  lines: React.ReactNode[];
  className?: string;
  lineClassName?: string;
  as?: "h1" | "h2" | "p";
};

/**
 * 見出しの行送りリビール。overflow: hidden の親の中で子を translateY(100%) から戻す。
 * 雑誌の見出しが刷り上がる感じを出すための、ページに1〜2回だけ使う演出。
 */
export function SplitHeading({
  lines,
  className,
  lineClassName,
  as: Tag = "h2",
}: SplitHeadingProps) {
  const ref = useRef<HTMLHeadingElement>(null);

  useGSAP(
    () => {
      const root = ref.current;
      if (!root) return;

      const targets = root.querySelectorAll<HTMLElement>("[data-line-inner]");

      if (prefersReducedMotion()) {
        gsap.set(targets, { yPercent: 0, opacity: 1 });
        return;
      }

      gsap.fromTo(
        targets,
        { yPercent: 105, opacity: 0 },
        {
          yPercent: 0,
          opacity: 1,
          duration: 0.9,
          ease: "power3.out",
          stagger: 0.08,
          scrollTrigger: { trigger: root, start: "top 90%", once: true },
        },
      );
    },
    { scope: ref },
  );

  return (
    <Tag ref={ref} className={className}>
      {lines.map((line, index) => (
        <span
          key={index}
          className={`block overflow-hidden pb-[0.08em] ${lineClassName ?? ""}`}
        >
          <span data-line-inner className="block">
            {line}
          </span>
        </span>
      ))}
    </Tag>
  );
}
