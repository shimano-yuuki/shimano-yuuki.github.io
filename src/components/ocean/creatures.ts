/**
 * 海の生き物のシルエット。
 *
 * 外部画像は持たず、Canvas 2D のパスとしてここに描く。
 * 逆光の影として見せるので、内部のディテールは描かず輪郭だけで形を成立させる。
 *
 * 各関数は 1×1 の正規化座標系に描く。呼び出し側が任意のサイズへ拡大する。
 */

export type CreatureId =
  | "fish"
  | "school"
  | "shark"
  | "jellyfish"
  | "manta"
  | "whale"
  | "squid"
  | "anglerfish";

type Painter = (ctx: CanvasRenderingContext2D, size: number) => void;

/** なめらかな閉曲線を、点列から Catmull-Rom 風に引く。 */
function closedCurve(
  ctx: CanvasRenderingContext2D,
  points: [number, number][],
  size: number,
) {
  const p = points.map(([x, y]) => [x * size, y * size] as [number, number]);
  ctx.beginPath();
  ctx.moveTo((p[0][0] + p[p.length - 1][0]) / 2, (p[0][1] + p[p.length - 1][1]) / 2);
  for (let i = 0; i < p.length; i += 1) {
    const current = p[i];
    const next = p[(i + 1) % p.length];
    ctx.quadraticCurveTo(
      current[0],
      current[1],
      (current[0] + next[0]) / 2,
      (current[1] + next[1]) / 2,
    );
  }
  ctx.closePath();
  ctx.fill();
}

/**
 * 小魚。細めの紡錘形に、独立した背びれと深く切れ込んだ尾。
 * 体を太くすると背びれがコブに見えて魚に読めなくなるので、体高は抑える。
 */
const fish: Painter = (ctx, s) => {
  // 胴。鼻先を尖らせ、尾に向けて細く絞る。
  ctx.beginPath();
  ctx.moveTo(0.96 * s, 0.5 * s);
  ctx.bezierCurveTo(0.82 * s, 0.38 * s, 0.58 * s, 0.36 * s, 0.36 * s, 0.42 * s);
  ctx.bezierCurveTo(0.3 * s, 0.44 * s, 0.26 * s, 0.47 * s, 0.24 * s, 0.5 * s);
  ctx.bezierCurveTo(0.26 * s, 0.53 * s, 0.3 * s, 0.56 * s, 0.36 * s, 0.58 * s);
  ctx.bezierCurveTo(0.58 * s, 0.64 * s, 0.82 * s, 0.62 * s, 0.96 * s, 0.5 * s);
  ctx.closePath();
  ctx.fill();

  // 背びれ。胴から立ち上がる三角。
  ctx.beginPath();
  ctx.moveTo(0.68 * s, 0.38 * s);
  ctx.quadraticCurveTo(0.6 * s, 0.2 * s, 0.44 * s, 0.28 * s);
  ctx.quadraticCurveTo(0.46 * s, 0.36 * s, 0.44 * s, 0.41 * s);
  ctx.closePath();
  ctx.fill();

  // 腹びれ
  ctx.beginPath();
  ctx.moveTo(0.66 * s, 0.61 * s);
  ctx.quadraticCurveTo(0.6 * s, 0.72 * s, 0.5 * s, 0.7 * s);
  ctx.quadraticCurveTo(0.54 * s, 0.64 * s, 0.54 * s, 0.6 * s);
  ctx.closePath();
  ctx.fill();

  // 尾びれ。付け根を細くして、深い二又にする。
  ctx.beginPath();
  ctx.moveTo(0.26 * s, 0.5 * s);
  ctx.lineTo(0.03 * s, 0.24 * s);
  ctx.quadraticCurveTo(0.15 * s, 0.5 * s, 0.03 * s, 0.76 * s);
  ctx.closePath();
  ctx.fill();
};

