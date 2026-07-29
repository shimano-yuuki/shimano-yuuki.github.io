/**
 * 流体シミュレーション（Stable Fluids）のシェーダー群。
 *
 * 速度場を「移流 → 渦の強調 → 発散を計算 → 圧力をヤコビ法で解く → 勾配を引く」
 * の順で毎フレーム更新し、非圧縮（体積が変わらない）流れに保つ。
 * 表示パスでは、流体と文字のふたつの高さマップから法線を作り、
 * 屈折とライティングをかけて金属的な起伏として見せる。
 */

/** 全画面クアッド。クリップ座標をそのまま出すのでカメラは関与しない。 */
export const quadVertex = /* glsl */ `
  varying vec2 vUv;

  void main() {
    vUv = uv;
    gl_Position = vec4(position.xy, 0.0, 1.0);
  }
`;

/** 速度場に沿って場を運ぶ。1フレーム前の位置を逆引きして拾う。 */
export const advectionFragment = /* glsl */ `
  precision highp float;
  precision highp sampler2D;

  uniform sampler2D uVelocity;
  uniform sampler2D uSource;
  uniform vec2 uTexelSize;
  uniform float uDt;
  uniform float uDissipation;

  varying vec2 vUv;

  void main() {
    vec2 coord = vUv - uDt * texture2D(uVelocity, vUv).xy * uTexelSize;
    vec4 result = texture2D(uSource, coord);
    gl_FragColor = result / (1.0 + uDissipation * uDt);
  }
`;

/** 速度場の発散。ここが 0 でないぶんだけ圧力で押し戻す。 */
export const divergenceFragment = /* glsl */ `
  precision highp float;
  precision highp sampler2D;

  uniform sampler2D uVelocity;
  uniform vec2 uTexelSize;

  varying vec2 vUv;

  void main() {
    float left = texture2D(uVelocity, vUv - vec2(uTexelSize.x, 0.0)).x;
    float right = texture2D(uVelocity, vUv + vec2(uTexelSize.x, 0.0)).x;
    float bottom = texture2D(uVelocity, vUv - vec2(0.0, uTexelSize.y)).y;
    float top = texture2D(uVelocity, vUv + vec2(0.0, uTexelSize.y)).y;

    gl_FragColor = vec4(0.5 * (right - left + top - bottom), 0.0, 0.0, 1.0);
  }
`;

/** 渦度。周りとの回転差を測る。 */
export const curlFragment = /* glsl */ `
  precision highp float;
  precision highp sampler2D;

  uniform sampler2D uVelocity;
  uniform vec2 uTexelSize;

  varying vec2 vUv;

  void main() {
    float left = texture2D(uVelocity, vUv - vec2(uTexelSize.x, 0.0)).y;
    float right = texture2D(uVelocity, vUv + vec2(uTexelSize.x, 0.0)).y;
    float bottom = texture2D(uVelocity, vUv - vec2(0.0, uTexelSize.y)).x;
    float top = texture2D(uVelocity, vUv + vec2(0.0, uTexelSize.y)).x;

    gl_FragColor = vec4(0.5 * (right - left - top + bottom), 0.0, 0.0, 1.0);
  }
`;

/**
 * 渦度の勾配方向へ力を足し、数値拡散で潰れた渦を復活させる。
 * これが無いと、ただ滲んで消えるだけの動きになる。
 */
export const vorticityFragment = /* glsl */ `
  precision highp float;
  precision highp sampler2D;

  uniform sampler2D uVelocity;
  uniform sampler2D uCurl;
  uniform vec2 uTexelSize;
  uniform float uCurlStrength;
  uniform float uDt;

  varying vec2 vUv;

  void main() {
    float left = texture2D(uCurl, vUv - vec2(uTexelSize.x, 0.0)).x;
    float right = texture2D(uCurl, vUv + vec2(uTexelSize.x, 0.0)).x;
    float bottom = texture2D(uCurl, vUv - vec2(0.0, uTexelSize.y)).x;
    float top = texture2D(uCurl, vUv + vec2(0.0, uTexelSize.y)).x;
    float center = texture2D(uCurl, vUv).x;

    vec2 force = 0.5 * vec2(abs(top) - abs(bottom), abs(right) - abs(left));
    force /= length(force) + 0.0001;
    force *= uCurlStrength * center;
    force.y *= -1.0;

    vec2 velocity = texture2D(uVelocity, vUv).xy + force * uDt;
    velocity = clamp(velocity, -1000.0, 1000.0);

    gl_FragColor = vec4(velocity, 0.0, 1.0);
  }
`;

