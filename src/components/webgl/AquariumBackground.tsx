"use client";

import { useEffect, useRef } from "react";
import type { AquariumScene } from "./AquariumScene";

/**
 * 全ページ共通の背景。固定のキャンバス1枚に水槽を描き、内容はこの上に載る。
 *
 * - WebGL が使えない環境では何も描かず、body の bg-bg がそのまま見える
 * - prefers-reduced-motion では静止した1フレームだけ描く
 * - タブが隠れている間は計算を止める
 */
export function AquariumBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    let scene: AquariumScene | null = null;
    let disposed = false;
    const cleanups: (() => void)[] = [];

    const listen = <K extends keyof WindowEventMap>(
      type: K,
      handler: (event: WindowEventMap[K]) => void,
      options?: AddEventListenerOptions,
    ) => {
      window.addEventListener(type, handler, options);
      cleanups.push(() => window.removeEventListener(type, handler));
    };

    // three（数百KB）を初期表示のクリティカルパスから外す
    import("./AquariumScene").then(({ AquariumScene }) => {
      if (disposed) return;

      const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
      const coarse = window.matchMedia("(pointer: coarse)").matches;

      try {
        scene = new AquariumScene({
          canvas,
          quality: coarse ? "low" : "high",
        });
      } catch {
        return; // WebGL 不可。静的な背景色のままにする
      }
      const aquarium = scene;

      const resize = () => {
        // URL バーの伸縮で発火する高さ変化は無視したいので clientHeight を使う
        aquarium.resize(
          document.documentElement.clientWidth,
          document.documentElement.clientHeight,
        );
      };
      resize();
      listen("resize", resize);

      const applyMotionPreference = () => {
        if (reduced.matches) {
          aquarium.stop();
          aquarium.renderStill();
        } else {
          aquarium.start();
        }
      };
      applyMotionPreference();
      reduced.addEventListener("change", applyMotionPreference);
      cleanups.push(() =>
        reduced.removeEventListener("change", applyMotionPreference),
      );

      listen(
        "pointermove",
        (event) => {
          const width = document.documentElement.clientWidth;
          const height = document.documentElement.clientHeight;
          if (width === 0 || height === 0) return;
          // 魚の座標系（NDC -1〜1、上が +y）へ
          aquarium.setPointer(
            (event.clientX / width) * 2 - 1,
            1 - (event.clientY / height) * 2,
          );
        },
        { passive: true },
      );

      const onVisibility = () => {
        if (reduced.matches) return;
        if (document.hidden) aquarium.stop();
        else aquarium.start();
      };
      document.addEventListener("visibilitychange", onVisibility);
      cleanups.push(() =>
        document.removeEventListener("visibilitychange", onVisibility),
      );
    });

    return () => {
      disposed = true;
      for (const cleanup of cleanups) cleanup();
      scene?.dispose();
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="fixed inset-0 -z-10 h-full w-full"
    />
  );
}
