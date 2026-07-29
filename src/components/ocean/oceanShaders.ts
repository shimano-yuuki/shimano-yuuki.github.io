/**
 * 水そのもの以外の層のシェーダー。
 * すべて流体の描画結果の上に加算合成で重ねる。
 */

export const overlayVertex = /* glsl */ `
  varying vec2 vUv;

  void main() {
    vUv = uv;
    gl_Position = vec4(position.xy, 0.0, 1.0);
  }
`;

/**
 * 浅い層の光。
 *
 * - 光条：水面から斜めに差し込む光の柱。うねる水面で幅が揺れる。
 * - カースティクス：水面の凹凸が集光してできる網目。ごく浅いところだけ。
 *
 * どちらも深度でフェードして消える。「深く潜った」実感はここが一番効く。
 */
export const lightFragment = /* glsl */ `
  precision highp float;

  uniform float uTime;
  uniform float uDepth;
  uniform float uAspect;
  uniform vec3 uTint;
  /** 本文の背後を落としている量。読む場所では光も落とす。 */
  uniform float uVeil;

  varying vec2 vUv;

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
    // 深いほど光は届かない
    float shaftFade = smoothstep(0.42, 0.02, uDepth);
    float causticFade = smoothstep(0.16, 0.0, uDepth);

    if (shaftFade <= 0.001 && causticFade <= 0.001) {
      gl_FragColor = vec4(0.0);
      return;
    }

    vec3 light = vec3(0.0);

    // ---- 光条 ----
    // 斜めに倒した座標で縦縞を作り、ゆっくり流す
    vec2 shaftUv = vec2(vUv.x * uAspect, vUv.y);
    float slant = shaftUv.x + (1.0 - shaftUv.y) * 0.55;

    float beams =
        pow(max(sin(slant * 7.0 - uTime * 0.09), 0.0), 7.0) * 0.7
      + pow(max(sin(slant * 13.0 + uTime * 0.06), 0.0), 11.0) * 0.45
      + pow(max(sin(slant * 23.0 - uTime * 0.13), 0.0), 15.0) * 0.3;

    // 水面のうねりで柱の幅が揺れる
    beams *= 0.65 + fbm(vec2(slant * 2.0, uTime * 0.05)) * 0.7;

    // 上ほど明るく、下へ伸びるほど減衰する
    float fromSurface = smoothstep(0.0, 0.95, 1.0 - vUv.y);
    beams *= (1.0 - fromSurface * 0.9);

    light += beams * shaftFade * 0.2;

    // ---- カースティクス ----
    // 網目が主役になると水中に見えなくなるので、ごく薄く、
    // かつ画面上部（水面に近いほう）だけに出す。
    if (causticFade > 0.001) {
      vec2 cUv = vec2(vUv.x * uAspect, vUv.y) * 3.0;
      float t = uTime * 0.13;
      // 2枚のうねりの差をとると、網目状の集光になる
      float a = fbm(cUv + vec2(t, t * 0.7));
      float b = fbm(cUv * 1.37 - vec2(t * 0.8, t * 1.1));
      float web = pow(max(1.0 - abs(a - b) * 3.4, 0.0), 11.0);
      // 上端でだけ現れ、下half では消える
      float band = smoothstep(0.28, 0.95, vUv.y);
      light += web * causticFade * band * 0.09;
    }

    // ベールは加算合成の光までは消せない。ここで直接落とす。
    light *= 1.0 - uVeil * 0.82;

    gl_FragColor = vec4(uTint * light, 1.0);
  }
`;

/**
 * 粒子。気泡（浅いところで上へ昇る）とマリンスノー（深いところで下へ降る）を
 * 1つのシェーダーで扱う。頂点側で位置と大きさを決める。
 */
export const particleVertex = /* glsl */ `
  precision highp float;

  attribute vec3 aSeed;      // x, y の初期位置と、個体差の種
  attribute float aKind;     // 0 = 気泡, 1 = マリンスノー

  uniform float uTime;
  uniform float uDepth;
  uniform float uAspect;
  uniform float uPixelRatio;

  varying float vAlpha;
  varying float vKind;

  void main() {
    vKind = aKind;

    float speed = mix(0.075, 0.018, aKind);
    float dir = mix(1.0, -1.0, aKind);
    float seed = aSeed.z;

    // 上下に無限にループさせる
    float y = fract(aSeed.y + uTime * speed * dir * (0.6 + seed * 0.8));
    // 横はゆっくり蛇行させる
    float x = fract(aSeed.x + sin(uTime * 0.12 * (0.4 + seed) + seed * 9.0) * 0.02);

    // 気泡は浅いところだけ、マリンスノーは深いところだけ
    float bubbleFade = smoothstep(0.24, 0.02, uDepth);
    float snowFade = smoothstep(0.3, 0.55, uDepth);
    vAlpha = mix(bubbleFade, snowFade, aKind) * (0.35 + seed * 0.65);

    // 画面の縁で消えるようにして、唐突な出現を隠す
    vAlpha *= smoothstep(0.0, 0.08, y) * smoothstep(1.0, 0.92, y);

    gl_PointSize = mix(2.5, 1.7, aKind) * (0.5 + seed) * uPixelRatio;
    gl_Position = vec4(x * 2.0 - 1.0, y * 2.0 - 1.0, 0.0, 1.0);
  }
`;

export const particleFragment = /* glsl */ `
  precision highp float;

  uniform vec3 uBubbleTint;
  uniform vec3 uSnowTint;

  varying float vAlpha;
  varying float vKind;

  void main() {
    // 点を丸く抜く
    vec2 offset = gl_PointCoord - 0.5;
    float d = length(offset);
    if (d > 0.5) discard;

    float soft = smoothstep(0.5, 0.1, d);
    vec3 tint = mix(uBubbleTint, uSnowTint, vKind);

    // 気泡は輪郭が明るいリング、マリンスノーは中心が明るい粒
    float shape = mix(smoothstep(0.24, 0.46, d) * 1.4 + soft * 0.3, soft, vKind);

    gl_FragColor = vec4(tint * shape, shape * vAlpha);
  }
`;
