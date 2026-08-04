/**
 * スライドショーのプレースホルダー画。
 *
 * 作品の実画像（frontmatter の cover）が用意されるまでの間、
 * slug から決まる配色で抽象的な一枚絵をその場で描く。
 * 差し替えは content/works/*.md の cover にパスを書くだけでよく、
 * このファイルには手を入れない。
 *
 * 絵の中の色はスライドの中だけの色。DOM 側には持ち込まない
 * （docs/DESIGN.md の決まり）。
 */

export type SlidePalette = {
  /** 地の2色。上から下へ落ちるグラデーション */
  base: [string, string];
  /** 光。にじみ・線・粒に使う */
  glow: string;
  /** 光より一段沈んだ中間色。大きな面のにじみに使う */
  accent: string;
};

/** 落ち着いた深い地に、一点の光。slug のハッシュで順に割り当てる */
const PALETTES: SlidePalette[] = [
  { base: ["#12203a", "#05070d"], glow: "#8fd8e0", accent: "#3c6f96" },
  { base: ["#16281a", "#050905"], glow: "#cfe0a0", accent: "#4d7f5c" },
  { base: ["#2a1c31", "#09050c"], glow: "#dfb0cf", accent: "#7c5590" },
  { base: ["#302217", "#0a0704"], glow: "#e6c896", accent: "#9a7440" },
];

function hashSlug(slug: string): number {
  let hash = 5381;
  for (let i = 0; i < slug.length; i += 1) {
    hash = (hash * 33) ^ slug.charCodeAt(i);
  }
  return hash >>> 0;
}

/** 乱数（mulberry32）。同じ slug なら毎回同じ絵になる */
function createRandom(seed: number): () => number {
  let state = seed || 1;
  return () => {
    state |= 0;
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function paletteFor(slug: string): SlidePalette {
  return PALETTES[hashSlug(slug) % PALETTES.length];
}

/** WebGL が使えないときに敷く CSS グラデーション */
export function fallbackGradient(slug: string): string {
  const { base, accent } = paletteFor(slug);
  return `radial-gradient(90rem 60rem at 72% 30%, ${accent}55, transparent 60%), linear-gradient(168deg, ${base[0]}, ${base[1]})`;
}

function withAlpha(hex: string, alpha: number): string {
  const value = Math.round(alpha * 255)
    .toString(16)
    .padStart(2, "0");
  return `${hex}${value}`;
}

/**
 * 抽象的な一枚絵を描いて canvas で返す。WebGL のテクスチャになる。
 * 構成: 地 → 大きな光のにじみ → 同心の弧 → 斜めの細い線 → 粒 → 粒子ノイズ → 周辺減光
 */
export function createPlaceholderArt(
  slug: string,
  width = 1536,
  height = 960,
): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return canvas;

  const { base, glow, accent } = paletteFor(slug);
  const random = createRandom(hashSlug(slug));

  // 地。わずかに傾けた2色のグラデーション
  const baseGradient = ctx.createLinearGradient(0, 0, width * 0.25, height);
  baseGradient.addColorStop(0, base[0]);
  baseGradient.addColorStop(1, base[1]);
  ctx.fillStyle = baseGradient;
  ctx.fillRect(0, 0, width, height);

  // 大きな光のにじみ。加算合成で、右寄りに主光源、対角に返し
  const mainX = width * (0.55 + random() * 0.3);
  const mainY = height * (0.22 + random() * 0.35);
  const glows = [
    { x: mainX, y: mainY, r: width * (0.4 + random() * 0.16), color: accent, alpha: 0.9 },
    { x: mainX, y: mainY, r: width * (0.16 + random() * 0.08), color: glow, alpha: 0.38 },
    {
      x: width * (0.12 + random() * 0.25),
      y: height * (0.6 + random() * 0.3),
      r: width * (0.24 + random() * 0.12),
      color: accent,
      alpha: 0.4,
    },
  ];
  ctx.globalCompositeOperation = "lighter";
  for (const spot of glows) {
    const g = ctx.createRadialGradient(spot.x, spot.y, 0, spot.x, spot.y, spot.r);
    g.addColorStop(0, withAlpha(spot.color, spot.alpha));
    g.addColorStop(1, withAlpha(spot.color, 0));
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, width, height);
  }
  ctx.globalCompositeOperation = "source-over";

  // 同心の弧。光の中心を軸に、細い線で
  const arcCount = 3 + Math.floor(random() * 3);
  for (let i = 0; i < arcCount; i += 1) {
    const radius = width * (0.12 + random() * 0.42);
    const start = random() * Math.PI * 2;
    ctx.beginPath();
    ctx.arc(mainX, mainY, radius, start, start + Math.PI * (0.5 + random()));
    ctx.strokeStyle = withAlpha(glow, 0.18 + random() * 0.18);
    ctx.lineWidth = 1 + random() * 1.5;
    ctx.stroke();
  }

  // 斜めの細い線。数本だけ、平行に流す
  const lineAngle = -Math.PI / 5 + random() * (Math.PI / 8);
  const lineCount = 2 + Math.floor(random() * 3);
  for (let i = 0; i < lineCount; i += 1) {
    const cx = width * random();
    const cy = height * random();
    const length = width * (0.5 + random() * 0.6);
    ctx.beginPath();
    ctx.moveTo(cx - Math.cos(lineAngle) * length, cy - Math.sin(lineAngle) * length);
    ctx.lineTo(cx + Math.cos(lineAngle) * length, cy + Math.sin(lineAngle) * length);
    ctx.strokeStyle = withAlpha(glow, 0.08 + random() * 0.08);
    ctx.lineWidth = 1;
    ctx.stroke();
  }

  // 粒。光の周りに寄せて散らす
  const dotCount = 36 + Math.floor(random() * 24);
  for (let i = 0; i < dotCount; i += 1) {
    const angle = random() * Math.PI * 2;
    const distance = width * 0.55 * Math.sqrt(random());
    const x = mainX + Math.cos(angle) * distance;
    const y = mainY + Math.sin(angle) * distance * 0.7;
    if (x < 0 || x > width || y < 0 || y > height) continue;
    ctx.beginPath();
    ctx.arc(x, y, 0.8 + random() * 2, 0, Math.PI * 2);
    ctx.fillStyle = withAlpha(glow, 0.15 + random() * 0.4);
    ctx.fill();
  }

  // 粒子ノイズ。面のバンディングを消し、紙のような質感にする
  const image = ctx.getImageData(0, 0, width, height);
  const pixels = image.data;
  for (let i = 0; i < pixels.length; i += 4) {
    const grain = (random() - 0.5) * 12;
    pixels[i] += grain;
    pixels[i + 1] += grain;
    pixels[i + 2] += grain;
  }
  ctx.putImageData(image, 0, 0);

  // 周辺減光。四隅を落として奥行きを出す
  const vignette = ctx.createRadialGradient(
    width * 0.5,
    height * 0.45,
    height * 0.4,
    width * 0.5,
    height * 0.5,
    width * 0.75,
  );
  vignette.addColorStop(0, "rgba(0,0,0,0)");
  vignette.addColorStop(1, "rgba(0,0,0,0.34)");
  ctx.fillStyle = vignette;
  ctx.fillRect(0, 0, width, height);

  return canvas;
}
