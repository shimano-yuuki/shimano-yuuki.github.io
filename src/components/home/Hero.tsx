import { site } from "@/lib/site";

/**
 * 水面。
 * 背景の海はレイアウトが描いているので、ここは水面に浮かぶ文字だけを持つ。
 * 名前は流体シェーダー側に沈めてあるため、ここでは読み上げ用の見出しに留める。
 */
export function Hero() {
  return (
    <section className="relative h-svh w-full">
      {/* 上端＝ナビ、下端＝リード文のための減光 */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-black/55 to-transparent"
      />
      {/* 水面は明るいので、リード文の背後はここで確実に落とす */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 bottom-0 h-72 bg-gradient-to-t from-black/92 via-black/60 to-transparent"
      />

      {/* canvas には文字が無いので、見出しはここで持つ */}
      <h1 className="sr-only">
        {site.fullName} — {site.role}
      </h1>

      <div className="pointer-events-none absolute inset-0 flex flex-col justify-end">
        <div className="measure flex flex-wrap items-end justify-between gap-6 pb-10">
          <p className="max-w-sm text-sm leading-relaxed text-white/95">
            {site.tagline}
            <br />
            つくったものと、つくる途中で考えたことを置いています。
          </p>

          <p className="label flex items-center gap-3 text-white/80">
            Dive
            <span className="block h-px w-10 bg-white/40" />
          </p>
        </div>
      </div>
    </section>
  );
}
