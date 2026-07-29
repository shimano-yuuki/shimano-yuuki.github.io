"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import { bandFor, depthFrom } from "@/lib/depth";
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

    const readProgress = () => {
      const scrollable =
        document.documentElement.scrollHeight - window.innerHeight;
      return scrollable > 0 ? window.scrollY / scrollable : 0;
    };

    const update = () => {
      depthStore.setTarget(depthFrom(band, readProgress()));
    };

    // 初回だけは補間せず、そのページの深度から始める
    if (firstRoute.current) {
      firstRoute.current = false;
      depthStore.snap(depthFrom(band, readProgress()));
    } else {
      update();
    }

    lastScrollY.current = window.scrollY;

    const onScroll = () => {
      const delta = window.scrollY - lastScrollY.current;
      lastScrollY.current = window.scrollY;
      // 速度は正規化しておく。1画面ぶん動いたら 1.0。
      depthStore.setVelocity(delta / Math.max(window.innerHeight, 1));
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
