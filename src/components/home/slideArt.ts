/**
 * トップの絵をその場で描く道具。2つの絵を受け持つ。
 *
 * 1. スライドショーのサンプル作品画（createPlaceholderArt）
 *    実画像（frontmatter の cover）が用意されるまでの間、slug から決まる
 *    配色の抽象画に、作品名とアプリ画面のモックアップを重ねて
 *    「作品の紹介スライド」として読めるようにする。
 *    差し替えは content/works/*.md の cover にパスを書くだけでよい。
 *
 * 2. ヘッダーの背景画（drawHeaderArt）
 *    名前のタイポを載せる静的な一枚絵。光は右上に寄せ、
 *    文字の載る左と下は黒へ落とす（コントラストは実測で確認する）。
 *
 * 絵の中の色は絵の中だけの色。DOM 側には持ち込まない（docs/DESIGN.md）。
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

/** 文字の色。DOM の fg / fg-muted と同じクリーム白系 */
const INK = "#f2f1e8";
const INK_MUTED = "#b9b7ac";

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
  return `radial-gradient(90rem 60rem at 62% 40%, ${accent}55, transparent 60%), linear-gradient(168deg, ${base[0]}, ${base[1]})`;
}

function withAlpha(hex: string, alpha: number): string {
  const value = Math.round(alpha * 255)
    .toString(16)
    .padStart(2, "0");
  return `${hex}${value}`;
}

/** next/font が発行した実フォント名を CSS 変数から引く（canvas は変数を解決しない） */
function fontFamily(variable: string, fallback: string): string {
  const name = getComputedStyle(document.documentElement)
    .getPropertyValue(variable)
    .trim();
  return name ? `${name}, ${fallback}` : fallback;
}

/* ==========================================================================
   部品
   ========================================================================== */

type Ctx = CanvasRenderingContext2D;

