import { FadeIn } from "@/components/FadeIn";
import { site } from "@/lib/site";
import { StatusLine } from "./StatusLine";

/**
 * トップ最上段のヘッダー。名前・肩書き・短い自己紹介・ステータス行だけで組む。
 * 飾りは書体と余白のみ（DESIGN.md — 巨大タイポや罫の飾りは使わない）。
 * 作品のスライドショーはこの直下に続く。
 */
export function Hero() {
  return (
    <FadeIn
      as="header"
      className="flex flex-col justify-between gap-10 pt-14 pb-14 sm:flex-row sm:items-end sm:pt-20 sm:pb-16"
    >
      <div>
        <h1 className="display text-3xl sm:text-5xl">
          {site.fullName.toUpperCase()}
        </h1>
        <p className="label mt-3 text-fg-faint">
          {site.nameJa} — {site.role}
        </p>
        <p className="mt-7 max-w-md text-sm leading-relaxed text-fg/90">
          ふだんは業務でモバイルアプリをつくっています。
          <br />
          ここには個人でつくったものと、つくる途中で考えたことを置いています。
        </p>
      </div>

      <StatusLine />
    </FadeIn>
  );
}
