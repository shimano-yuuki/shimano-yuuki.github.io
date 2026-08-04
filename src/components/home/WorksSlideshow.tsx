"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { createPlaceholderArt, fallbackGradient } from "./slideArt";
import type { SlideshowScene } from "./SlideshowScene";

/**
 * トップの作品スライドショー。参照は mofu-dev.com（docs/DESIGN.md）。
 *
 * - 一枚絵が数秒ごとに、にじむような遷移で次の作品へ変わる
 * - 絵を押すとその作品の詳細ページへ飛ぶ
 * - キャプション（番号・作品名）は絵の上ではなく下の黒地に置く。
 *   絵の上の文字はコントラストを実測で保証できないため
 * - ホバー・フォーカス・タブ非表示・reduced-motion で自動送りは止まる
 * - WebGL 不可: 同じ配色の CSS グラデーションが代わりに見える。
 *   導線とキャプションは DOM なので、絵がなくても全部使える
 */

export type SlideWork = {
  slug: string;
  title: string;
  subtitle?: string;
  /** frontmatter の cover。空ならプレースホルダーの抽象画を描く */
  cover?: string;
  year: string;
};

const ADVANCE_MS = 4000;

/** cover の実画像を読む。失敗したらプレースホルダーに落とす */
function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = src;
  });
}

export function WorksSlideshow({ works }: { works: SlideWork[] }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sceneRef = useRef<SlideshowScene | null>(null);
  const [active, setActive] = useState(0);
  const [reduced, setReduced] = useState(false);
  const [paused, setPaused] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [webglReady, setWebglReady] = useState(false);

  // WebGL の準備。three（数百KB）は初期表示のクリティカルパスから外す
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || works.length === 0) return;

    let disposed = false;
    const cleanups: (() => void)[] = [];

    const reducedQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(reducedQuery.matches);

    // サンプル画には作品名を描き込むので、書体が揃ってから描く
    const fontsReady: Promise<unknown> = document.fonts?.ready ?? Promise.resolve();
    const placeholder = (work: SlideWork) =>
      createPlaceholderArt(work.slug, work.title, work.subtitle);

    Promise.all([
      import("./SlideshowScene"),
      ...works.map((work) =>
        work.cover
          ? loadImage(work.cover).catch(() => placeholder(work))
          : fontsReady.then(() => placeholder(work)),
      ),
    ]).then(([{ SlideshowScene }, ...images]) => {
      if (disposed) return;

      let scene: SlideshowScene;
      try {
        scene = new SlideshowScene({
          canvas,
          images,
          reduced: reducedQuery.matches,
        });
      } catch {
        return; // WebGL 不可。CSS のグラデーションのままにする
      }
      sceneRef.current = scene;

      const resize = () =>
        scene.resize(canvas.clientWidth, canvas.clientHeight);
      resize();
      window.addEventListener("resize", resize);
      cleanups.push(() => window.removeEventListener("resize", resize));

      const applyMotionPreference = () => {
        setReduced(reducedQuery.matches);
        scene.setReduced(reducedQuery.matches);
        if (reducedQuery.matches) scene.renderStill();
      };
      if (reducedQuery.matches) scene.renderStill();
      else scene.start();
      reducedQuery.addEventListener("change", applyMotionPreference);
      cleanups.push(() =>
        reducedQuery.removeEventListener("change", applyMotionPreference),
      );

      const onVisibility = () => {
        setHidden(document.hidden);
        if (reducedQuery.matches) return;
        if (document.hidden) scene.stop();
        else scene.start();
      };
      document.addEventListener("visibilitychange", onVisibility);
      cleanups.push(() =>
        document.removeEventListener("visibilitychange", onVisibility),
      );

      setWebglReady(true);
    });

    return () => {
      disposed = true;
      for (const cleanup of cleanups) cleanup();
      sceneRef.current?.dispose();
      sceneRef.current = null;
    };
  }, [works]);

  // スライドの切り替え。手動・自動どちらもここを通る
  useEffect(() => {
    sceneRef.current?.show(active);
  }, [active]);

  // 自動送り。止める条件が1つでもあれば動かさない
  useEffect(() => {
    if (works.length < 2 || reduced || paused || hidden) return;
    const id = setInterval(
      () => setActive((index) => (index + 1) % works.length),
      ADVANCE_MS,
    );
    return () => clearInterval(id);
  }, [works.length, reduced, paused, hidden, active]);

  if (works.length === 0) return null;
  const current = works[active];
  const pad = (index: number) => String(index + 1).padStart(2, "0");
  const total = String(works.length).padStart(2, "0");

  return (
    <section aria-label="作品スライドショー">
      <div
        className="relative h-[56svh] min-h-[20rem] w-full overflow-hidden"
        onPointerEnter={() => setPaused(true)}
        onPointerLeave={() => setPaused(false)}
        onFocus={() => setPaused(true)}
        onBlur={() => setPaused(false)}
      >
        <Link
          href={`/works/${current.slug}`}
          aria-label={`${current.title} の詳細へ`}
          className="group absolute inset-0 block"
        >
          {/* WebGL 不可のときに見える地。作品と同じ配色 */}
          <div
            aria-hidden="true"
            className="absolute inset-0 transition-[background] duration-700"
            style={{ background: fallbackGradient(current.slug) }}
          />
          <canvas
            ref={canvasRef}
            aria-hidden="true"
            className={`absolute inset-0 h-full w-full transition-opacity duration-700 ${
              webglReady ? "opacity-100" : "opacity-0"
            }`}
          />
        </Link>
      </div>

      {/* キャプション。黒地の上に置き、コントラスト基準を確実に守る */}
      <div className="measure flex flex-wrap items-baseline justify-between gap-x-8 gap-y-3 pt-5">
        <Link href={`/works/${current.slug}`} className="group flex items-baseline gap-4">
          <span className="label text-fg-faint">
            {pad(active)} / {total}
          </span>
          <span className="display text-xl transition-colors group-hover:text-cyan sm:text-2xl">
            {current.title}
          </span>
          {current.subtitle ? (
            <span className="hidden text-sm text-fg-muted sm:inline">
              {current.subtitle}
            </span>
          ) : null}
          <span className="label text-fg-faint">{current.year}</span>
        </Link>

        <nav aria-label="スライドの切り替え" className="flex gap-4">
          {works.map((work, index) => (
            <button
              key={work.slug}
              type="button"
              onClick={() => setActive(index)}
              aria-label={`${work.title} を表示`}
              aria-current={index === active}
              className={`label transition-colors hover:text-cyan ${
                index === active ? "text-cyan" : "text-fg-faint"
              }`}
            >
              {pad(index)}
            </button>
          ))}
        </nav>
      </div>
    </section>
  );
}
