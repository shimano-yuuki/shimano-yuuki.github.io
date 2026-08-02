import * as THREE from "three";
import {
  clipQuadVertex,
  moteFragment,
  moteVertex,
  waterFragment,
} from "./aquariumShaders";
import { PlantLayer } from "./PlantLayer";
import { Rocks, SHELTER } from "./Rocks";
import { TetraFlock, type FlockOptions } from "./TetraFlock";

type Quality = "high" | "low";

const SETTINGS = {
  high: { fishScale: 1, plantsBack: 44, plantsFront: 7, motes: 110, dpr: 2 },
  low: { fishScale: 0.6, plantsBack: 26, plantsFront: 5, motes: 60, dpr: 1.5 },
} satisfies Record<Quality, Record<string, number>>;

const color = (r: number, g: number, b: number) => new THREE.Color(r, g, b);

/**
 * 住人 10 種。小型カラシンの群れを主役に、
 * 中層のバルブとグラミー、悠然と横切るエンゼルのペア、
 * 底のコリドラス、水面近くのハチェットで泳層を立体的に埋める。
 * 数は控えめに、体も小さく——水槽が主役で騒がしくならないように。
 * 小型のテトラとコリドラスは、時々右下の岩陰（SHELTER）に潜る。
 */
const SPECIES: FlockOptions[] = [
  // カージナルテトラ。藍の輝線と赤い腹の主群
  {
    count: 9,
    look: {
      back: color(0.05, 0.09, 0.1),
      stripe: color(0.3, 0.7, 0.85),
      belly: color(0.58, 0.12, 0.1),
    },
    bodyLength: 0.047,
    shelter: SHELTER,
    z: 0,
  },
  // ラミーノーズテトラ。銀の体に赤い鼻先
  {
    count: 6,
    look: {
      back: color(0.14, 0.17, 0.16),
      stripe: color(0.55, 0.6, 0.58),
      belly: color(0.38, 0.42, 0.4),
      nose: color(0.66, 0.1, 0.07),
      noseAmount: 1,
    },
    bodyLength: 0.048,
    z: -0.15,
  },
  // エンバーテトラ。琥珀の小さな群れ
  {
    count: 6,
    look: {
      back: color(0.11, 0.09, 0.055),
      stripe: color(0.82, 0.56, 0.28),
      belly: color(0.6, 0.28, 0.11),
    },
    bodyLength: 0.036,
    shelter: SHELTER,
    z: 0.1,
  },
  // ブラックネオンテトラ。黒い体に白銀の一本線
  {
    count: 5,
    look: {
      back: color(0.03, 0.038, 0.042),
      stripe: color(0.75, 0.8, 0.75),
      belly: color(0.12, 0.13, 0.13),
    },
    bodyLength: 0.044,
    z: -0.25,
  },
  // グローライトテトラ。半透明の体に橙の輝線
  {
    count: 5,
    look: {
      back: color(0.13, 0.14, 0.13),
      stripe: color(0.9, 0.42, 0.12),
      belly: color(0.3, 0.3, 0.28),
    },
    bodyLength: 0.041,
    shelter: SHELTER,
    z: 0.2,
  },
  // スマトラ。金の体に黒い横縞、体高のあるバルブ
  {
    count: 4,
    look: {
      back: color(0.42, 0.3, 0.1),
      stripe: color(0.5, 0.38, 0.14),
      belly: color(0.52, 0.4, 0.16),
      bars: 0.85,
    },
    body: { depth: 1.35 },
    bodyLength: 0.051,
    speed: 1.1,
    z: -0.1,
  },
  // ゴールデンハニー・ドワーフグラミー。蜂蜜色のペア
  {
    count: 2,
    look: {
      back: color(0.5, 0.34, 0.11),
      stripe: color(0.7, 0.5, 0.2),
      belly: color(0.64, 0.44, 0.17),
    },
    body: { depth: 1.5, finHeight: 1.35 },
    bodyLength: 0.066,
    speed: 0.65,
    z: 0.25,
  },
  // エンゼルフィッシュ。銀の円盤に黒い縞、帆のようなヒレのペア
  {
    count: 2,
    look: {
      back: color(0.3, 0.32, 0.34),
      stripe: color(0.2, 0.21, 0.22),
      belly: color(0.44, 0.46, 0.48),
      bars: 0.9,
    },
    body: { depth: 2.3, finHeight: 1.45, tail: 0.8 },
    bodyLength: 0.106,
    speed: 0.42,
    z: 0.35,
  },
  // コリドラス。底で暮らすブロンズの働き者。岩陰が大好き
  {
    count: 3,
    look: {
      back: color(0.2, 0.16, 0.11),
      stripe: color(0.3, 0.26, 0.18),
      belly: color(0.33, 0.29, 0.22),
    },
    body: { depth: 1.25 },
    bodyLength: 0.042,
    speed: 0.55,
    preferredY: -0.8,
    shelter: SHELTER,
    z: 0.15,
  },
  // マーブルハチェット。竜骨の深い胸、水面近くに浮かぶ
  {
    count: 4,
    look: {
      back: color(0.2, 0.22, 0.23),
      stripe: color(0.5, 0.53, 0.55),
      belly: color(0.4, 0.42, 0.44),
    },
    body: { depth: 1.2, keel: 3.2 },
    bodyLength: 0.049,
    speed: 0.8,
    preferredY: 0.74,
    z: -0.3,
  },
];