/** 圧力をヤコビ反復で解く。呼ぶ回数がそのまま精度になる。 */
export const pressureFragment = /* glsl */ `
  precision highp float;
  precision highp sampler2D;

  uniform sampler2D uPressure;
  uniform sampler2D uDivergence;
  uniform vec2 uTexelSize;

  varying vec2 vUv;

  void main() {
    float left = texture2D(uPressure, vUv - vec2(uTexelSize.x, 0.0)).x;
    float right = texture2D(uPressure, vUv + vec2(uTexelSize.x, 0.0)).x;
    float bottom = texture2D(uPressure, vUv - vec2(0.0, uTexelSize.y)).x;
    float top = texture2D(uPressure, vUv + vec2(0.0, uTexelSize.y)).x;
    float divergence = texture2D(uDivergence, vUv).x;

    gl_FragColor = vec4(
      (left + right + bottom + top - divergence) * 0.25, 0.0, 0.0, 1.0
    );
  }
`;

/** 圧力の勾配を速度から引き、発散のない流れに戻す。 */
export const gradientSubtractFragment = /* glsl */ `
  precision highp float;
  precision highp sampler2D;

  uniform sampler2D uPressure;
  uniform sampler2D uVelocity;
  uniform vec2 uTexelSize;

  varying vec2 vUv;

  void main() {
    float left = texture2D(uPressure, vUv - vec2(uTexelSize.x, 0.0)).x;
    float right = texture2D(uPressure, vUv + vec2(uTexelSize.x, 0.0)).x;
    float bottom = texture2D(uPressure, vUv - vec2(0.0, uTexelSize.y)).x;
    float top = texture2D(uPressure, vUv + vec2(0.0, uTexelSize.y)).x;

    vec2 velocity = texture2D(uVelocity, vUv).xy;
    velocity -= vec2(right - left, top - bottom) * 0.5;

    gl_FragColor = vec4(velocity, 0.0, 1.0);
  }
`;

/** ポインタや自動の攪拌点から、外力と濃度を注入する。 */
export const splatFragment = /* glsl */ `
  precision highp float;
  precision highp sampler2D;

  uniform sampler2D uTarget;
  uniform float uAspectRatio;
  uniform vec3 uValue;
  uniform vec2 uPoint;
  uniform float uRadius;

  varying vec2 vUv;

  void main() {
    vec2 offset = vUv - uPoint;
    offset.x *= uAspectRatio;

    vec3 splat = exp(-dot(offset, offset) / uRadius) * uValue;
    vec3 base = texture2D(uTarget, vUv).xyz;

    gl_FragColor = vec4(base + splat, 1.0);
  }
`;

/**
 * 濃度場の初期値。
 * 空の黒から始めると、攪拌が通った細い筋しか光らない。
 * 最初から全面に緩やかなむらを敷いておくことで、画面全体が流体になる。
 */
export const seedFragment = /* glsl */ `
  precision highp float;

  uniform float uSeed;

  varying vec2 vUv;

  float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
  }

  float valueNoise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);

    return mix(
      mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x),
      mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x),
      u.y
    );
  }

  void main() {
    vec2 p = vUv * 3.0 + uSeed;

    float n =
        valueNoise(p) * 0.55
      + valueNoise(p * 2.1) * 0.28
      + valueNoise(p * 4.3) * 0.17;

    // 中央をわずかに明るくして、四隅が落ちる自然な減衰をつける
    float vignette = 1.0 - length(vUv - 0.5) * 0.55;
    float value = clamp(n * 0.85 * vignette, 0.0, 1.0);

    gl_FragColor = vec4(vec3(value), 1.0);
  }
`;

/**
 * 表示パス。
 * 流体の濃度と文字マスクをそれぞれ高さと見なして法線を作り、
 * 合成した法線で背景を屈折させ、拡散光と鏡面反射を乗せる。
 * 色を持たせず明度だけで起伏を出す。
 */
