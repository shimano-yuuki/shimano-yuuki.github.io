"use client";

import { useEffect, useRef } from "react";
import type { AquariumScene } from "./AquariumScene";

/**
 * 全ページ共通の水槽。固定のキャンバス1枚に描く。
 *
 * - md（48rem）以上: 全画面の背景。水は右、文字の載る左は黒
 * - md 未満（スマホ）: 右下に固定の小さな水槽（tank）。背景は黒のまま
 * - WebGL が使えない環境では何も描かず、地の黒がそのまま見える
 * - prefers-reduced-motion では静止した1フレームだけ描く
 * - タブが隠れている間は計算を止める
 */

/** Tailwind の md 境界（48rem）未満。ここでタンク表示に切り替わる */
const NARROW_QUERY = "(max-width: 47.99rem)";
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
      const narrow = window.matchMedia(NARROW_QUERY);

      try {
        scene = new AquariumScene({
          canvas,
          quality: coarse ? "low" : "high",
          layout: narrow.matches ? "tank" : "page",
        });
      } catch {
        return; // WebGL 不可。静的な背景色のままにする
      }
      const aquarium = scene;

      const resize = () => {
        // キャンバスの大きさは CSS が決める（md 未満は右下の小窓、以上は全画面）
        aquarium.resize(canvas.clientWidth, canvas.clientHeight);
      };
      resize();
      listen("resize", resize);

      // 画面幅が md 境界をまたいだら、背景 ⇔ 右下タンクを切り替える
      const applyLayout = () => {
        aquarium.setLayout(narrow.matches ? "tank" : "page");
        resize();
        if (reduced.matches) aquarium.renderStill();
      };
      narrow.addEventListener("change", applyLayout);
      cleanups.push(() =>
        narrow.removeEventListener("change", applyLayout),
      );

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
          // 魚の座標系（NDC -1〜1、上が +y）へ。タンク表示では小窓が基準
          const rect = canvas.getBoundingClientRect();
          if (rect.width === 0 || rect.height === 0) return;
          aquarium.setPointer(
            ((event.clientX - rect.left) / rect.width) * 2 - 1,
            1 - ((event.clientY - rect.top) / rect.height) * 2,
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
      className="fixed -z-10 max-md:right-3 max-md:bottom-3 max-md:h-[min(48vw,14rem)] max-md:w-[min(72vw,21rem)] max-md:rounded-xs max-md:border max-md:border-line md:inset-0 md:h-full md:w-full"
    />
  );
}
