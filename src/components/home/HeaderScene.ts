import * as THREE from "three";

/**
 * ヘッダーの背景の WebGL 側。参照は mofu-dev.com のヒーロー。
 *
 * 全画面クアッド1枚のシェーダーで、シアンの光が絹のように流れる場を描く。
 * ドメインワープした fbm（iq 方式の二段ワープ）で「奥行きのある流れ」を出し、
 * ポインタにはごくわずかな視差だけで応える（追いかける演出はしない）。
 * 文字の載る左と下はシェーダー側で黒へ落とす——可読性の決まりは
 * docs/DESIGN.md「ヘッダーの背景画の決まり」が正。
 *
 * reduced-motion: 静止した1フレームだけ描く。
 * WebGL 不可: 呼び出し側（HeroBackdrop）が canvas 2D の静止画に落とす。
 */

const vertexShader = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = vec4(position.xy, 0.0, 1.0);
  }
`;

const fragmentShader = /* glsl */ `
  precision highp float;

  varying vec2 vUv;
  uniform float uTime;
  uniform float uAspect;
  uniform vec2 uPointer; // -1..1。イージング済み

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
    float value = 0.0;
    float amplitude = 0.5;
    for (int i = 0; i < 3; i++) {
      value += amplitude * noise(p);
      p = p * 2.03 + vec2(11.3, 7.9);
      amplitude *= 0.5;
    }
    return value;
  }

  void main() {
    vec2 uv = vUv;
    vec2 p = vec2(uv.x * uAspect, uv.y) + uPointer * vec2(0.02, -0.015);
    float t = uTime * 0.045;

    // 二段のドメインワープ。絹のような流れをつくる
    vec2 q = vec2(
      fbm(p * 1.8 + vec2(0.0, t)),
      fbm(p * 1.8 + vec2(5.2, t * 1.3))
    );
    vec2 r = vec2(
      fbm(p * 1.8 + 4.0 * q + vec2(1.7, 9.2 + t * 0.7)),
      fbm(p * 1.8 + 4.0 * q + vec2(8.3, 2.8 - t * 0.6))
    );
    float f = fbm(p * 1.8 + 4.0 * r);

    // 光の中心は右上。ポインタでわずかに視差
    vec2 lightC = vec2(0.76 * uAspect, 0.72) + uPointer * vec2(0.05, 0.035);
    float d = distance(p, lightC);
    float glowMask = exp(-d * d * 2.4);

    // 配色: 深い地 → 中間の紺 → accent(#2e5f7d) → cyan(#8fd8e0)
    vec3 deep = vec3(0.008, 0.016, 0.03);
    vec3 mid = vec3(0.047, 0.10, 0.16);
    vec3 accent = vec3(0.18, 0.37, 0.49);
    vec3 cyan = vec3(0.56, 0.85, 0.88);

    vec3 color = mix(deep, mid, clamp(f * f * 2.0, 0.0, 1.0));
    color = mix(color, accent, smoothstep(0.35, 0.8, f) * glowMask);
    color = mix(color, cyan, smoothstep(0.62, 0.98, f) * glowMask * 0.55);
    color += accent * glowMask * 0.35;
    color += cyan * exp(-d * d * 9.0) * 0.3;

    // 光の周りの小さな粒。ゆっくり明滅する
    vec2 cell = floor(p * 90.0);
    vec2 gv = fract(p * 90.0) - 0.5;
    float h = hash(cell);
    float twinkle = 0.7 + 0.3 * sin(uTime * (0.4 + h) + h * 6.28);
    float star = smoothstep(0.14, 0.0, length(gv)) * step(0.9965, h) * twinkle;
    color += cyan * star * 0.5 * exp(-d * d * 0.9);

    // 文字の載る左と下、ナビの載る最上部を黒へ落とす（可読性は実測で確認）
    float leftFade = smoothstep(0.02, 0.62, uv.x);
    float bottomFade = smoothstep(0.0, 0.55, uv.y);
    float topFade = 1.0 - smoothstep(0.84, 1.0, uv.y);
    color *= leftFade * mix(0.1, 1.0, bottomFade) * mix(0.12, 1.0, topFade);

    // 粒状感。バンディングを散らす
    color += (hash(uv * vec2(917.0, 533.0)) - 0.5) * 0.02;

    gl_FragColor = vec4(color, 1.0);
  }
`;

export type HeaderSceneOptions = {
  canvas: HTMLCanvasElement;
  reduced: boolean;
};

export class HeaderScene {
  private renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  private material: THREE.ShaderMaterial;
  private geometry: THREE.PlaneGeometry;

  private frame = 0;
  private running = false;
  private reduced: boolean;
  private startedAt = performance.now();
  private pointerTarget = new THREE.Vector2(0, 0);

  constructor({ canvas, reduced }: HeaderSceneOptions) {
    this.reduced = reduced;

    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: false,
      alpha: false,
      powerPreference: "low-power",
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    this.material = new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader,
      uniforms: {
        uTime: { value: 0 },
        uAspect: { value: 2.5 },
        uPointer: { value: new THREE.Vector2(0, 0) },
      },
      depthTest: false,
      depthWrite: false,
    });

    this.geometry = new THREE.PlaneGeometry(2, 2);
    this.scene.add(new THREE.Mesh(this.geometry, this.material));
  }

  resize(width: number, height: number) {
    if (width === 0 || height === 0) return;
    this.renderer.setSize(width, height, false);
    this.material.uniforms.uAspect.value = width / height;
    if (!this.running) this.renderStill();
  }

  /** ポインタの目標位置（-1..1）。実際の動きは tick 側でゆっくり寄せる */
  setPointer(x: number, y: number) {
    this.pointerTarget.set(x, y);
  }

  setReduced(reduced: boolean) {
    this.reduced = reduced;
    if (reduced) {
      this.stop();
      this.renderStill();
    } else {
      this.start();
    }
  }

  start() {
    if (this.running || this.reduced) return;
    this.running = true;
    const tick = () => {
      if (!this.running) return;
      const uniforms = this.material.uniforms;
      uniforms.uTime.value = (performance.now() - this.startedAt) / 1000;
      const pointer = uniforms.uPointer.value as THREE.Vector2;
      pointer.lerp(this.pointerTarget, 0.04);
      this.renderer.render(this.scene, this.camera);
      this.frame = requestAnimationFrame(tick);
    };
    this.frame = requestAnimationFrame(tick);
  }

  stop() {
    this.running = false;
    cancelAnimationFrame(this.frame);
  }

  renderStill() {
    this.renderer.render(this.scene, this.camera);
  }

  dispose() {
    this.stop();
    this.geometry.dispose();
    this.material.dispose();
    this.renderer.dispose();
  }
}
