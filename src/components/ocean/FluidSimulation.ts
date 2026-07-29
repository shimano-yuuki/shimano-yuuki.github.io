import * as THREE from "three";
import {
  advectionFragment,
  curlFragment,
  displayFragment,
  divergenceFragment,
  gradientSubtractFragment,
  pressureFragment,
  quadVertex,
  seedFragment,
  splatFragment,
  vorticityFragment,
} from "./fluidShaders";
import { CreatureLayer } from "./CreatureLayer";
import {
  lightFragment,
  overlayVertex,
  particleFragment,
  particleVertex,
} from "./oceanShaders";

type Quality = "high" | "low";

const SETTINGS = {
  high: { sim: 192, dye: 768, pressureIterations: 24 },
  low: { sim: 112, dye: 384, pressureIterations: 14 },
} satisfies Record<Quality, { sim: number; dye: number; pressureIterations: number }>;

/** 交互に書き込む2枚組のレンダーターゲット。 */
class DoubleTarget {
  read: THREE.WebGLRenderTarget;
  write: THREE.WebGLRenderTarget;

  constructor(width: number, height: number, type: THREE.TextureDataType) {
    const options = {
      type,
      format: THREE.RGBAFormat,
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      wrapS: THREE.ClampToEdgeWrapping,
      wrapT: THREE.ClampToEdgeWrapping,
      depthBuffer: false,
      stencilBuffer: false,
    };
    this.read = new THREE.WebGLRenderTarget(width, height, options);
    this.write = new THREE.WebGLRenderTarget(width, height, options);
  }

  swap() {
    const temp = this.read;
    this.read = this.write;
    this.write = temp;
  }

  dispose() {
    this.read.dispose();
    this.write.dispose();
  }
}

export type FluidOptions = {
  canvas: HTMLCanvasElement;
  /** 流体に沈める文字。 */
  text: string;
  quality?: Quality;
};

/**
 * 全画面の流体シミュレーション。
 * 速度と濃度を GPU 上で更新し、文字を高さマップとして屈折させて描く。
 */
export class FluidSimulation {
  private renderer: THREE.WebGLRenderer;
  private camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  private scene = new THREE.Scene();
  private mesh: THREE.Mesh;

  private velocity: DoubleTarget;
  private dye: DoubleTarget;
  private pressure: DoubleTarget;
  private divergence: THREE.WebGLRenderTarget;
  private curl: THREE.WebGLRenderTarget;

  private materials: Record<string, THREE.ShaderMaterial>;
  private textTexture: THREE.CanvasTexture;
  private textCanvas: HTMLCanvasElement;

  /** 水の上に加算合成で重ねる層（光条・カースティクス・粒子）。 */
  private overlayScene = new THREE.Scene();
  private lightMaterial!: THREE.ShaderMaterial;
  private particleMaterial!: THREE.ShaderMaterial;
  /** 深度帯ごとに泳ぐ生き物。 */
  private creatures!: CreatureLayer;

  private settings: (typeof SETTINGS)[Quality];
  private width = 0;
  private height = 0;
  private disposed = false;
  private running = false;
  private frame = 0;
  private elapsed = 0;
  private reveal = 0;

  /** ポインタ。実際の入力が無い間は自動で漂わせる。 */
  private pointer = { x: 0.5, y: 0.5, dx: 0, dy: 0, active: false };
  private idleSince = 0;
  private text: string;
  /** 0 が水面、1 が最深部。深いほど流れが遅く暗くなる。 */
  private depth = 0;
  /** スクロールの勢い。水流として注ぎ込む。 */
  private flow = 0;
  /** 本文の背後を落としている量（0〜1）。 */
  private veil = 0;