/** 魚群。小魚を塊として散らし、1つのテクスチャに焼く。 */
const school: Painter = (ctx, s) => {
  const layout: [number, number, number][] = [
    [0.12, 0.46, 0.2], [0.3, 0.3, 0.22], [0.48, 0.44, 0.24],
    [0.66, 0.28, 0.2], [0.82, 0.42, 0.18], [0.24, 0.66, 0.21],
    [0.44, 0.74, 0.19], [0.62, 0.62, 0.22], [0.78, 0.72, 0.17],
    [0.36, 0.14, 0.16], [0.58, 0.86, 0.16], [0.9, 0.6, 0.15],
  ];
  for (const [x, y, scale] of layout) {
    ctx.save();
    ctx.translate(x * s, y * s);
    ctx.scale(scale, scale);
    ctx.translate(-0.5 * s, -0.5 * s);
    fish(ctx, s);
    ctx.restore();
  }
};

/** サメ。背びれと三日月形の尾で輪郭だけでも識別できる。 */
const shark: Painter = (ctx, s) => {
  closedCurve(
    ctx,
    [
      [0.97, 0.52],
      [0.82, 0.43],
      [0.6, 0.38],
      [0.38, 0.4],
      [0.22, 0.46],
      [0.24, 0.56],
      [0.42, 0.6],
      [0.66, 0.61],
      [0.86, 0.58],
    ],
    s,
  );
  // 背びれ
  ctx.beginPath();
  ctx.moveTo(0.62 * s, 0.39 * s);
  ctx.lineTo(0.52 * s, 0.12 * s);
  ctx.quadraticCurveTo(0.46 * s, 0.3 * s, 0.4 * s, 0.4 * s);
  ctx.closePath();
  ctx.fill();
  // 胸びれ
  ctx.beginPath();
  ctx.moveTo(0.66 * s, 0.58 * s);
  ctx.lineTo(0.52 * s, 0.8 * s);
  ctx.quadraticCurveTo(0.62 * s, 0.64 * s, 0.76 * s, 0.58 * s);
  ctx.closePath();
  ctx.fill();
  // 尾びれ（上葉が長い）
  ctx.beginPath();
  ctx.moveTo(0.24 * s, 0.5 * s);
  ctx.lineTo(0.03 * s, 0.16 * s);
  ctx.quadraticCurveTo(0.16 * s, 0.5 * s, 0.08 * s, 0.78 * s);
  ctx.quadraticCurveTo(0.18 * s, 0.62 * s, 0.24 * s, 0.56 * s);
  ctx.closePath();
  ctx.fill();
};

/** クラゲ。傘のドームと、長さの違う触手。 */
const jellyfish: Painter = (ctx, s) => {
  // 傘
  ctx.beginPath();
  ctx.moveTo(0.16 * s, 0.42 * s);
  ctx.bezierCurveTo(0.18 * s, 0.1 * s, 0.82 * s, 0.1 * s, 0.84 * s, 0.42 * s);
  // 裾の波打ち
  ctx.bezierCurveTo(0.76 * s, 0.5 * s, 0.72 * s, 0.4 * s, 0.64 * s, 0.47 * s);
  ctx.bezierCurveTo(0.58 * s, 0.52 * s, 0.54 * s, 0.42 * s, 0.5 * s, 0.47 * s);
  ctx.bezierCurveTo(0.46 * s, 0.42 * s, 0.42 * s, 0.52 * s, 0.36 * s, 0.47 * s);
  ctx.bezierCurveTo(0.28 * s, 0.4 * s, 0.24 * s, 0.5 * s, 0.16 * s, 0.42 * s);
  ctx.closePath();
  ctx.fill();

  // 触手
  const tentacles: [number, number, number][] = [
    [0.26, 0.86, 0.035], [0.36, 0.95, 0.028], [0.46, 0.99, 0.032],
    [0.56, 0.93, 0.028], [0.66, 0.98, 0.03], [0.75, 0.84, 0.026],
  ];
  for (const [x, length, width] of tentacles) {
    ctx.beginPath();
    ctx.moveTo((x - width) * s, 0.44 * s);
    ctx.bezierCurveTo(
      (x - width * 2.2) * s, 0.62 * s,
      (x + width * 2.6) * s, 0.74 * s,
      (x + width * 0.4) * s, length * s,
    );
    ctx.bezierCurveTo(
      (x + width * 2.4) * s, 0.74 * s,
      (x + width * 1.4) * s, 0.62 * s,
      (x + width) * s, 0.44 * s,
    );
    ctx.closePath();
    ctx.fill();
  }
};

