import { FadeIn } from "@/components/FadeIn";
import { site } from "@/lib/site";
import { HeroBackdrop } from "./HeroBackdrop";
import { StatusLine } from "./StatusLine";

/**
 * トップ最上段のヘッダー。シアンの光の背景画の上に、
 * 名前（h1）・肩書き・短い自己紹介・ステータス行を載せる。
 * 文字の載る左と下は背景画の側で黒に落としてある（slideArt.drawHeaderArt）。
 * 作品のスライドショーはこの直下に続く。
 */
export function Hero() {
  return (
    // ナビの下へ潜り込ませて、初期表示は光が画面を覆い尽くす。
    // ナビ側は relative z-10 で光の上に重なる（layout/Header.tsx）
    <section className="relative -mt-18 overflow-hidden">
      <HeroBackdrop />

      <div className="measure relative flex min-h-[100svh] flex-col justify-end gap-10 pt-24 pb-12 sm:flex-row sm:items-end sm:justify-between sm:pb-14">
        <FadeIn>
          <h1 className="display text-4xl sm:text-6xl">
            {site.fullName.toUpperCase()}
          </h1>
          <p className="label mt-4 text-fg-muted">
            {site.nameJa} — {site.role}
          </p>
          <p className="mt-7 max-w-md text-sm leading-relaxed text-fg/90">
            ふだんは業務でモバイルアプリをつくっています。
            <br />
            ここには個人でつくったものと、つくる途中で考えたことを置いています。
          </p>
        </FadeIn>

        <StatusLine />
      </div>
    </section>
  );
}
