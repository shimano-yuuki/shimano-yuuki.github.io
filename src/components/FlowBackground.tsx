"use client";

import { useEffect, useRef } from "react";
import type { FlowScene } from "./FlowScene";
import { drawHeaderArt } from "@/components/home/slideArt";

/**
 * 固定背景の青い流れ。three.js のシェーダー（FlowScene）で描く。
 *
 * - canvas は position: fixed。スクロールしてもこの絵は画面に残り、
 *   文字と作品のスライドショーだけが上を流れていく
 * - ポインタには反応しない
 * - prefers-reduced-motion: 静止した1フレームだけ描く
 * - WebGL 不可: canvas 2D の静止画（slideArt.drawHeaderArt）に落とす
 * - タブが隠れている間は計算を止める
 */
export function FlowBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    let scene: FlowScene | null = null;
    let disposed = false;
    const cleanups: (() => void)[] = [];

    // WebGL 不可のときの静止画
    const drawFallback = () => {
      const ratio = Math.min(window.devicePixelRatio, 2);
      drawHeaderArt(
        canvas,
        canvas.clientWidth * ratio,
        canvas.clientHeight * ratio,
      );
    };

    // three（数百KB）は初期表示のクリティカルパスから外す
    import("./FlowScene").then(({ FlowScene }) => {
      if (disposed) return;

      const reducedQuery = window.matchMedia("(prefers-reduced-motion: reduce)");

      try {
        scene = new FlowScene({ canvas, reduced: reducedQuery.matches });
      } catch {
        drawFallback();
        window.addEventListener("resize", drawFallback);
        cleanups.push(() => window.removeEventListener("resize", drawFallback));
        return;
      }
      const header = scene;

      const resize = () => header.resize(canvas.clientWidth, canvas.clientHeight);
      resize();
      window.addEventListener("resize", resize);
      cleanups.push(() => window.removeEventListener("resize", resize));

      if (reducedQuery.matches) header.renderStill();
      else header.start();

      const applyMotionPreference = () =>
        header.setReduced(reducedQuery.matches);
      reducedQuery.addEventListener("change", applyMotionPreference);
      cleanups.push(() =>
        reducedQuery.removeEventListener("change", applyMotionPreference),
      );

      const onVisibility = () => {
        if (reducedQuery.matches) return;
        if (document.hidden) header.stop();
        else header.start();
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
