import * as THREE from "three";

/**
 * 固定背景の WebGL 側。参照は mofu-dev.com。
 *
 * 白い地に、青が絹のように流れる場を全画面クアッド1枚のシェーダーで描く。
 * ドメインワープした fbm（iq 方式の二段ワープ）で「奥行きのある流れ」を出す。
 * ポインタには反応しない（本人の要望で視差は撤去）。
 *
 * 黒い文字がどこを通っても読めるよう、青の濃さには上限を設ける。
 * 文字の多い左・下・最上部は白へ戻す——決まりは docs/DESIGN.md が正。
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
    vec2 p = vec2(uv.x * uAspect, uv.y);
    float t = uTime * 0.07;

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

    // 青の中心は右上
    vec2 blueC = vec2(0.76 * uAspect, 0.72);
    float d = distance(p, blueC);
    float blueMask = exp(-d * d * 1.7);

    // 配色: 白 → 淡い青 → 空色 → 青 → 濃い芯。
    // 濃い芯は右上の帯だけで、文字の通り道（左・下）は白のまま
    vec3 white = vec3(1.0);
    vec3 pale = vec3(0.859, 0.910, 0.969);
    vec3 sky = vec3(0.616, 0.769, 0.918);
    vec3 blue = vec3(0.357, 0.608, 0.847);
    vec3 deep = vec3(0.239, 0.494, 0.761);

    vec3 color = mix(white, pale, clamp(f * f * 2.2, 0.0, 1.0));
    color = mix(color, sky, smoothstep(0.3, 0.75, f) * blueMask);
    color = mix(color, blue, smoothstep(0.5, 0.9, f) * blueMask);
    color = mix(color, deep, smoothstep(0.68, 0.98, f) * blueMask * 0.7);
    color = mix(color, sky, blueMask * 0.35);

    // 青の周りの小さな粒。ゆっくり明滅する
    vec2 cell = floor(p * 90.0);
    vec2 gv = fract(p * 90.0) - 0.5;
    float h = hash(cell);
    float twinkle = 0.7 + 0.3 * sin(uTime * (0.4 + h) + h * 6.28);
    float star = smoothstep(0.14, 0.0, length(gv)) * step(0.9965, h) * twinkle;
    color = mix(color, deep, star * 0.7 * exp(-d * d * 0.9));

    // 文字の多い左・下・最上部（ナビ）は白へ戻す（可読性は実測で確認）
    float leftFade = smoothstep(0.02, 0.62, uv.x);
    float bottomFade = smoothstep(0.0, 0.55, uv.y);
    float topFade = 1.0 - smoothstep(0.84, 1.0, uv.y);
    float presence = leftFade * mix(0.12, 1.0, bottomFade) * mix(0.12, 1.0, topFade);
    color = mix(white, color, presence);

    // 粒状感。バンディングを散らす
    color += (hash(uv * vec2(917.0, 533.0)) - 0.5) * 0.015;

    gl_FragColor = vec4(color, 1.0);
  }
`;

export type FlowSceneOptions = {
  canvas: HTMLCanvasElement;
  reduced: boolean;
};

export class FlowScene {
  private renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  private material: THREE.ShaderMaterial;
  private geometry: THREE.PlaneGeometry;

  private frame = 0;
  private running = false;
  private reduced: boolean;
  private startedAt = performance.now();

  constructor({ canvas, reduced }: FlowSceneOptions) {
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
      this.material.uniforms.uTime.value =
        (performance.now() - this.startedAt) / 1000;
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
