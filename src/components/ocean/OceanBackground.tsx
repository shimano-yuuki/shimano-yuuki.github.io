"use client";

import { useEffect, useRef, useState } from "react";
import { prefersReducedMotion } from "@/hooks/useReducedMotion";
import { toCss, waterColorsAt } from "@/lib/depth";
import { site } from "@/lib/site";
import { depthStore } from "./depthStore";

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
 * サイト全体の背景になる海。
 *
 * ルートレイアウトに固定で敷き、全ページで共有する。ページを移っても
 * 破棄されないので水は途切れず、深度だけが移り変わる。
 */
export function OceanBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [fallback, setFallback] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    let cancelled = false;
    let cleanup = () => {};

    Promise.resolve()
      .then(() => {
        if (!supportsWebGL()) throw new Error("WebGL unavailable");
        return import("./FluidSimulation");
      })
      .then(({ FluidSimulation }) => {
        if (cancelled) return;

        const coarse = window.matchMedia("(pointer: coarse)").matches;
        const simulation = new FluidSimulation({
          canvas,
          text: site.name,
          quality: coarse || window.innerWidth < 768 ? "low" : "high",
        });

        const applySize = () =>
          simulation.resize(window.innerWidth, window.innerHeight);
        applySize();

        const reduced = prefersReducedMotion();

        // 毎フレーム、深度をストアから取り出して水の色へ反映する
        let lastTime = performance.now();
        let frameId = 0;
        const tick = (now: number) => {
          frameId = requestAnimationFrame(tick);
          const dt = Math.min((now - lastTime) / 1000, 0.05);
          lastTime = now;

          const depth = depthStore.advance(dt);
          const { dark, light } = waterColorsAt(depth);
          simulation.setDepth(depth, dark, light);
          simulation.setVeil(depthStore.getVeil());
          simulation.addFlow(depthStore.getVelocity());
          depthStore.setVelocity(depthStore.getVelocity() * 0.9);
        };

        if (reduced) {
          const depth = depthStore.get();
          const { dark, light } = waterColorsAt(depth);
          simulation.setDepth(depth, dark, light);
          simulation.renderStill();
        } else {
          simulation.start();
          frameId = requestAnimationFrame(tick);
        }

        const onPointerMove = (event: PointerEvent) => {
          simulation.setPointer(
            event.clientX / window.innerWidth,
            1 - event.clientY / window.innerHeight,
            true,
          );
        };

        const onVisibilityChange = () => {
          if (document.hidden) simulation.stop();
          else simulation.start();
        };

        if (!reduced) {
          window.addEventListener("pointermove", onPointerMove, {
            passive: true,
          });
          document.addEventListener("visibilitychange", onVisibilityChange);
        }
        window.addEventListener("resize", applySize);

        cleanup = () => {
          cancelAnimationFrame(frameId);
          window.removeEventListener("pointermove", onPointerMove);
          document.removeEventListener("visibilitychange", onVisibilityChange);
          window.removeEventListener("resize", applySize);
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
  }, []);

  if (fallback) return <OceanFallback />;

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="fixed inset-0 z-0 block h-full w-full"
    />
  );
}

/**
 * WebGL が使えない環境向け。
 * 深度に合わせた単純なグラデーションだけを敷き、内容は完全に読めるようにする。
 */
function OceanFallback() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const paint = (depth: number) => {
      const { dark, light } = waterColorsAt(depth);
      if (!ref.current) return;
      ref.current.style.background = `linear-gradient(180deg, ${toCss(light)} -40%, ${toCss(dark)} 55%, #000 120%)`;
    };
    paint(depthStore.get());
    return depthStore.subscribe(paint);
  }, []);

  return <div ref={ref} aria-hidden="true" className="fixed inset-0 z-0" />;
}