/** 地のグラデーションと、加算合成の光のにじみ */
function paintBase(
  ctx: Ctx,
  width: number,
  height: number,
  palette: SlidePalette,
  lightX: number,
  lightY: number,
  random: () => number,
) {
  const { base, glow, accent } = palette;

  const baseGradient = ctx.createLinearGradient(0, 0, width * 0.25, height);
  baseGradient.addColorStop(0, base[0]);
  baseGradient.addColorStop(1, base[1]);
  ctx.fillStyle = baseGradient;
  ctx.fillRect(0, 0, width, height);

  const glows = [
    { x: lightX, y: lightY, r: width * (0.36 + random() * 0.14), color: accent, alpha: 0.9 },
    { x: lightX, y: lightY, r: width * (0.14 + random() * 0.07), color: glow, alpha: 0.36 },
    {
      x: width * (0.1 + random() * 0.2),
      y: height * (0.65 + random() * 0.25),
      r: width * (0.2 + random() * 0.1),
      color: accent,
      alpha: 0.35,
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

  // 同心の弧と斜めの細い線、光の周りの粒
  const arcCount = 3 + Math.floor(random() * 3);
  for (let i = 0; i < arcCount; i += 1) {
    const radius = width * (0.1 + random() * 0.4);
    const start = random() * Math.PI * 2;
    ctx.beginPath();
    ctx.arc(lightX, lightY, radius, start, start + Math.PI * (0.5 + random()));
    ctx.strokeStyle = withAlpha(glow, 0.16 + random() * 0.16);
    ctx.lineWidth = 1 + random() * 1.5;
    ctx.stroke();
  }

  const lineAngle = -Math.PI / 5 + random() * (Math.PI / 8);
  const lineCount = 2 + Math.floor(random() * 3);
  for (let i = 0; i < lineCount; i += 1) {
    const cx = width * random();
    const cy = height * random();
    const length = width * (0.5 + random() * 0.6);
    ctx.beginPath();
    ctx.moveTo(cx - Math.cos(lineAngle) * length, cy - Math.sin(lineAngle) * length);
    ctx.lineTo(cx + Math.cos(lineAngle) * length, cy + Math.sin(lineAngle) * length);
    ctx.strokeStyle = withAlpha(glow, 0.07 + random() * 0.07);
    ctx.lineWidth = 1;
    ctx.stroke();
  }

  const dotCount = 30 + Math.floor(random() * 20);
  for (let i = 0; i < dotCount; i += 1) {
    const angle = random() * Math.PI * 2;
    const distance = width * 0.5 * Math.sqrt(random());
    const x = lightX + Math.cos(angle) * distance;
    const y = lightY + Math.sin(angle) * distance * 0.7;
    if (x < 0 || x > width || y < 0 || y > height) continue;
    ctx.beginPath();
    ctx.arc(x, y, 0.8 + random() * 2, 0, Math.PI * 2);
    ctx.fillStyle = withAlpha(glow, 0.14 + random() * 0.36);
    ctx.fill();
  }
}

/** 粒子ノイズ。面のバンディングを消し、紙のような質感にする */
function paintGrain(ctx: Ctx, width: number, height: number, random: () => number) {
  const image = ctx.getImageData(0, 0, width, height);
  const pixels = image.data;
  for (let i = 0; i < pixels.length; i += 4) {
    const grain = (random() - 0.5) * 12;
    pixels[i] += grain;
    pixels[i + 1] += grain;
    pixels[i + 2] += grain;
  }
  ctx.putImageData(image, 0, 0);
}

/** 周辺減光 */
function paintVignette(ctx: Ctx, width: number, height: number, strength: number) {
  const vignette = ctx.createRadialGradient(
    width * 0.5,
    height * 0.45,
    height * 0.4,
    width * 0.5,
    height * 0.5,
    width * 0.75,
  );
  vignette.addColorStop(0, "rgba(0,0,0,0)");
  vignette.addColorStop(1, `rgba(0,0,0,${strength})`);
  ctx.fillStyle = vignette;
  ctx.fillRect(0, 0, width, height);
}

/** アプリ画面のモックアップ。丸角の枠に、それらしい行をいくつか */
function paintPhoneMock(
  ctx: Ctx,
  centerX: number,
  centerY: number,
  phoneHeight: number,
  palette: SlidePalette,
) {
  const { glow } = palette;
  const phoneWidth = phoneHeight * 0.47;
  const radius = phoneHeight * 0.07;
  const left = centerX - phoneWidth / 2;
  const top = centerY - phoneHeight / 2;

  ctx.save();
  ctx.translate(centerX, centerY);
  ctx.rotate(-0.05);
  ctx.translate(-centerX, -centerY);

  // 本体。うっすら沈む面と、光を受ける縁
  ctx.beginPath();
  ctx.roundRect(left, top, phoneWidth, phoneHeight, radius);
  ctx.fillStyle = "rgba(0, 0, 0, 0.45)";
  ctx.fill();
  ctx.strokeStyle = withAlpha(glow, 0.75);
  ctx.lineWidth = 2.5;
  ctx.stroke();

  // 画面の中身。上のバー・リスト行・下のタブ
  const pad = phoneWidth * 0.12;
  const innerLeft = left + pad;
  const innerWidth = phoneWidth - pad * 2;

  ctx.fillStyle = withAlpha(INK, 0.5);
  ctx.beginPath();
  ctx.roundRect(innerLeft, top + phoneHeight * 0.09, innerWidth * 0.5, phoneHeight * 0.018, 4);
  ctx.fill();

  for (let row = 0; row < 4; row += 1) {
    const rowTop = top + phoneHeight * (0.2 + row * 0.15);
    ctx.fillStyle = withAlpha(glow, row === 0 ? 0.4 : 0.18);
    ctx.beginPath();
    ctx.roundRect(innerLeft, rowTop, innerWidth, phoneHeight * 0.1, 8);
    ctx.fill();
    ctx.fillStyle = withAlpha(INK, 0.55);
    ctx.beginPath();
    ctx.roundRect(
      innerLeft + innerWidth * 0.08,
      rowTop + phoneHeight * 0.038,
      innerWidth * 0.5,
      phoneHeight * 0.014,
      4,
    );
    ctx.fill();
  }

  for (let dot = 0; dot < 3; dot += 1) {
    ctx.beginPath();
    ctx.arc(
      left + phoneWidth * (0.3 + dot * 0.2),
      top + phoneHeight * 0.93,
      phoneHeight * 0.008,
      0,
      Math.PI * 2,
    );
    ctx.fillStyle = withAlpha(INK, dot === 0 ? 0.7 : 0.3);
    ctx.fill();
  }

  ctx.restore();
}

/* ==========================================================================
   1. サンプル作品画（スライドショーのテクスチャ）
   ========================================================================== */

/**
 * 作品のサンプルスライドを描いて canvas で返す。
 *
 * スライドは全幅×56svh に cover で切り出されるため、確実に見える範囲は
 * 中央の x: 0.25〜0.75 / y: 0.25〜0.75。作品名とモックアップはこの帯に収める。
 */
export function createPlaceholderArt(
  slug: string,
  title: string,
  subtitle?: string,
  width = 1536,
  height = 960,
): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return canvas;

  const palette = paletteFor(slug);
  const random = createRandom(hashSlug(slug));

  // 光とモックアップは右寄り、作品名は左寄り。どちらも安全帯の中
  const lightX = width * (0.6 + random() * 0.08);
  const lightY = height * (0.32 + random() * 0.12);

  paintBase(ctx, width, height, palette, lightX, lightY, random);
  paintPhoneMock(ctx, lightX, height * 0.5, height * 0.48, palette);

  // 作品名の下に地を沈めて、文字を立たせる
  const textShade = ctx.createLinearGradient(width * 0.2, 0, width * 0.58, 0);
  textShade.addColorStop(0, "rgba(0,0,0,0.55)");
  textShade.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = textShade;
  ctx.fillRect(0, 0, width * 0.58, height);

  // 作品名・説明・SAMPLE の印
  const displayFont = fontFamily("--font-display-src", "sans-serif");
  const jpFont = fontFamily("--font-jp-src", "sans-serif");
  const monoFont = fontFamily("--font-mono-src", "monospace");
  const textX = width * 0.27;

  ctx.fillStyle = withAlpha(palette.glow, 0.85);
  ctx.font = `500 ${Math.round(width * 0.013)}px ${monoFont}`;
  ctx.fillText("SAMPLE", textX + 2, height * 0.38);

  ctx.fillStyle = INK;
  ctx.font = `700 ${Math.round(width * 0.055)}px ${displayFont}`;
  ctx.fillText(title, textX, height * 0.47);

  if (subtitle) {
    ctx.fillStyle = INK_MUTED;
    ctx.font = `400 ${Math.round(width * 0.021)}px ${jpFont}`;
    ctx.fillText(subtitle, textX + 3, height * 0.54);
  }

  paintGrain(ctx, width, height, random);
  paintVignette(ctx, width, height, 0.34);

  return canvas;
}

/* ==========================================================================
   2. ヘッダーの背景画
   ========================================================================== */

/**
 * ヘッダーの背景を canvas に直接描く。静的な一枚絵。
 * 光はシアンで右上に。名前の載る左と下は黒へ落とす。
 */
export function drawHeaderArt(
  canvas: HTMLCanvasElement,
  width: number,
  height: number,
) {
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const palette: SlidePalette = {
    base: ["#0c1a29", "#000000"],
    glow: "#8fd8e0",
    accent: "#2e5f7d",
  };
  const random = createRandom(hashSlug("header"));

  paintBase(ctx, width, height, palette, width * 0.76, height * 0.24, random);

  // 文字の載る左と下を黒へ沈める
  const leftShade = ctx.createLinearGradient(0, 0, width * 0.62, 0);
  leftShade.addColorStop(0, "rgba(0,0,0,1)");
  leftShade.addColorStop(0.5, "rgba(0,0,0,0.72)");
  leftShade.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = leftShade;
  ctx.fillRect(0, 0, width * 0.62, height);

  const bottomShade = ctx.createLinearGradient(0, height * 0.4, 0, height);
  bottomShade.addColorStop(0, "rgba(0,0,0,0)");
  bottomShade.addColorStop(1, "rgba(0,0,0,0.9)");
  ctx.fillStyle = bottomShade;
  ctx.fillRect(0, 0, width, height);

  paintGrain(ctx, width, height, random);
}
