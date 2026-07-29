"use client";

import { useEffect, useRef, useState } from "react";
import { prefersReducedMotion } from "@/hooks/useReducedMotion";

type FluidHeroProps = {
  /** 流体に沈める文字。 */
  text: string;
  className?: string;
};

function supportsWebGL(): boolean {
  try {
    const canvas = document.createElement("canvas");
    return Boolean(
      canvas.getContext("webgl2") ??
        canvas.getContext("webgl") ??
        canvas.getContext("experimental-webgl"),
    );
  } catch {
    return false;
  }
}

/**
 * 全画面の流体シミュレーション。
 *
 * WebGL が無い環境では CSS のグラデーションに落とす。
 * 「視差効果を減らす」が有効なときは1枚だけ描いて止める。
 * 画面外に出ている間とタブが非表示の間はループを止める。
 */
export function FluidHero({ text, className = "" }: FluidHeroProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [fallback, setFallback] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    let cancelled = false;
    let cleanup = () => {};

    // WebGL の判定もマイクロタスクに逃がす。エフェクト内で同期に setState すると
    // 余計な再レンダーが連鎖するため。
    Promise.resolve()
      .then(() => {
        if (!supportsWebGL()) throw new Error("WebGL unavailable");
        // three は重いので、ヒーローが必要になってから読み込む
        return import("./FluidSimulation");
      })
      .then(({ FluidSimulation }) => {
        if (cancelled) return;

        const coarse = window.matchMedia("(pointer: coarse)").matches;
        const simulation = new FluidSimulation({
          canvas,
          text,
          quality: coarse || window.innerWidth < 768 ? "low" : "high",
        });

        const applySize = () => {
          const rect = container.getBoundingClientRect();
          simulation.resize(rect.width, rect.height);
        };
        applySize();

        const reduced = prefersReducedMotion();
        if (reduced) {
          simulation.renderStill();
        } else {
          simulation.start();
        }

        const resizeObserver = new ResizeObserver(applySize);
        resizeObserver.observe(container);

        const onPointerMove = (event: PointerEvent) => {
          const rect = container.getBoundingClientRect();
          simulation.setPointer(
            (event.clientX - rect.left) / rect.width,
            1 - (event.clientY - rect.top) / rect.height,
            true,
          );
        };

        // 画面外・非表示のあいだは回さない
        const intersectionObserver = new IntersectionObserver(
          ([entry]) => {
            if (reduced) return;
            if (entry.isIntersecting && !document.hidden) simulation.start();
            else simulation.stop();
          },
          { threshold: 0 },
        );
        intersectionObserver.observe(container);

        const onVisibilityChange = () => {
          if (reduced) return;
          if (document.hidden) simulation.stop();
          else simulation.start();
        };

        if (!reduced) {
          window.addEventListener("pointermove", onPointerMove, {
            passive: true,
          });
          document.addEventListener("visibilitychange", onVisibilityChange);
        }

        cleanup = () => {
          resizeObserver.disconnect();
          intersectionObserver.disconnect();
          window.removeEventListener("pointermove", onPointerMove);
          document.removeEventListener("visibilitychange", onVisibilityChange);
          simulation.dispose();
        };
      })
      .catch(() => {
        if (!cancelled) setFallback(true);
      });

    return () => {
      cancelled = true;
      cleanup();
    };
  }, [text]);

  return (
    // 位置決めは呼び出し側の className に任せる。ここで relative を足すと
    // absolute 指定と競合して高さが 0 になる。
    <div ref={containerRef} className={`overflow-hidden ${className}`}>
      {fallback ? (
        <div className="absolute inset-0 grid place-items-center bg-[radial-gradient(120%_90%_at_30%_20%,#2a2a2a_0%,#0a0a0a_55%,#000_100%)]">
          <span
            className="display text-[clamp(3rem,17vw,14rem)] text-white/12"
            aria-hidden="true"
          >
            {text}
          </span>
        </div>
      ) : (
        <canvas ref={canvasRef} className="absolute inset-0 block h-full w-full" />
      )}
    </div>
  );
}
