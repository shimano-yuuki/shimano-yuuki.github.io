"use client";

import { useEffect, useRef } from "react";
import { drawHeaderArt } from "./slideArt";

/**
 * ヘッダーの背景画。静的な一枚絵を canvas に一度だけ描く
 * （動かないので reduced-motion でもそのまま）。リサイズ時は描き直す。
 */
export function HeroBackdrop() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const draw = () => {
      const width = canvas.clientWidth;
      const height = canvas.clientHeight;
      if (width === 0 || height === 0) return;
      const ratio = Math.min(window.devicePixelRatio, 2);
      drawHeaderArt(canvas, width * ratio, height * ratio);
    };
    draw();
    window.addEventListener("resize", draw);
    return () => window.removeEventListener("resize", draw);
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="absolute inset-0 h-full w-full"
    />
  );
}
