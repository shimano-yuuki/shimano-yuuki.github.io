"use client";

import { useEffect, useRef } from "react";
import { prefersReducedMotion } from "@/hooks/useReducedMotion";
import { depthStore } from "./depthStore";

/** ベールが最も濃いときの不透明度。水は 14% ほど残る。 */
const PEAK = 0.86;

/**
 * 本文の背後で水を落とす膜。
 *
 * 海（z-0）と本文（z-10）の間に敷く。演出を消すのではなく、
 * 読む場所だけ水を暗くして文字のコントラストを確保する。
 *
 * CSS transition は使わない。スクロール連動の値に transition を掛けると
 * 常に半端に追いかける動きになり、特にスマホの慣性スクロールで
 * 暗さが波打って見える。自前の指数追従で滑らかに寄せる。
 */
export function ContentVeil() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const reduced = prefersReducedMotion();
    let current = depthStore.getVeil();
    let frame = 0;
    let last = performance.now();

    const paint = (value: number) => {
      if (ref.current) ref.current.style.opacity = String(value * PEAK);
    };

    const tick = (now: number) => {
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;
      const target = depthStore.getVeil();
      current += (target - current) * (1 - Math.pow(0.002, dt));
      paint(current);
      if (Math.abs(target - current) > 0.001) {
        frame = requestAnimationFrame(tick);
      } else {
        current = target;
        paint(current);
        frame = 0;
      }
    };

    const onChange = () => {
      if (reduced) {
        // 動きを減らす設定では追従アニメもしない。即座に合わせる
        current = depthStore.getVeil();
        paint(current);
        return;
      }
      if (frame === 0) {
        last = performance.now();
        frame = requestAnimationFrame(tick);
      }
    };

    paint(current);
    const unsubscribe = depthStore.subscribe(onChange);
    return () => {
      unsubscribe();
      if (frame) cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <div
      ref={ref}
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-[5] bg-black opacity-0"
    />
  );
}
