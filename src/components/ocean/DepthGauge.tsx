"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { metersAt, zoneAt } from "@/lib/depth";
import { depthStore } from "./depthStore";

const subscribe = (onChange: () => void) => depthStore.subscribe(onChange);

/**
 * 右下の深度計。
 * スクロールが潜水であることを、数字で目に見える形にする。
 */
export function DepthGauge() {
  // サーバー側では 0。マウント後に実際の深度へ切り替わる。
  const depth = useSyncExternalStore(
    subscribe,
    () => depthStore.get(),
    () => 0,
  );
  const [hidden, setHidden] = useState(false);

  // 奥付と重なると両方読めなくなるので、フッターが見えたら引っ込める
  useEffect(() => {
    const footer = document.querySelector("footer");
    if (!footer) return;
    const observer = new IntersectionObserver(
      ([entry]) => setHidden(entry.isIntersecting),
      { threshold: 0 },
    );
    observer.observe(footer);
    return () => observer.disconnect();
  }, []);

  const zone = zoneAt(depth);

  return (
    <div
      className={`pointer-events-none fixed right-4 bottom-4 z-30 flex items-end gap-3 mix-blend-difference transition-opacity duration-500 sm:right-8 sm:bottom-8 ${
        hidden ? "opacity-0" : "opacity-100"
      }`}
      aria-hidden="true"
    >
      {/* 深度バー */}
      <div className="relative h-24 w-px bg-white/30">
        <span
          className="absolute -left-[3px] h-px w-[7px] bg-white transition-[top] duration-200 ease-out"
          style={{ top: `${depth * 100}%` }}
        />
      </div>

      <div className="text-right">
        <p className="label text-white/45">{zone.en}</p>
        <p className="label mt-1 text-white tabular-nums">
          -{metersAt(depth).toLocaleString("en-US")} m
        </p>
      </div>
    </div>
  );
}