/** マンタ。正面やや上から見た菱形の翼と長い尾。 */
const manta: Painter = (ctx, s) => {
  ctx.beginPath();
  ctx.moveTo(0.5 * s, 0.24 * s);
  // 右翼
  ctx.bezierCurveTo(0.68 * s, 0.22 * s, 0.92 * s, 0.36 * s, 0.99 * s, 0.56 * s);
  ctx.bezierCurveTo(0.9 * s, 0.56 * s, 0.74 * s, 0.5 * s, 0.62 * s, 0.58 * s);
  ctx.bezierCurveTo(0.58 * s, 0.62 * s, 0.54 * s, 0.64 * s, 0.5 * s, 0.64 * s);
  // 左翼
  ctx.bezierCurveTo(0.46 * s, 0.64 * s, 0.42 * s, 0.62 * s, 0.38 * s, 0.58 * s);
  ctx.bezierCurveTo(0.26 * s, 0.5 * s, 0.1 * s, 0.56 * s, 0.01 * s, 0.56 * s);
  ctx.bezierCurveTo(0.08 * s, 0.36 * s, 0.32 * s, 0.22 * s, 0.5 * s, 0.24 * s);
  ctx.closePath();
  ctx.fill();

  // 頭鰭
  for (const dx of [-0.1, 0.1]) {
    ctx.beginPath();
    ctx.moveTo((0.5 + dx * 0.6) * s, 0.26 * s);
    ctx.quadraticCurveTo(
      (0.5 + dx * 1.5) * s, 0.13 * s,
      (0.5 + dx * 1.1) * s, 0.08 * s,
    );
    ctx.quadraticCurveTo(
      (0.5 + dx * 1.0) * s, 0.18 * s,
      (0.5 + dx * 0.25) * s, 0.27 * s,
    );
    ctx.closePath();
    ctx.fill();
  }

  // 尾
  ctx.beginPath();
  ctx.moveTo(0.47 * s, 0.62 * s);
  ctx.quadraticCurveTo(0.5 * s, 0.86 * s, 0.52 * s, 0.99 * s);
  ctx.quadraticCurveTo(0.53 * s, 0.86 * s, 0.53 * s, 0.62 * s);
  ctx.closePath();
  ctx.fill();
};

/**
 * ザトウクジラ。
 * 魚と見分けがつく識別点は3つ。丸く大きな頭、体長の3分の1もある長い胸びれ、
 * 中央が切れ込んだ水平の尾びれ。この3つを外すとただの太った魚に見えるので、
 * それぞれを大きく誇張して描く。
 */