/**
 * page: 全画面の背景。水明かりは右に寄せ、文字の載る左は黒のまま。
 * tank: スマホで右下に置く小さな水槽。小窓の全体が水になり、魚は全幅を泳ぐ。
 */
export type AquariumLayout = "page" | "tank";

export type AquariumOptions = {
  canvas: HTMLCanvasElement;
  quality?: Quality;
  layout?: AquariumLayout;
};

/**
 * 全ページ共通の背景になる水槽。
 *
 * 層は奥から、水（グラデーション＋光条＋カースティクス）→ 奥の水草 →
 * 熱帯魚 10 種 → 手前の水草 → 昇る気泡。
 * 文字はこの上に DOM として重なるため、水の明るさはシェーダー側で抑え、
 * 魚は画面中央の帯（読む列）を避けて泳ぐ（page のとき）。
 */
export class AquariumScene {
  private renderer: THREE.WebGLRenderer;

  /** 水の一枚絵。クリップ座標のクアッドなのでカメラは形だけ */
  private waterScene = new THREE.Scene();
  private quadCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  private waterMaterial: THREE.ShaderMaterial;

  /** 水草と魚と気泡。横幅をアスペクトに合わせた正投影 */
  private worldScene = new THREE.Scene();
  private worldCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, -10, 10);

  private flocks: TetraFlock[];
  private plants: PlantLayer;
  private rocks: Rocks;
  private motes: THREE.Points;
  private moteMaterial: THREE.ShaderMaterial;

  private settings: (typeof SETTINGS)[Quality];
  private layout: AquariumLayout;
  private aspect = 1;
  private elapsed = 0;
  private lastTime = 0;
  private animationId = 0;
  private frame = 0;
  private running = false;
  private disposed = false;

  /** カーソル（NDC -1〜1）。しばらく動かなければ魚は忘れる */
  private pointer = { x: 0, y: 0, active: false, movedAt: -10 };

  constructor({ canvas, quality = "high", layout = "page" }: AquariumOptions) {
    this.settings = SETTINGS[quality];
    this.layout = layout;

    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: false,
      powerPreference: "high-performance",
    });
    this.renderer.setClearColor(0x000000, 1);
    this.renderer.autoClear = false;

    // ---- 水 ----
    this.waterMaterial = new THREE.ShaderMaterial({
      vertexShader: clipQuadVertex,
      fragmentShader: waterFragment,
      uniforms: {
        uTime: { value: 0 },
        uAspect: { value: 1 },
        uTank: { value: layout === "tank" ? 1 : 0 },
      },
      depthTest: false,
      depthWrite: false,
    });
    this.waterScene.add(
      new THREE.Mesh(new THREE.PlaneGeometry(2, 2), this.waterMaterial),
    );

    // ---- 水草 ----
    this.plants = new PlantLayer({
      backCount: this.settings.plantsBack,
      frontCount: this.settings.plantsFront,
      layout,
    });
    for (const mesh of this.plants.meshes) this.worldScene.add(mesh);

    // ---- 魚。10 種の住人 ----
    this.flocks = SPECIES.map(
      (species) =>
        new TetraFlock({
          ...species,
          layout,
          count: Math.max(2, Math.round(species.count * this.settings.fishScale)),
        }),
    );
    for (const flock of this.flocks) {
      flock.mesh.renderOrder = 2;
      this.worldScene.add(flock.mesh);
    }

    // ---- 岩組。魚より手前に置き、潜った魚を隠す ----
    this.rocks = new Rocks();
    for (const mesh of this.rocks.meshes) this.worldScene.add(mesh);

    // ---- 気泡 ----
    const moteCount = this.settings.motes;
    const seeds = new Float32Array(moteCount * 3);
    for (let i = 0; i < moteCount; i += 1) {
      seeds[i * 3] = Math.random();
      seeds[i * 3 + 1] = Math.random();
      seeds[i * 3 + 2] = Math.random();
    }
    const moteGeometry = new THREE.BufferGeometry();
    // position はドロー数を決めるためだけの空値。実位置は aSeed から作る
    moteGeometry.setAttribute(
      "position",
      new THREE.BufferAttribute(new Float32Array(moteCount * 3), 3),
    );
    moteGeometry.setAttribute("aSeed", new THREE.BufferAttribute(seeds, 3));
    this.moteMaterial = new THREE.ShaderMaterial({
      vertexShader: moteVertex,
      fragmentShader: moteFragment,
      uniforms: {
        uTime: { value: 0 },
        uPixelRatio: { value: 1 },
        uOpacity: { value: 0 },
        uTank: { value: layout === "tank" ? 1 : 0 },
      },
      transparent: true,
      depthTest: false,
      depthWrite: false,
    });
    this.motes = new THREE.Points(moteGeometry, this.moteMaterial);
    this.motes.frustumCulled = false;
    this.motes.renderOrder = 4;
    this.worldScene.add(this.motes);
  }

  resize(width: number, height: number) {
    if (width === 0 || height === 0) return;
    this.aspect = width / height;

    const dpr = Math.min(window.devicePixelRatio, this.settings.dpr);
    this.renderer.setPixelRatio(dpr);
    this.renderer.setSize(width, height, false);

    this.worldCamera.left = -this.aspect;
    this.worldCamera.right = this.aspect;
    this.worldCamera.updateProjectionMatrix();

    this.waterMaterial.uniforms.uAspect.value = this.aspect;
    this.plants.setAspect(this.aspect);
    this.rocks.setAspect(this.aspect);
    this.moteMaterial.uniforms.uPixelRatio.value = dpr;
  }

  /**
   * page ⇔ tank の切り替え（画面幅の境界をまたいだとき）。
   * 水と気泡はフラグひとつ、魚は壁と回遊目標の変更で自然に移り住む。
   * 水草だけは根元の位置が属性に焼き込みなので植え直す。
   */
  setLayout(layout: AquariumLayout) {
    if (this.layout === layout) return;
    this.layout = layout;

    const tank = layout === "tank" ? 1 : 0;
    this.waterMaterial.uniforms.uTank.value = tank;
    this.moteMaterial.uniforms.uTank.value = tank;
    for (const flock of this.flocks) flock.setLayout(layout);

    for (const mesh of this.plants.meshes) this.worldScene.remove(mesh);
    this.plants.dispose();
    this.plants = new PlantLayer({
      backCount: this.settings.plantsBack,
      frontCount: this.settings.plantsFront,
      layout,
    });
    for (const mesh of this.plants.meshes) this.worldScene.add(mesh);
    this.plants.setAspect(this.aspect);
  }

  setPointer(x: number, y: number) {
    this.pointer.x = x;
    this.pointer.y = y;
    this.pointer.active = true;
    this.pointer.movedAt = this.elapsed;
  }

  /** 開幕から数秒ぶん群れを泳がせて、散らばった自然な隊形にしておく。 */
  private prewarm() {
    for (let i = 0; i < 80; i += 1) {
      this.elapsed += 0.05;
      for (const flock of this.flocks) {
        flock.update(this.elapsed, null, this.aspect);
      }
    }
  }

  private draw() {
    this.renderer.clear(true, true);
    this.renderer.render(this.waterScene, this.quadCamera);
    this.renderer.clearDepth();
    this.renderer.render(this.worldScene, this.worldCamera);
  }

  private applyUniforms(fadeIn: number) {
    this.waterMaterial.uniforms.uTime.value = this.elapsed;
    this.moteMaterial.uniforms.uTime.value = this.elapsed;
    this.moteMaterial.uniforms.uOpacity.value = fadeIn;
    this.plants.update(this.elapsed);
    this.plants.setOpacity(fadeIn);
    for (const flock of this.flocks) flock.setOpacity(0.95 * fadeIn);
  }

  private loop = (timeMs: number) => {
    if (this.disposed || !this.running) return;
    this.animationId = requestAnimationFrame(this.loop);

    const time = timeMs / 1000;
    const dt = Math.min(time - this.lastTime || 0.016, 0.033);
    this.lastTime = time;
    this.elapsed += dt;
    this.frame += 1;

    // そっと現れる。ページの文字の FadeIn と同じ気配で
    const fadeIn = Math.min(this.frame / 90, 1);
    this.applyUniforms(fadeIn);

    // カーソルを 2.5 秒動かさなければ、魚は警戒を解く
    const pointer =
      this.pointer.active && this.elapsed - this.pointer.movedAt < 2.5
        ? this.pointer
        : null;
    for (const flock of this.flocks) {
      flock.update(this.elapsed, pointer, this.aspect);
    }

    this.draw();
  };

  start() {
    if (this.running || this.disposed) return;
    this.running = true;
    this.lastTime = performance.now() / 1000;
    if (this.frame === 0) this.prewarm();
    this.animationId = requestAnimationFrame(this.loop);
  }

  stop() {
    this.running = false;
    cancelAnimationFrame(this.animationId);
  }

  /** 1フレームだけ描く。reduced-motion のときはこれだけ呼ぶ。 */
  renderStill() {
    this.prewarm();
    this.applyUniforms(1);
    for (const flock of this.flocks) {
      flock.update(this.elapsed + 0.016, null, this.aspect);
    }
    this.draw();
  }

  dispose() {
    this.stop();
    this.disposed = true;
    for (const flock of this.flocks) flock.dispose();
    this.plants.dispose();
    this.rocks.dispose();
    this.motes.geometry.dispose();
    this.moteMaterial.dispose();
    this.waterMaterial.dispose();
    for (const object of this.waterScene.children) {
      if (object instanceof THREE.Mesh) object.geometry.dispose();
    }
    this.renderer.dispose();
  }
}
