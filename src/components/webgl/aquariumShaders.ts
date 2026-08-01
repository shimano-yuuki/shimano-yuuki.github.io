/**
 * 水槽（ネイチャーアクアリウム）背景のシェーダー群。
 *
 * 層は奥から、水そのもの → 奥の水草 → 魚 → 手前の水草 → 微細な気泡。
 * 水は縦のグラデーションに光条とカースティクスを重ねただけの一枚絵で、
 * 文字が上に載るため明るさの上限をシェーダー側で抑えている。
 * ここを明るくするときは必ず scripts/verify/contrast.mjs で実測すること
 * （本文 7:1 / 大きい文字 4.5:1。docs/DESIGN.md）。
 */

/** 全画面クアッド。クリップ座標をそのまま出すのでカメラは関与しない。 */
export const clipQuadVertex = /* glsl */ `
  varying vec2 vUv;

  void main() {
    vUv = uv;
    gl_Position = vec4(position.xy, 0.0, 1.0);
  }
`;

/**
 * 水。上ほど水明かりの青、下は底の闇。
 * 斜めの光条は水面のうねりで幅が揺れ、網目の集光は水面近くだけに出す。
 */
export const waterFragment = /* glsl */ `
  precision highp float;

  uniform float uTime;
  uniform float uAspect;

  varying vec2 vUv;

  // 配色（sRGB 0-1）。INK は --color-bg、CYAN は --color-cyan と同じ値
  const vec3 INK  = vec3(0.043, 0.051, 0.063); // #0b0d10
  const vec3 DEEP = vec3(0.027, 0.110, 0.173); // #071c2c
  const vec3 BLUE = vec3(0.055, 0.353, 0.471); // #0e5a78
  const vec3 MINT = vec3(0.561, 0.847, 0.878); // #8fd8e0

  float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
  }

  float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(
      mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x),
      mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x),
      u.y
    );
  }

  float fbm(vec2 p) {
    return noise(p) * 0.55 + noise(p * 2.2) * 0.28 + noise(p * 4.7) * 0.17;
  }

  void main() {
    // 文字は画面の左に載るので、水の明かりはすべて右へ寄せ、
    // 左はほぼ地の黒に沈める
    float right = smoothstep(0.25, 0.9, vUv.x);

    // 底の闇から、上へ向かうほど深い青の水明かりへ（右側だけ）
    vec3 color = mix(
      INK, DEEP, smoothstep(-0.15, 1.1, vUv.y) * (0.25 + right * 0.75)
    );

    // 水のむら。大きくゆっくり動く濃淡で「水の量感」を出す。
    // 混ぜすぎ注意: BLUE は明るく、上に載る小ラベルのコントラストをすぐ食う
    float body = fbm(
      vec2(vUv.x * uAspect * 1.1, vUv.y * 1.5) + vec2(uTime * 0.012, 0.0)
    );
    color = mix(color, BLUE, body * 0.09 * right * smoothstep(0.1, 0.95, vUv.y));

    // ---- 光条。右上から斜めに差し込み、うねりで幅が揺れる ----
    float slant = vUv.x * uAspect + (1.0 - vUv.y) * 0.6;
    float beams =
        pow(max(sin(slant * 5.0 - uTime * 0.07), 0.0), 8.0) * 0.7
      + pow(max(sin(slant * 11.0 + uTime * 0.05), 0.0), 12.0) * 0.45
      + pow(max(sin(slant * 19.0 - uTime * 0.11), 0.0), 16.0) * 0.3;
    beams *= 0.6 + fbm(vec2(slant * 2.0, uTime * 0.04)) * 0.7;
    // 上ほど明るく、下へ伸びるほど減衰する
    beams *= smoothstep(-0.35, 1.0, vUv.y);
    color += MINT * beams * 0.03 * right;

    // ---- カースティクス。水面近くの帯にだけ、ごく薄く（右側だけ） ----
    vec2 cUv = vec2(vUv.x * uAspect, vUv.y) * 3.2;
    float t = uTime * 0.1;
    float a = fbm(cUv + vec2(t, t * 0.7));
    float b = fbm(cUv * 1.37 - vec2(t * 0.8, t * 1.1));
    float web = pow(max(1.0 - abs(a - b) * 3.4, 0.0), 12.0);
    color += MINT * web * smoothstep(0.55, 1.0, vUv.y) * 0.035 * right;

    // 四隅を静かに落とす
    float vignette = 1.0 - length((vUv - vec2(0.5, 0.45)) * vec2(1.1, 1.0)) * 0.3;
    color *= vignette;

    // わずかなディザ。暗部のバンディングを散らす
    float dither =
      fract(sin(dot(vUv * 1024.0 + uTime, vec2(12.9898, 78.233))) * 43758.5453);
    color += (dither - 0.5) * 0.012;

    gl_FragColor = vec4(clamp(color, 0.0, 1.0), 1.0);
  }
`;