  constructor({ canvas, text, quality = "high" }: FluidOptions) {
    this.text = text;
    this.settings = SETTINGS[quality];

    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: false,
      alpha: false,
      powerPreference: "high-performance",
    });
    this.renderer.setClearColor(0x000000, 1);

    // 半精度浮動小数が使えない環境では速度場が破綻するので、その場合は諦めて中止する
    const type = this.renderer.capabilities.isWebGL2
      ? THREE.HalfFloatType
      : THREE.UnsignedByteType;

    const { sim, dye } = this.settings;
    this.velocity = new DoubleTarget(sim, sim, type);
    this.pressure = new DoubleTarget(sim, sim, type);
    this.dye = new DoubleTarget(dye, dye, type);
    this.divergence = new THREE.WebGLRenderTarget(sim, sim, {
      type,
      format: THREE.RGBAFormat,
      minFilter: THREE.NearestFilter,
      magFilter: THREE.NearestFilter,
      depthBuffer: false,
      stencilBuffer: false,
    });
    this.curl = this.divergence.clone();

    this.textCanvas = document.createElement("canvas");
    this.textTexture = new THREE.CanvasTexture(this.textCanvas);
    this.textTexture.minFilter = THREE.LinearFilter;
    this.textTexture.magFilter = THREE.LinearFilter;

    this.materials = this.createMaterials();
    this.mesh = new THREE.Mesh(
      new THREE.PlaneGeometry(2, 2),
      this.materials.display,
    );
    this.scene.add(this.mesh);

    this.buildOverlays(quality);
    this.creatures = new CreatureLayer(quality);
  }

  /**
   * 水の上に重ねる層を組む。
   * 光条とカースティクスは全画面クアッド1枚、気泡とマリンスノーは点群1つ。
   * どちらも加算合成なので、水を暗くすることはない。
   */
  private buildOverlays(quality: Quality) {
    this.lightMaterial = new THREE.ShaderMaterial({
      vertexShader: overlayVertex,
      fragmentShader: lightFragment,
      uniforms: {
        uTime: { value: 0 },
        uDepth: { value: 0 },
        uAspect: { value: 1 },
        uTint: { value: new THREE.Color(0.78, 0.98, 1.0) },
        uVeil: { value: 0 },
      },
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthTest: false,
      depthWrite: false,
    });
    this.overlayScene.add(
      new THREE.Mesh(new THREE.PlaneGeometry(2, 2), this.lightMaterial),
    );

    const count = quality === "high" ? 900 : 340;
    const seeds = new Float32Array(count * 3);
    const kinds = new Float32Array(count);
    for (let i = 0; i < count; i += 1) {
      seeds[i * 3] = Math.random();
      seeds[i * 3 + 1] = Math.random();
      seeds[i * 3 + 2] = Math.random();
      // 半分を気泡、半分をマリンスノーにする
      kinds[i] = i % 2 === 0 ? 0 : 1;
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("aSeed", new THREE.BufferAttribute(seeds, 3));
    geometry.setAttribute("aKind", new THREE.BufferAttribute(kinds, 1));
    // 位置は頂点シェーダーが決めるが、three が境界計算に使うので入れておく
    geometry.setAttribute("position", new THREE.BufferAttribute(seeds, 3));
    geometry.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 10);

    this.particleMaterial = new THREE.ShaderMaterial({
      vertexShader: particleVertex,
      fragmentShader: particleFragment,
      uniforms: {
        uTime: { value: 0 },
        uDepth: { value: 0 },
        uAspect: { value: 1 },
        uPixelRatio: { value: 1 },
        uBubbleTint: { value: new THREE.Color(0.75, 0.95, 1.0) },
        uSnowTint: { value: new THREE.Color(0.82, 0.88, 0.95) },
      },
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthTest: false,
      depthWrite: false,
    });

    this.overlayScene.add(new THREE.Points(geometry, this.particleMaterial));
  }

  private createMaterials() {
    const make = (fragmentShader: string, uniforms: THREE.ShaderMaterial["uniforms"]) =>
      new THREE.ShaderMaterial({
        vertexShader: quadVertex,
        fragmentShader,
        uniforms,
        depthTest: false,
        depthWrite: false,
      });

    const simTexel = new THREE.Vector2();
    const dyeTexel = new THREE.Vector2();

    return {
      advection: make(advectionFragment, {
        uVelocity: { value: null },
        uSource: { value: null },
        uTexelSize: { value: simTexel },
        uDt: { value: 0.016 },
        uDissipation: { value: 0.2 },
      }),
      divergence: make(divergenceFragment, {
        uVelocity: { value: null },
        uTexelSize: { value: simTexel },
      }),
      curl: make(curlFragment, {
        uVelocity: { value: null },
        uTexelSize: { value: simTexel },
      }),
      vorticity: make(vorticityFragment, {
        uVelocity: { value: null },
        uCurl: { value: null },
        uTexelSize: { value: simTexel },
        uCurlStrength: { value: 26 },
        uDt: { value: 0.016 },
      }),
      pressure: make(pressureFragment, {
        uPressure: { value: null },
        uDivergence: { value: null },
        uTexelSize: { value: simTexel },
      }),
      gradientSubtract: make(gradientSubtractFragment, {
        uPressure: { value: null },
        uVelocity: { value: null },
        uTexelSize: { value: simTexel },
      }),
      seed: make(seedFragment, {
        uSeed: { value: Math.random() * 40 },
      }),
      splat: make(splatFragment, {
        uTarget: { value: null },
        uAspectRatio: { value: 1 },
        uValue: { value: new THREE.Vector3() },
        uPoint: { value: new THREE.Vector2() },
        uRadius: { value: 0.0002 },
      }),
      display: make(displayFragment, {
        uDye: { value: null },
        uText: { value: this.textTexture },
        uDyeTexel: { value: dyeTexel },
        uTextTexel: { value: new THREE.Vector2() },
        uTextDepth: { value: 1.9 },
        uRefraction: { value: 0.055 },
        uTime: { value: 0 },
        uReveal: { value: 0 },
        uWaterDark: { value: new THREE.Color(0.02, 0.16, 0.2) },
        uWaterLight: { value: new THREE.Color(0.78, 0.98, 1.0) },
        uDepth: { value: 0 },
      }),
    };
  }

  /** 文字を白抜きで描き、少しぼかして滑らかな起伏にする。 */
  private paintText() {
    const dpr = Math.min(window.devicePixelRatio, 2);
    const canvasWidth = Math.round(this.width * dpr);
    const canvasHeight = Math.round(this.height * dpr);
    if (canvasWidth === 0 || canvasHeight === 0) return;

    this.textCanvas.width = canvasWidth;
    this.textCanvas.height = canvasHeight;

    const context = this.textCanvas.getContext("2d");
    if (!context) return;

    context.fillStyle = "#000000";
    context.fillRect(0, 0, canvasWidth, canvasHeight);

    // 画面幅に対する比率で決める。狭い画面では相対的に大きくする。
    const ratio = this.width < 640 ? 0.86 : 0.62;
    let fontSize = canvasHeight * 0.34;
    context.textAlign = "center";
    context.textBaseline = "middle";

    const fit = () => {
      context.font = `800 ${fontSize}px Archivo, "Helvetica Neue", sans-serif`;
      return context.measureText(this.text).width;
    };
    while (fit() > canvasWidth * ratio && fontSize > 8) fontSize *= 0.94;

    // にじみを作るため、ぼかしを強い順に重ねる
    context.fillStyle = "#ffffff";
    for (const [blur, alpha] of [
      [canvasHeight * 0.022, 0.5],
      [canvasHeight * 0.01, 0.7],
      [canvasHeight * 0.004, 1],
    ] as const) {
      context.filter = `blur(${blur}px)`;
      context.globalAlpha = alpha;
      context.fillText(this.text, canvasWidth / 2, canvasHeight / 2);
    }
    context.filter = "none";
    context.globalAlpha = 1;

    this.textTexture.needsUpdate = true;
    this.materials.display.uniforms.uTextTexel.value.set(
      1 / canvasWidth,
      1 / canvasHeight,
    );
  }

  private blit(material: THREE.ShaderMaterial, target: THREE.WebGLRenderTarget | null) {
    this.mesh.material = material;
    this.renderer.setRenderTarget(target);
    this.renderer.render(this.scene, this.camera);
    this.renderer.setRenderTarget(null);
  }

  /** 指定した点に外力と濃度を注入する。 */
  private splat(x: number, y: number, dx: number, dy: number, amount: number) {
    const { splat } = this.materials;
    const aspect = this.width / Math.max(this.height, 1);

    splat.uniforms.uAspectRatio.value = aspect;
    splat.uniforms.uPoint.value.set(x, y);
    splat.uniforms.uRadius.value = 0.00022;

    splat.uniforms.uTarget.value = this.velocity.read.texture;
    splat.uniforms.uValue.value.set(dx, dy, 0);
    this.blit(splat, this.velocity.write);
    this.velocity.swap();

    splat.uniforms.uRadius.value = 0.00016;
    splat.uniforms.uTarget.value = this.dye.read.texture;
    splat.uniforms.uValue.value.set(amount, amount, amount);
    this.blit(splat, this.dye.write);
    this.dye.swap();
  }

  private step(dt: number) {
    const m = this.materials;
    const simTexel = m.advection.uniforms.uTexelSize.value as THREE.Vector2;

    // 渦度を測って、消えかけた渦に力を足す
    m.curl.uniforms.uVelocity.value = this.velocity.read.texture;
    this.blit(m.curl, this.curl);

    m.vorticity.uniforms.uVelocity.value = this.velocity.read.texture;
    m.vorticity.uniforms.uCurl.value = this.curl.texture;
    m.vorticity.uniforms.uDt.value = dt;
    this.blit(m.vorticity, this.velocity.write);
    this.velocity.swap();

    // 発散を消す
    m.divergence.uniforms.uVelocity.value = this.velocity.read.texture;
    this.blit(m.divergence, this.divergence);

    m.pressure.uniforms.uDivergence.value = this.divergence.texture;
    for (let i = 0; i < this.settings.pressureIterations; i += 1) {
      m.pressure.uniforms.uPressure.value = this.pressure.read.texture;
      this.blit(m.pressure, this.pressure.write);
      this.pressure.swap();
    }

    m.gradientSubtract.uniforms.uPressure.value = this.pressure.read.texture;
    m.gradientSubtract.uniforms.uVelocity.value = this.velocity.read.texture;
    this.blit(m.gradientSubtract, this.velocity.write);
    this.velocity.swap();

    // 速度そのものを移流（自己移流）
    m.advection.uniforms.uDt.value = dt;
    m.advection.uniforms.uTexelSize.value = simTexel;
    m.advection.uniforms.uVelocity.value = this.velocity.read.texture;
    m.advection.uniforms.uSource.value = this.velocity.read.texture;
    m.advection.uniforms.uDissipation.value = 0.16;
    this.blit(m.advection, this.velocity.write);
    this.velocity.swap();

    // 濃度を移流。こちらは解像度が違うのでテクセルを差し替える。
    const dyeTexel = m.display.uniforms.uDyeTexel.value as THREE.Vector2;
    m.advection.uniforms.uTexelSize.value = dyeTexel;
    m.advection.uniforms.uVelocity.value = this.velocity.read.texture;
    m.advection.uniforms.uSource.value = this.dye.read.texture;
    // 濃度はほとんど減衰させない。減らすと攪拌が通った筋以外が黒に沈む。
    m.advection.uniforms.uDissipation.value = 0.06;
    this.blit(m.advection, this.dye.write);
    this.dye.swap();
    m.advection.uniforms.uTexelSize.value = simTexel;
  }

  /**
   * 画面の各所を独立に漂う攪拌点。
   * 1点だけだと通った筋しか動かないので、位相をずらした3点で常時かき回す。
   */
  private autoStir(time: number) {
    const stirrers = [
      { speed: 0.19, rx: 0.34, ry: 0.27, phase: 0, force: 300 },
      { speed: -0.13, rx: 0.28, ry: 0.33, phase: 2.1, force: 250 },
      { speed: 0.27, rx: 0.4, ry: 0.18, phase: 4.3, force: 210 },
      // 画面の下半分が淀まないように、低い位置を大きく回る点を足す
      { speed: -0.09, rx: 0.42, ry: 0.36, phase: 1.1, force: 230 },
    ];

    // 深いところほど水は動かない。浅瀬の 1.0 から深海の 0.35 まで落とす。
    const calm = 1 - this.depth * 0.65;

    for (const { speed, rx, ry, phase, force } of stirrers) {
      const angle = time * speed * calm + phase;
      const x = 0.5 + Math.cos(angle) * rx + Math.cos(angle * 2.3) * 0.06;
      const y = 0.5 + Math.sin(angle * 1.37) * ry + Math.sin(angle * 3.1) * 0.05;
      this.splat(
        x,
        y,
        -Math.sin(angle) * force * calm,
        Math.cos(angle * 1.37) * force * calm,
        0.09 * calm,
      );
    }

    // スクロールの勢いを、画面を縦に貫く水流として足す
    if (Math.abs(this.flow) > 0.001) {
      const strength = Math.max(Math.min(this.flow, 0.6), -0.6) * 1400;
      for (const x of [0.18, 0.5, 0.82]) {
        this.splat(x, 0.5, 0, -strength, 0.05);
      }
      this.flow *= 0.86;
    }
  }

  /** 濃度場に初期のむらを敷く。 */
  private seedDye() {
    this.blit(this.materials.seed, this.dye.write);
    this.dye.swap();
  }

  resize(width: number, height: number) {
    if (width === 0 || height === 0) return;
    this.width = width;
    this.height = height;

    const dpr = Math.min(window.devicePixelRatio, 2);
    this.renderer.setPixelRatio(dpr);
    this.renderer.setSize(width, height, false);

    const { sim, dye } = this.settings;
    (this.materials.advection.uniforms.uTexelSize.value as THREE.Vector2).set(
      1 / sim,
      1 / sim,
    );
    (this.materials.display.uniforms.uDyeTexel.value as THREE.Vector2).set(
      1 / dye,
      1 / dye,
    );

    this.paintText();
  }

  setPointer(x: number, y: number, moved: boolean) {
    const dx = x - this.pointer.x;
    const dy = y - this.pointer.y;
    this.pointer.x = x;
    this.pointer.y = y;
    this.pointer.dx = dx;
    this.pointer.dy = dy;
    if (moved) {
      this.pointer.active = true;
      this.idleSince = this.elapsed;
    }
  }

  /**
   * 深度を反映する。水の色と、光の減衰量が変わる。
   * 深いほど流れも遅くなるので、攪拌の強さもここで落とす。
   */
  setDepth(depth: number, dark: [number, number, number], light: [number, number, number]) {
    this.depth = depth;
    const display = this.materials.display.uniforms;
    display.uDepth.value = depth;
    (display.uWaterDark.value as THREE.Color).setRGB(dark[0], dark[1], dark[2]);
    (display.uWaterLight.value as THREE.Color).setRGB(light[0], light[1], light[2]);
  }

  /** スクロールの勢いを水流として注ぎ込む。 */
  addFlow(velocity: number) {
    this.flow = velocity;
  }

  /**
   * 本文の背後を落としている量を伝える。
   * ベール（DOM の黒い膜）は加算合成で描く光条までは消せないので、
   * 読む場面では光そのものをここで弱める。
   */
  setVeil(veil: number) {
    this.veil = veil;
  }

  /** 1フレームだけ描く。reduced-motion のときはこれだけ呼ぶ。 */
  renderStill() {
    this.seedDye();
    for (let i = 0; i < 90; i += 1) {
      this.elapsed += 0.016;
      this.autoStir(this.elapsed);
      this.step(0.016);
    }
    this.reveal = 1;
    this.draw();
  }

  private draw() {
    const display = this.materials.display;
    display.uniforms.uDye.value = this.dye.read.texture;
    display.uniforms.uTime.value = this.elapsed;
    display.uniforms.uReveal.value = this.reveal;
    this.blit(display, null);

    // 水の上に光と粒子を加算で重ねる。ここでは画面を消さない。
    const aspect = this.width / Math.max(this.height, 1);
    const light = this.lightMaterial.uniforms;
    light.uTime.value = this.elapsed;
    light.uDepth.value = this.depth;
    light.uAspect.value = aspect;
    light.uVeil.value = this.veil;
    (light.uTint.value as THREE.Color).copy(
      this.materials.display.uniforms.uWaterLight.value as THREE.Color,
    );

    const particles = this.particleMaterial.uniforms;
    particles.uTime.value = this.elapsed;
    particles.uDepth.value = this.depth;
    particles.uAspect.value = aspect;
    particles.uPixelRatio.value = this.renderer.getPixelRatio();

    this.renderer.autoClear = false;
    // 生き物は水の中にいるので、光や粒子より先に描いて奥に置く
    this.creatures.setAspect(aspect);
    this.creatures.update(
      this.depth,
      this.elapsed,
      this.flow,
      this.veil,
      this.materials.display.uniforms.uWaterLight.value as THREE.Color,
    );
    this.renderer.render(this.creatures.scene, this.creatures.camera);
    this.renderer.render(this.overlayScene, this.camera);
    this.renderer.autoClear = true;
  }

  private loop = (timeMs: number) => {
    if (this.disposed || !this.running) return;
    this.animationId = requestAnimationFrame(this.loop);

    const time = timeMs / 1000;
    const dt = Math.min(time - this.lastTime || 0.016, 0.033);
    this.lastTime = time;
    this.elapsed += dt;
    this.frame += 1;

    // 文字は最初の1秒かけて浮かび上がらせる
    this.reveal = Math.min(this.reveal + dt * 0.9, 1);

    if (this.pointer.active && (this.pointer.dx !== 0 || this.pointer.dy !== 0)) {
      this.splat(
        this.pointer.x,
        this.pointer.y,
        this.pointer.dx * 2600,
        this.pointer.dy * 2600,
        0.34,
      );
      this.pointer.dx = 0;
      this.pointer.dy = 0;
    }

    // 触られていない間、および触られていても薄く、常に流れを足し続ける
    if (this.elapsed - this.idleSince > 0.6 || this.frame % 3 === 0) {
      this.autoStir(this.elapsed);
    }

    this.step(dt);
    this.draw();
  };

  private animationId = 0;
  private lastTime = 0;

  start() {
    if (this.running || this.disposed) return;
    this.running = true;
    this.lastTime = performance.now() / 1000;

    // 開き際に一度かき混ぜて、真っ黒から始まらないようにする
    if (this.frame === 0) {
      this.seedDye();
      for (let i = 0; i < 45; i += 1) {
        this.elapsed += 0.016;
        this.autoStir(this.elapsed);
        this.step(0.016);
      }
    }

    this.animationId = requestAnimationFrame(this.loop);
  }

  stop() {
    this.running = false;
    cancelAnimationFrame(this.animationId);
  }

  dispose() {
    this.stop();
    this.disposed = true;
    this.velocity.dispose();
    this.dye.dispose();
    this.pressure.dispose();
    this.divergence.dispose();
    this.curl.dispose();
    this.textTexture.dispose();
    for (const material of Object.values(this.materials)) material.dispose();
    this.mesh.geometry.dispose();

    // 重ねた層のジオメトリとマテリアルも解放する
    this.overlayScene.traverse((object) => {
      const withGeometry = object as Partial<THREE.Mesh>;
      withGeometry.geometry?.dispose();
    });
    this.lightMaterial.dispose();
    this.particleMaterial.dispose();
    this.creatures.dispose();

    this.renderer.dispose();
  }
}
