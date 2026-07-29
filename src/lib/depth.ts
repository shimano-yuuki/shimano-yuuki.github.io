/**
 * サイト全体で共有する「深度」。
 *
 * スクロールがそのまま潜水になる。d = 0 が水面、d = 1 が最深部。
 * ページごとに深度帯を割り当ててあり、ページを移るとその帯へ泳いで移動する。
 */

export type DepthBand = { base: number; span: number };

/** 最深部の実深度（m）。ゲージの表示に使う。 */
export const MAX_DEPTH_METERS = 3200;

/**
 * ルートごとの深度帯。
 * より具体的なパスを先に置き、前方一致で引く。
 */
const BANDS: [prefix: string, band: DepthBand][] = [
  ["/works/", { base: 0.45, span: 0.2 }],
  ["/works", { base: 0.3, span: 0.25 }],
  ["/blog/", { base: 0.65, span: 0.2 }],
  ["/blog", { base: 0.55, span: 0.2 }],
  ["/about", { base: 0.85, span: 0.15 }],
  ["/", { base: 0.0, span: 0.55 }],
];

/**
 * 全画面のヒーローを持つページか。
 * 持つページでは、最初の1画面ぶんは水をそのまま見せたいのでベールを敷かない。
 */
export function hasHero(pathname: string): boolean {
  return pathname === "/" || pathname === "";
}

export function bandFor(pathname: string): DepthBand {
  // 末尾スラッシュの有無を吸収する（静的書き出しは /works/ 形式になる）
  const normalized =
    pathname.length > 1 && pathname.endsWith("/")
      ? pathname.slice(0, -1)
      : pathname;

  for (const [prefix, band] of BANDS) {
    if (prefix === "/") continue;
    const trimmed = prefix.endsWith("/") ? prefix.slice(0, -1) : prefix;
    // "/works/" は下層ページ、"/works" は一覧ページを指す
    if (prefix.endsWith("/")) {
      if (normalized.startsWith(`${trimmed}/`)) return band;
    } else if (normalized === trimmed) {
      return band;
    }
  }
  return { base: 0, span: 0.55 };
}

/** ページ内のスクロール進捗（0〜1）と深度帯から、いまの深度を出す。 */
export function depthFrom(band: DepthBand, progress: number): number {
  return clamp01(band.base + clamp01(progress) * band.span);
}

export function clamp01(value: number): number {
  return value < 0 ? 0 : value > 1 ? 1 : value;
}

/** 深度ゲージの表示。浅いほど細かく、深いほど粗く刻む。 */
export function metersAt(depth: number): number {
  // 実際の海と同じく、上層のほうが変化が濃いので指数的に配分する
  const meters = MAX_DEPTH_METERS * Math.pow(clamp01(depth), 1.7);
  return Math.round(meters / 10) * 10;
}

/** 深度帯の名前。ゲージに添える。 */
export function zoneAt(depth: number): { en: string; ja: string } {
  if (depth < 0.12) return { en: "Surface", ja: "水面" };
  if (depth < 0.34) return { en: "Sunlight Zone", ja: "有光層" };
  if (depth < 0.58) return { en: "Twilight Zone", ja: "薄明帯" };
  if (depth < 0.8) return { en: "Midnight Zone", ja: "漸深層" };
  return { en: "Abyss", ja: "深海" };
}

/**
 * 深度ごとの水の色。
 * 流体の輝度をこのランプに通して着色する。
 * [深度, 暗部 RGB, 明部 RGB] の順。0〜1 の線形値で持つ。
 */
export const WATER_RAMP: [number, [number, number, number], [number, number, number]][] =
  [
    [0.0, [0.02, 0.16, 0.2], [0.78, 0.98, 1.0]],
    [0.18, [0.01, 0.1, 0.16], [0.42, 0.82, 0.88]],
    [0.4, [0.006, 0.05, 0.11], [0.16, 0.5, 0.66]],
    [0.62, [0.003, 0.025, 0.07], [0.07, 0.26, 0.45]],
    [0.82, [0.002, 0.012, 0.038], [0.03, 0.12, 0.26]],
    [1.0, [0.0, 0.004, 0.014], [0.012, 0.05, 0.13]],
  ];

/** ランプを線形補間して、その深度の暗部色・明部色を返す。 */
export function waterColorsAt(depth: number) {
  const d = clamp01(depth);
  for (let i = 0; i < WATER_RAMP.length - 1; i += 1) {
    const [d0, dark0, light0] = WATER_RAMP[i];
    const [d1, dark1, light1] = WATER_RAMP[i + 1];
    if (d >= d0 && d <= d1) {
      const t = (d - d0) / (d1 - d0 || 1);
      return {
        dark: mix3(dark0, dark1, t),
        light: mix3(light0, light1, t),
      };
    }
  }
  const last = WATER_RAMP[WATER_RAMP.length - 1];
  return { dark: last[1], light: last[2] };
}

function mix3(
  a: [number, number, number],
  b: [number, number, number],
  t: number,
): [number, number, number] {
  return [
    a[0] + (b[0] - a[0]) * t,
    a[1] + (b[1] - a[1]) * t,
    a[2] + (b[2] - a[2]) * t,
  ];
}

/** 線形 0〜1 を CSS の 8bit 表記に落とす。 */
export function toCss([r, g, b]: [number, number, number]): string {
  const to8 = (v: number) => Math.round(clamp01(v) * 255);
  return `rgb(${to8(r)} ${to8(g)} ${to8(b)})`;
}
