"use client";

import { useEffect, useRef } from "react";
import { depthStore } from "./depthStore";

/** ベールが最も濃いときの不透明度。水は 14% ほど残る。 */
const PEAK = 0.86;

/**
 * 本文の背後で水を落とす膜。
 *
 * 海（z-0）と本文（z-10）の間に敷く。演出を消すのではなく、
 * 読む場所だけ水を暗くして文字のコントラストを確保する。
 * 濃度はスクロールから決まるので、React の再レンダーは通さず直接 DOM を書く。
 */
export function ContentVeil() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const paint = () => {
      if (!ref.current) return;
      ref.current.style.opacity = String(depthStore.getVeil() * PEAK);
    };
    paint();
    return depthStore.subscribe(paint);
  }, []);

  return (
    <div
      ref={ref}
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-[5] bg-black opacity-0 transition-opacity duration-200 ease-out"
    />
  );
}
