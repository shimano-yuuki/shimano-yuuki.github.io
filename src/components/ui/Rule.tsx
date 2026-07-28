"use client";

import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useRef } from "react";
import { prefersReducedMotion } from "@/hooks/useReducedMotion";

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
}

type RuleProps = {
  /** thin: 1px 一本 / double: 太罫＋細罫の二重罫 / hair: 薄い一本 */
  weight?: "thin" | "double" | "hair";
  className?: string;
  /** スクロールで左から引かれる演出をつけるか。 */
  animated?: boolean;
};

/**
 * 誌面の罫線。セクションの境目はこれで作る。
 */
export function Rule({
  weight = "thin",
  className = "",
  animated = true,
}: RuleProps) {
  const ref = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const root = ref.current;
      if (!root || !animated) return;

      const bars = root.querySelectorAll<HTMLElement>("[data-bar]");

      if (prefersReducedMotion()) {
        gsap.set(bars, { scaleX: 1 });
        return;
      }

      gsap.fromTo(
        bars,
        { scaleX: 0 },
        {
          scaleX: 1,
          duration: 0.8,
          ease: "power2.inOut",
          stagger: 0.08,
          scrollTrigger: { trigger: root, start: "top 95%", once: true },
        },
      );
    },
    { scope: ref, dependencies: [animated] },
  );

  return (
    <div ref={ref} className={className} aria-hidden="true">
      {weight === "double" ? (
        <>
          <div data-bar className="h-[3px] origin-left bg-rule" />
          <div data-bar className="mt-[3px] h-px origin-left bg-rule" />
        </>
      ) : (
        <div
          data-bar
          className={`origin-left ${weight === "hair" ? "h-px bg-rule-faint" : "h-px bg-rule"}`}
        />
      )}
    </div>
  );
}