const whale: Painter = (ctx, s) => {
  // 胴。頭が丸く重く、尾に向かって細く絞られる。
  ctx.beginPath();
  ctx.moveTo(0.97 * s, 0.44 * s);
  // 頭の上面から背中へ
  ctx.bezierCurveTo(0.9 * s, 0.34 * s, 0.72 * s, 0.31 * s, 0.54 * s, 0.34 * s);
  // 背中から尾の付け根へ
  ctx.bezierCurveTo(0.38 * s, 0.37 * s, 0.26 * s, 0.43 * s, 0.19 * s, 0.48 * s);
  ctx.lineTo(0.19 * s, 0.53 * s);
  // 尾の付け根から腹へ
  ctx.bezierCurveTo(0.28 * s, 0.57 * s, 0.4 * s, 0.62 * s, 0.56 * s, 0.65 * s);
  // 腹から喉（下顎が膨らむ）
  ctx.bezierCurveTo(0.76 * s, 0.69 * s, 0.92 * s, 0.62 * s, 0.99 * s, 0.5 * s);
  ctx.closePath();
  ctx.fill();

  // 小さな背びれ。体の3分の2あたりの低いコブ。
  ctx.beginPath();
  ctx.moveTo(0.44 * s, 0.36 * s);
  ctx.quadraticCurveTo(0.4 * s, 0.28 * s, 0.34 * s, 0.38 * s);
  ctx.closePath();
  ctx.fill();

  // 長い胸びれ。前方から後ろ下へ大きく張り出す。
  ctx.beginPath();
  ctx.moveTo(0.76 * s, 0.6 * s);
  ctx.bezierCurveTo(0.7 * s, 0.78 * s, 0.54 * s, 0.92 * s, 0.36 * s, 0.95 * s);
  ctx.bezierCurveTo(0.5 * s, 0.86 * s, 0.62 * s, 0.72 * s, 0.66 * s, 0.58 * s);
  ctx.closePath();
  ctx.fill();

  // 尾びれ。中央に切れ込みのある水平の三日月。ここが一番の識別点。
  ctx.beginPath();
  ctx.moveTo(0.2 * s, 0.5 * s);
  // 上葉
  ctx.bezierCurveTo(0.16 * s, 0.4 * s, 0.1 * s, 0.24 * s, 0.01 * s, 0.14 * s);
  ctx.bezierCurveTo(0.06 * s, 0.3 * s, 0.08 * s, 0.42 * s, 0.11 * s, 0.5 * s);
  // 中央の切れ込み
  ctx.lineTo(0.08 * s, 0.5 * s);
  // 下葉
  ctx.bezierCurveTo(0.08 * s, 0.58 * s, 0.06 * s, 0.7 * s, 0.01 * s, 0.86 * s);
  ctx.bezierCurveTo(0.1 * s, 0.76 * s, 0.16 * s, 0.6 * s, 0.2 * s, 0.5 * s);
  ctx.closePath();
  ctx.fill();
};

/** 大王イカ。外套膜のひれ、8本の腕、2本の長い触腕。 */
const squid: Painter = (ctx, s) => {
  // 外套膜
  ctx.beginPath();
  ctx.moveTo(0.5 * s, 0.02 * s);
  ctx.bezierCurveTo(0.61 * s, 0.1 * s, 0.62 * s, 0.28 * s, 0.58 * s, 0.4 * s);
  ctx.bezierCurveTo(0.55 * s, 0.46 * s, 0.45 * s, 0.46 * s, 0.42 * s, 0.4 * s);
  ctx.bezierCurveTo(0.38 * s, 0.28 * s, 0.39 * s, 0.1 * s, 0.5 * s, 0.02 * s);
  ctx.closePath();
  ctx.fill();

  // ひれ
  ctx.beginPath();
  ctx.moveTo(0.5 * s, 0.04 * s);
  ctx.quadraticCurveTo(0.78 * s, 0.06 * s, 0.72 * s, 0.2 * s);
  ctx.quadraticCurveTo(0.62 * s, 0.16 * s, 0.5 * s, 0.16 * s);
  ctx.quadraticCurveTo(0.38 * s, 0.16 * s, 0.28 * s, 0.2 * s);
  ctx.quadraticCurveTo(0.22 * s, 0.06 * s, 0.5 * s, 0.04 * s);
  ctx.closePath();
  ctx.fill();

  // 腕（短め・8本）
  const arms: [number, number, number][] = [
    [0.44, 0.72, -0.05], [0.47, 0.8, -0.02], [0.5, 0.84, 0.01],
    [0.53, 0.79, 0.04], [0.56, 0.7, 0.07], [0.41, 0.66, -0.08],
    [0.59, 0.64, 0.1], [0.5, 0.7, 0],
  ];
  for (const [x, end, drift] of arms) {
    ctx.beginPath();
    ctx.moveTo((x - 0.016) * s, 0.42 * s);
    ctx.bezierCurveTo(
      (x - 0.05 + drift) * s, 0.56 * s,
      (x + 0.06 + drift) * s, 0.64 * s,
      (x + drift * 1.6) * s, end * s,
    );
    ctx.bezierCurveTo(
      (x + 0.05 + drift) * s, 0.64 * s,
      (x + 0.02 + drift) * s, 0.56 * s,
      (x + 0.016) * s, 0.42 * s,
    );
    ctx.closePath();
    ctx.fill();
  }

  // 触腕（2本だけ極端に長い＝ダイオウイカの識別点）
  for (const [x, sway] of [[0.46, -0.14], [0.54, 0.15]] as const) {
    ctx.beginPath();
    ctx.moveTo((x - 0.012) * s, 0.42 * s);
    ctx.bezierCurveTo(
      (x + sway * 0.6) * s, 0.62 * s,
      (x - sway * 0.8) * s, 0.8 * s,
      (x + sway) * s, 0.97 * s,
    );
    ctx.bezierCurveTo(
      (x - sway * 0.6) * s, 0.8 * s,
      (x + sway * 0.9) * s, 0.62 * s,
      (x + 0.012) * s, 0.42 * s,
    );
    ctx.closePath();
    ctx.fill();
    // 触腕の先端の膨らみ
    ctx.beginPath();
    ctx.ellipse(
      (x + sway) * s, 0.94 * s,
      0.022 * s, 0.045 * s,
      sway * 2, 0, Math.PI * 2,
    );
    ctx.fill();
  }
};

