import * as THREE from "three";

/**
 * 作品スライドショーの WebGL 側。
 *
 * 全画面クアッド1枚に2枚のテクスチャを渡し、シェーダーで
 * 「ノイズで縁がにじむクロスフェード + わずかな変位」の遷移を描く。
 * 待ち時間中もごくゆっくり漂わせて、静止画の硬さを消す（reduced では止める）。
 *
 * 演出の判断は docs/DESIGN.md の「作品スライドショー」の節が正。
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
  uniform sampler2D uFrom;
  uniform sampler2D uTo;
  uniform float uProgress;     // 0..1 の遷移。待機中は 0
  uniform float uTime;
  uniform float uCanvasAspect;
  uniform float uImageAspect;
  uniform float uPhaseFrom;    // 漂いの位相。スライドごとにずらす
  uniform float uPhaseTo;
  uniform float uDrift;        // 漂いの強さ。reduced-motion では 0

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

  // 画像をキャンバスに cover ではめる
  vec2 cover(vec2 uv) {
    float r = uCanvasAspect / uImageAspect;
    if (r > 1.0) return vec2(uv.x, 0.5 + (uv.y - 0.5) / r);
    return vec2(0.5 + (uv.x - 0.5) * r, uv.y);
  }

  // 待機中の漂い。少し拡大して、ゆっくり視点を流す
  vec2 drift(vec2 uv, float phase) {
    float t = uTime * 0.05 + phase;
    vec2 offset = vec2(sin(t), cos(t * 0.7)) * 0.011 * uDrift;
    return (uv - 0.5) / 1.06 + 0.5 + offset;
  }

  void main() {
    vec2 uv = cover(vUv);
    float p = uProgress;

    // 遷移の山（始まりと終わりは歪みゼロ）
    float wave = p * (1.0 - p) * 4.0;
    float n = noise(vUv * 4.0 + vec2(0.0, uTime * 0.02));
    vec2 direction = vec2(n - 0.5, noise(vUv * 4.0 + 7.3) - 0.5);

    vec2 uvFrom = drift(uv, uPhaseFrom) + direction * 0.10 * wave * p;
    vec2 uvTo = drift(uv, uPhaseTo) - direction * 0.10 * wave * (1.0 - p);

    // 縁がノイズでにじむクロスフェード
    float m = clamp(p + (n - 0.5) * 0.35 * wave, 0.0, 1.0);
    m = smoothstep(0.0, 1.0, m);

    vec3 color = mix(texture2D(uFrom, uvFrom).rgb, texture2D(uTo, uvTo).rgb, m);
    gl_FragColor = vec4(color, 1.0);
  }
`;

const TRANSITION_MS = 1300;

function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2;
}

export type SlideshowSceneOptions = {
  canvas: HTMLCanvasElement;
  /** スライドの絵。プレースホルダー canvas か、読み込み済みの実画像 */
  images: (HTMLCanvasElement | HTMLImageElement)[];
  /** prefers-reduced-motion。true なら漂いなし・遷移は瞬時 */
  reduced: boolean;
};

export class SlideshowScene {
  private renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  private material: THREE.ShaderMaterial;
  private geometry: THREE.PlaneGeometry;
  private textures: THREE.Texture[];

  private current = 0;
  private frame = 0;
  private running = false;
  private startedAt = performance.now();
  private transitionStart: number | null = null;
  private reduced: boolean;

  constructor({ canvas, images, reduced }: SlideshowSceneOptions) {
    this.reduced = reduced;

    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: false,
      alpha: false,
      powerPreference: "low-power",
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    this.textures = images.map((image) => {
      const texture = new THREE.CanvasTexture(image);
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.minFilter = THREE.LinearFilter;
      texture.magFilter = THREE.LinearFilter;
      return texture;
    });

    const first = images[0];
    this.material = new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader,
      uniforms: {
        uFrom: { value: this.textures[0] },
        uTo: { value: this.textures[0] },
        uProgress: { value: 0 },
        uTime: { value: 0 },
        uCanvasAspect: { value: 1.6 },
        uImageAspect: { value: first.width / first.height },
        uPhaseFrom: { value: 0 },
        uPhaseTo: { value: 0 },
        uDrift: { value: reduced ? 0 : 1 },
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
    this.material.uniforms.uCanvasAspect.value = width / height;
    if (!this.running) this.renderStill();
  }

  /** index のスライドへ。reduced や停止中は遷移を挟まず切り替える */
  show(index: number) {
    if (index === this.current && this.transitionStart === null) return;
    const uniforms = this.material.uniforms;

    if (this.reduced || !this.running) {
      this.current = index;
      this.transitionStart = null;
      uniforms.uFrom.value = this.textures[index];
      uniforms.uTo.value = this.textures[index];
      uniforms.uPhaseFrom.value = index * 2.4;
      uniforms.uPhaseTo.value = index * 2.4;
      uniforms.uProgress.value = 0;
      this.renderStill();
      return;
    }

    // 遷移の途中でも、いま見えている側から次へつなぐ
    uniforms.uFrom.value =
      this.transitionStart !== null && uniforms.uProgress.value > 0.5
        ? uniforms.uTo.value
        : uniforms.uFrom.value;
    uniforms.uPhaseFrom.value = this.current * 2.4;
    uniforms.uTo.value = this.textures[index];
    uniforms.uPhaseTo.value = index * 2.4;
    uniforms.uProgress.value = 0;
    this.transitionStart = performance.now();
    this.current = index;
  }

  setReduced(reduced: boolean) {
    this.reduced = reduced;
    this.material.uniforms.uDrift.value = reduced ? 0 : 1;
    if (reduced) {
      this.stop();
      this.show(this.current);
    } else {
      this.start();
    }
  }

  start() {
    if (this.running || this.reduced) return;
    this.running = true;
    const tick = () => {
      if (!this.running) return;
      const now = performance.now();
      const uniforms = this.material.uniforms;
      uniforms.uTime.value = (now - this.startedAt) / 1000;

      if (this.transitionStart !== null) {
        const t = Math.min(1, (now - this.transitionStart) / TRANSITION_MS);
        uniforms.uProgress.value = easeInOutCubic(t);
        if (t >= 1) {
          this.transitionStart = null;
          uniforms.uFrom.value = this.textures[this.current];
          uniforms.uPhaseFrom.value = this.current * 2.4;
          uniforms.uProgress.value = 0;
        }
      }

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
    for (const texture of this.textures) texture.dispose();
    this.geometry.dispose();
    this.material.dispose();
    this.renderer.dispose();
  }
}
