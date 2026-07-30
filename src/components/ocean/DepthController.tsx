"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import { bandFor, clamp01, depthFrom, hasHero } from "@/lib/depth";
import { depthStore } from "./depthStore";

/**
 * スクロール位置とルートから深度を決め、ストアへ流し込む。
 * 描画は一切しない。値を作ることだけに責任を持つ。
 */
export function DepthController() {
  const pathname = usePathname();
  const lastScrollY = useRef(0);
  const firstRoute = useRef(true);

  useEffect(() => {
    const band = bandFor(pathname);
    const heroed = hasHero(pathname);

    const readProgress = () => {
      const scrollable =
        document.documentElement.scrollHeight - window.innerHeight;
      return scrollable > 0 ? window.scrollY / scrollable : 0;
    };

    const update = () => {
      depthStore.setTarget(depthFrom(band, readProgress()));

      // ヒーローのあるページは 0.6 画面ぶんかけて滑らかに暗くする。
      // 線形だと出だしで急に暗くなり「境界」に見えてしまうので、
      // smoothstep で入りと抜きを丸める。
      // 高さの基準は clientHeight。innerHeight はスマホの URL バーの
      // 伸縮で変わり、スクロール中に暗さの基準が揺れてしまう。
      if (heroed) {
        const viewport = document.documentElement.clientHeight || 1;
        const linear = clamp01(window.scrollY / (viewport * 0.6));
        depthStore.setVeil(linear * linear * (3 - 2 * linear));
      } else {
        depthStore.setVeil(1);
      }
    };

    // 初回だけは補間せず、そのページの深度から始める
    if (firstRoute.current) {
      firstRoute.current = false;
      depthStore.snap(depthFrom(band, readProgress()));
      // ベールも初期化する。これを忘れると、直接開いたページが
      // 最初のスクロールまで明るいままで、スクロールした瞬間に急に暗転する
      update();
    } else {
      update();
    }

    lastScrollY.current = window.scrollY;

    const onScroll = () => {
      const delta = window.scrollY - lastScrollY.current;
      lastScrollY.current = window.scrollY;
      // 速度は正規化しておく。1画面ぶん動いたら 1.0。
      depthStore.setVelocity(
        delta / Math.max(document.documentElement.clientHeight, 1),
      );
      update();
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", update, { passive: true });

    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", update);
    };
  }, [pathname]);

  return null;
}