export const displayFragment = /* glsl */ `
  precision highp float;
  precision highp sampler2D;

  uniform sampler2D uDye;
  uniform sampler2D uText;
  uniform vec2 uDyeTexel;
  uniform vec2 uTextTexel;
  uniform float uTextDepth;
  uniform float uRefraction;
  uniform float uTime;
  uniform float uReveal;

  // 深度で移り変わる水の色。暗部と明部を受け取り、輝度で混ぜる。
  uniform vec3 uWaterDark;
  uniform vec3 uWaterLight;
  // 0 が水面、1 が最深部。
  uniform float uDepth;

  varying vec2 vUv;

  /** 高さマップから法線を作る。z が小さいほど起伏が強く出る。 */
  vec3 heightNormal(sampler2D tex, vec2 uv, vec2 texel, float depth) {
    float left = texture2D(tex, uv - vec2(texel.x, 0.0)).r;
    float right = texture2D(tex, uv + vec2(texel.x, 0.0)).r;
    float bottom = texture2D(tex, uv - vec2(0.0, texel.y)).r;
    float top = texture2D(tex, uv + vec2(0.0, texel.y)).r;

    return normalize(vec3(left - right, bottom - top, depth));
  }

  void main() {
    vec3 fluidNormal = heightNormal(uDye, vUv, uDyeTexel, 0.055);
    vec3 textNormal = heightNormal(uText, vUv, uTextTexel, 0.10);

    float textMask = texture2D(uText, vUv).r;

    // 文字は水面に浮かぶものなので、潜るほど消える
    float textFade = uReveal * smoothstep(0.22, 0.02, uDepth);

    // 文字の輪郭。傾きが急なところ＝縁だけが立つ。
    float textEdge = length(textNormal.xy);

    // 文字は「流体の中に沈んだ起伏」として扱うので、法線を混ぜてから正規化する
    vec3 normal = normalize(fluidNormal + textNormal * uTextDepth * textFade);

    // 法線の向きに背景をずらして拾う＝屈折。文字の縁ほど強くずらす。
    vec2 refracted = vUv + normal.xy * uRefraction * (1.0 + textEdge * 2.5 * textFade);
    float base = texture2D(uDye, refracted).r;

    vec3 lightDirection = normalize(vec3(0.45, 0.65, 0.62));
    float diffuse = max(dot(normal, lightDirection), 0.0);
    float specular = pow(
      max(dot(reflect(-lightDirection, normal), vec3(0.0, 0.0, 1.0)), 0.0), 42.0
    );

    // 縁だけ明るく落として、平坦な黒に沈まないようにする
    float rim = pow(1.0 - abs(normal.z), 2.2);

    // 文字の縁に沿った鏡面。ガラスを流体に沈めたときの光り方に寄せる。
    float textSheen = pow(textEdge, 1.4) * (0.55 + diffuse * 0.7) * textFade;

    // 水そのものの明暗。ここまでは色を持たない。
    float body =
        base * 0.62
      + diffuse * 0.30
      + rim * 0.10
      // 文字の内側はわずかに沈める。周りとの差で面が見えるようにする。
      - textMask * 0.07 * textFade;

    // 深いほど光が届かない。水の明暗そのものを圧縮する。
    body *= mix(1.0, 0.42, uDepth);

    // 深度の色で着色する
    vec3 color = mix(uWaterDark, uWaterLight, clamp(body, 0.0, 1.0));

    // 鏡面と文字の艶は白のまま乗せる。水の色に埋もれさせない。
    float highlight = (specular * 0.55 + textSheen * 0.42) * mix(1.0, 0.3, uDepth);
    color += vec3(highlight) * mix(vec3(1.0), uWaterLight, 0.35);

    // わずかなディザ。暗部の階調にバンディングが出るのを防ぐ。
    float dither =
      fract(sin(dot(vUv * 1024.0 + uTime, vec2(12.9898, 78.233))) * 43758.5453);
    color += (dither - 0.5) * 0.008;

    gl_FragColor = vec4(max(color, 0.0), 1.0);
  }
`;