/**
 * チョウチンアンコウ。
 * 提灯は別テクスチャで光らせるので、ここでは柄と球の輪郭までを描く。
 */
const anglerfish: Painter = (ctx, s) => {
  // ずんぐりした体
  closedCurve(
    ctx,
    [
      [0.78, 0.52],
      [0.7, 0.36],
      [0.52, 0.28],
      [0.34, 0.32],
      [0.24, 0.46],
      [0.26, 0.62],
      [0.42, 0.74],
      [0.64, 0.72],
      [0.76, 0.62],
    ],
    s,
  );

  // 大きく開いた口と牙
  ctx.beginPath();
  ctx.moveTo(0.79 * s, 0.5 * s);
  ctx.quadraticCurveTo(0.66 * s, 0.44 * s, 0.56 * s, 0.46 * s);
  ctx.lineTo(0.6 * s, 0.53 * s);
  ctx.quadraticCurveTo(0.7 * s, 0.58 * s, 0.8 * s, 0.6 * s);
  ctx.closePath();
  ctx.fill();
  for (let i = 0; i < 5; i += 1) {
    const x = 0.6 + i * 0.045;
    ctx.beginPath();
    ctx.moveTo(x * s, 0.47 * s);
    ctx.lineTo((x + 0.012) * s, 0.555 * s);
    ctx.lineTo((x + 0.026) * s, 0.47 * s);
    ctx.closePath();
    ctx.fill();
  }

  // 尾びれ
  ctx.beginPath();
  ctx.moveTo(0.26 * s, 0.5 * s);
  ctx.lineTo(0.1 * s, 0.34 * s);
  ctx.quadraticCurveTo(0.18 * s, 0.52 * s, 0.11 * s, 0.7 * s);
  ctx.closePath();
  ctx.fill();

  // 誘引突起（提灯の柄）
  ctx.lineWidth = 0.018 * s;
  ctx.strokeStyle = ctx.fillStyle as string;
  ctx.beginPath();
  ctx.moveTo(0.56 * s, 0.3 * s);
  ctx.bezierCurveTo(0.56 * s, 0.12 * s, 0.78 * s, 0.08 * s, 0.86 * s, 0.19 * s);
  ctx.stroke();
  // 提灯の球
  ctx.beginPath();
  ctx.arc(0.88 * s, 0.22 * s, 0.045 * s, 0, Math.PI * 2);
  ctx.fill();
};

export const CREATURE_PAINTERS: Record<CreatureId, Painter> = {
  fish,
  school,
  shark,
  jellyfish,
  manta,
  whale,
  squid,
  anglerfish,
};

/** 提灯やクラゲの帯など、加算合成で光らせる部分の位置（正規化座標）。 */
export const GLOW_POINTS: Partial<Record<CreatureId, [number, number, number]>> =
  {
    // [x, y, 半径]
    anglerfish: [0.88, 0.22, 0.14],
    jellyfish: [0.5, 0.32, 0.3],
  };
