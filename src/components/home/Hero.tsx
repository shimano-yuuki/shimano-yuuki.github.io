import { FluidHero } from "@/components/webgl/FluidHero";
import { site } from "@/lib/site";

/**
 * 全画面の流体ヒーロー。
 * 流体は明度が動き回るので、上下に暗いスクリムを敷いて文字の可読性を確保する。
 */
export function Hero() {
  return (
    <section className="relative h-svh w-full">
      <FluidHero text={site.name} className="absolute inset-0" />

      {/* 上端＝ナビ、下端＝リード文のための減光 */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-black/70 to-transparent"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 bottom-0 h-56 bg-gradient-to-t from-black/85 via-black/40 to-transparent"
      />

      {/* 検索エンジンとスクリーンリーダーのための見出し。canvas には文字が無い。 */}
      <h1 className="sr-only">
        {site.fullName} — {site.role}
      </h1>

      <div className="pointer-events-none absolute inset-0 flex flex-col justify-end">
        <div className="measure flex flex-wrap items-end justify-between gap-6 pb-10">
          <p className="max-w-sm text-sm leading-relaxed text-white/75">
            {site.tagline}
            <br />
            つくったものと、つくる途中で考えたことを置いています。
          </p>

          <p className="label flex items-center gap-3 text-white/50">
            Scroll
            <span className="block h-px w-10 bg-white/40" />
          </p>
        </div>
      </div>
    </section>
  );
}
