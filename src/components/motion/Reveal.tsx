"use client";

import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import { useRef } from "react";
import { prefersReducedMotion } from "@/hooks/useReducedMotion";

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
}

type RevealProps = {
  children: React.ReactNode;
  className?: string;
  /** 直接の子要素を順番にずらして出す。リストやグリッドに使う。 */
  stagger?: boolean;
  /** 出現の遅延（秒）。 */
  delay?: number;
  as?: "div" | "section" | "ul" | "ol" | "header" | "footer" | "article";
};

/**
 * ビューポートに入ったら opacity と 12px の上昇でそっと出す。一度だけ発火する。
 * 演出はこれ1種類に絞って、誌面のリズムを崩さないようにしている。
 */
export function Reveal({
  children,
  className,
  stagger = false,
  delay = 0,
  as: Tag = "div",
}: RevealProps) {
  const ref = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      const root = ref.current;
      if (!root) return;

      if (prefersReducedMotion()) {
        gsap.set(stagger ? root.children : root, { opacity: 1, y: 0 });
        return;
      }

      const targets = stagger ? Array.from(root.children) : root;

      gsap.fromTo(
        targets,
        { opacity: 0, y: 12 },
        {
          opacity: 1,
          y: 0,
          duration: 0.7,
          delay,
          ease: "power2.out",
          stagger: stagger ? 0.06 : 0,
          scrollTrigger: {
            trigger: root,
            start: "top 88%",
            once: true,
          },
        },
      );
    },
    { scope: ref },
  );

  return (
    // @ts-expect-error 動的タグに ref を渡すため
    <Tag ref={ref} className={className}>
      {children}
    </Tag>
  );
}
