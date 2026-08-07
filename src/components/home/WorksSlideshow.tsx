"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { createPlaceholderArt, fallbackGradient } from "./slideArt";
import type { SlideshowScene } from "./SlideshowScene";

/**
 * トップの作品スライドショー。参照は mofu-dev.com（docs/DESIGN.md）。
 *
 * - 中央の1枚が主役。左右には前後のスライドの端が覗き、続きがあると分かる
 * - 遷移は横へ滑るパン。数秒ごとの自動送りと、ドラッグ（スワイプ）・
 *   覗きのクリック・番号ボタンの手動操作が同じ動きを通る
 * - 絵は中央の枠に contain ではめる（画像は切り抜かず全部見せる）
 * - 中央の絵を押すとその作品の詳細ページへ飛ぶ（ドラッグと区別する）
 * - キャプション（番号・作品名）は絵の上ではなく下に置く。
 *   絵の上の文字はコントラストを実測で保証できないため
 * - ホバー・フォーカス・ドラッグ中・タブ非表示で自動送りは止まる
 * - reduced-motion: 自動送りなし・切り替えは瞬時（ドラッグ操作は生きる）
 * - WebGL 不可: 同じ配色の CSS グラデーションが代わりに見える。
 *   スワイプ・導線・キャプションは DOM なので、絵がなくても全部使える
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

/** 中央スロットの幅。左右に前後のスライドが覗く分を確保する */
function slotWidthFor(frameWidth: number) {
  const peek = Math.min(120, Math.max(28, frameWidth * 0.08));
  const gap = 16; // SlideshowScene の GAP と同じ値
  // 上限は measure の本文幅（88rem − 2.25rem×2）。誌面より広くはしない
  return Math.min(frameWidth - 2 * (peek + gap), 1336);
}

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
  const frameRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sceneRef = useRef<SlideshowScene | null>(null);
  const dragRef = useRef<{ id: number; startX: number; moved: number } | null>(
    null,
  );
  const blockClickRef = useRef(false);
  const [active, setActive] = useState(0);
  const [reduced, setReduced] = useState(false);
  const [paused, setPaused] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [webglReady, setWebglReady] = useState(false);
  const [slotWidth, setSlotWidth] = useState(0);

  // 中央スロットの幅。導線（Link・覗きボタン）の配置に使う
  useEffect(() => {
    const frame = frameRef.current;
    if (!frame) return;
    const update = () => setSlotWidth(slotWidthFor(frame.clientWidth));
    update();
    const observer = new ResizeObserver(update);
    observer.observe(frame);
    return () => observer.disconnect();
  }, []);

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
        scene.resize(
          canvas.clientWidth,
          canvas.clientHeight,
          slotWidthFor(canvas.clientWidth),
        );
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
    if (works.length < 2 || reduced || paused || dragging || hidden) return;
    const id = setInterval(
      () => setActive((index) => (index + 1) % works.length),
      ADVANCE_MS,
    );
    return () => clearInterval(id);
  }, [works.length, reduced, paused, dragging, hidden, active]);

  if (works.length === 0) return null;
  const count = works.length;
  const current = works[active];
  const pad = (index: number) => String(index + 1).padStart(2, "0");
  const total = String(count).padStart(2, "0");

  // クリックとドラッグの区別。数 px 以上動いたらドラッグとみなし、
  // 直後の click（詳細への遷移・覗きの切り替え）を握りつぶす
  const guardClick = (event: React.MouseEvent) => {
    if (blockClickRef.current) {
      event.preventDefault();
      blockClickRef.current = false;
    }
  };

  const onPointerDown = (event: React.PointerEvent) => {
    if (!event.isPrimary || count < 2) return;
    dragRef.current = { id: event.pointerId, startX: event.clientX, moved: 0 };
    blockClickRef.current = false;
    setDragging(true);
    sceneRef.current?.beginDrag();
  };

  const onPointerMove = (event: React.PointerEvent) => {
    const drag = dragRef.current;
    if (!drag || event.pointerId !== drag.id) return;
    const deltaX = event.clientX - drag.startX;
    drag.moved = Math.max(drag.moved, Math.abs(deltaX));
    if (drag.moved > 6 && !blockClickRef.current) {
      blockClickRef.current = true;
      frameRef.current?.setPointerCapture(drag.id);
    }
    sceneRef.current?.dragBy(deltaX);
  };

  const onPointerEnd = (event: React.PointerEvent) => {
    const drag = dragRef.current;
    if (!drag || event.pointerId !== drag.id) return;
    dragRef.current = null;
    setDragging(false);
    const scene = sceneRef.current;
    if (scene) {
      setActive(scene.endDrag());
    } else if (drag.moved > 48) {
      // WebGL 不可でもスワイプで送れるようにする
      const deltaX = event.clientX - drag.startX;
      setActive((index) => (index + (deltaX < 0 ? 1 : -1) + count) % count);
    }
  };

  const sideWidth =
    slotWidth > 0 ? `calc(50% - ${Math.round(slotWidth / 2)}px)` : undefined;

  return (
    <section aria-label="作品スライドショー">
      {/* 絵の帯は端まで広げ、中央の枠（誌面幅まで）に主役を1枚。
          左右には前後のスライドが覗く。touch-pan-y で縦スクロールは妨げない */}
      <div
        ref={frameRef}
        className="relative h-[56svh] min-h-[20rem] w-full touch-pan-y select-none overflow-hidden"
        onPointerEnter={() => setPaused(true)}
        onPointerLeave={() => setPaused(false)}
        onFocus={() => setPaused(true)}
        onBlur={() => setPaused(false)}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerEnd}
        onPointerCancel={onPointerEnd}
      >
        <canvas
          ref={canvasRef}
          aria-hidden="true"
          className={`absolute inset-0 h-full w-full transition-opacity duration-700 ${
            webglReady ? "opacity-100" : "opacity-0"
          }`}
        />

        {/* 中央スロット。押すといまの作品の詳細へ（ドラッグ時は遷移しない） */}
        <Link
          href={`/works/${current.slug}`}
          aria-label={`${current.title} の詳細へ`}
          onClick={guardClick}
          className="absolute inset-y-0 left-1/2 block -translate-x-1/2"
          style={{ width: slotWidth > 0 ? `${slotWidth}px` : "100%" }}
        >
          {/* WebGL 不可のときに見える地。作品と同じ配色。
              稼働後は隠す（枠の外は透明で、後ろの青い流れが見えるため） */}
          <div
            aria-hidden="true"
            className={`absolute inset-0 transition-[background,opacity] duration-700 ${
              webglReady ? "opacity-0" : "opacity-100"
            }`}
            style={{ background: fallbackGradient(current.slug) }}
          />
        </Link>

        {/* 左右の覗き。押すとその隣のスライドへ */}
        {count > 1 && sideWidth ? (
          <>
            <button
              type="button"
              aria-label="前の作品を表示"
              onClick={(event) => {
                guardClick(event);
                if (!event.defaultPrevented)
                  setActive((index) => (index - 1 + count) % count);
              }}
              className="absolute inset-y-0 left-0 cursor-pointer"
              style={{ width: sideWidth }}
            />
            <button
              type="button"
              aria-label="次の作品を表示"
              onClick={(event) => {
                guardClick(event);
                if (!event.defaultPrevented)
                  setActive((index) => (index + 1) % count);
              }}
              className="absolute inset-y-0 right-0 cursor-pointer"
              style={{ width: sideWidth }}
            />
          </>
        ) : null}
      </div>

      {/* キャプション。白地の上に置き、コントラスト基準を確実に守る */}
      <div className="measure flex flex-wrap items-baseline justify-between gap-x-8 gap-y-3 pt-5">
        <Link href={`/works/${current.slug}`} className="group flex items-baseline gap-4">
          <span className="label text-fg-faint">
            {pad(active)} / {total}
          </span>
          <span className="display text-xl transition-colors group-hover:text-accent sm:text-2xl">
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
              className={`label transition-colors hover:text-accent ${
                index === active ? "text-accent" : "text-fg-faint"
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