/**
 * 水草。1枚の細長い短冊をインスタンスで並べ、頂点シェーダーで
 * 根元を固定したまま先端ほど大きくたわませる。
 * aBlade = (根元x[-1..1], 丈, 傾き, 位相) / aStyle = (幅, 色味, 奥行き層, 濃さ)
 */
export const plantVertex = /* glsl */ `
  precision highp float;

  attribute vec4 aBlade;
  attribute vec4 aStyle;

  uniform float uTime;
  uniform float uAspect;

  varying float vT;
  varying float vEdge;
  varying float vTone;
  varying float vShade;

  void main() {
    float t = uv.y; // 0 = 根元、1 = 先端

    // 揺れ。ゆっくりした主揺れに、細かい従揺れを少し混ぜる。
    // 根元は動かず、先端ほど大きく振れる（t の二乗）
    float sway =
        sin(uTime * 0.45 + aBlade.w + t * 2.1) * 0.055
      + sin(uTime * 0.23 + aBlade.w * 1.7 + t * 3.4) * 0.025;
    float bend = (aBlade.z + sway) * t * t;

    vec3 pos;
    pos.x = aBlade.x * uAspect
      + position.x * aStyle.x * (1.0 - t * 0.72)
      + bend;
    pos.y = -1.02 + t * aBlade.y;
    pos.z = aStyle.z;

    vT = t;
    vEdge = position.x * 2.0; // -1..1
    vTone = aStyle.y;
    vShade = aStyle.w;

    gl_Position = projectionMatrix * viewMatrix * vec4(pos, 1.0);
  }
`;

export const plantFragment = /* glsl */ `
  precision highp float;

  uniform float uOpacity;

  varying float vT;
  varying float vEdge;
  varying float vTone;
  varying float vShade;

  // 根元の闇 → 葉の緑。赤茶（ロタラ系）へは vTone で寄せる。
  // 水は青でも水草は緑——それが水槽の自然な見え方
  const vec3 ROOT = vec3(0.014, 0.05, 0.045);
  const vec3 LEAF = vec3(0.086, 0.333, 0.243);
  const vec3 RUST = vec3(0.282, 0.196, 0.137);
  const vec3 MINT = vec3(0.561, 0.847, 0.878);

  void main() {
    // 縁を柔らかく抜く。中央には浅い葉脈の影
    float edge = smoothstep(1.0, 0.55, abs(vEdge));
    float vein = 1.0 - smoothstep(0.14, 0.0, abs(vEdge)) * 0.3;

    vec3 leaf = mix(LEAF, RUST, vTone);
    vec3 color = mix(ROOT, leaf, smoothstep(0.0, 0.85, vT) * 0.9);
    color *= vein * vShade;

    // 上から差す水明かりを先端にだけほんのり
    color += MINT * pow(vT, 2.4) * 0.05 * vShade;

    gl_FragColor = vec4(color, edge * uOpacity);
  }
`;

/**
 * 微細な気泡。ゆっくり昇りながらわずかに蛇行する点描。
 * aSeed = (x, y の初期位置, 個体差の種)
 */
export const moteVertex = /* glsl */ `
  precision highp float;

  attribute vec3 aSeed;

  uniform float uTime;
  uniform float uPixelRatio;

  varying float vAlpha;

  void main() {
    float seed = aSeed.z;

    // 昇り続け、上端まで行ったら下からループする
    float y = fract(aSeed.y + uTime * 0.014 * (0.5 + seed * 0.9));
    float x = fract(
      aSeed.x + sin(uTime * 0.15 * (0.3 + seed) + seed * 11.0) * 0.014
    );

    vAlpha = 0.16 + seed * 0.22;
    // 画面の縁で消えるようにして、唐突な出現を隠す
    vAlpha *= smoothstep(0.0, 0.1, y) * smoothstep(1.0, 0.88, y);

    gl_PointSize = (1.0 + seed * 1.8) * uPixelRatio;
    gl_Position = vec4(x * 2.0 - 1.0, y * 2.0 - 1.0, 0.0, 1.0);
  }
`;

export const moteFragment = /* glsl */ `
  precision highp float;

  uniform float uOpacity;

  varying float vAlpha;

  const vec3 MINT = vec3(0.561, 0.847, 0.878);

  void main() {
    vec2 offset = gl_PointCoord - 0.5;
    float d = length(offset);
    if (d > 0.5) discard;

    float soft = smoothstep(0.5, 0.12, d);
    gl_FragColor = vec4(MINT * soft, soft * vAlpha * uOpacity);
  }
`;
