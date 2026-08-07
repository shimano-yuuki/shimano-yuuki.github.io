import * as THREE from "three";

/**
 * 作品スライドショーの WebGL 側。
 *
 * スライド1枚 = 平面メッシュ1枚。中央の枠（slot）に contain ではめ、
 * 左右には前後のスライドの端が覗く。遷移は横へ滑るパン
 * （減衰つきの追従）で、自動送り・番号ボタン・ドラッグのどれも同じ道を通る。
 * 循環配置なので最後の次は最初へ、同じ向きに流れ続ける。
 *
 * 演出の判断は docs/DESIGN.md の「作品スライドショー」の節が正。
 */

/** スライド同士のすき間（CSS px） */
const GAP = 16;
/** 追従の強さ。大きいほど速く目標へ寄る（1秒あたりの減衰率） */
const DAMPING = 5;
/** ドラッグをスライド送りとみなす移動量（スライド幅比） */
const SWIPE_THRESHOLD = 0.18;

export type SlideshowSceneOptions = {
  canvas: HTMLCanvasElement;
  /** スライドの絵。プレースホルダー canvas か、読み込み済みの実画像 */
  images: (HTMLCanvasElement | HTMLImageElement)[];
  /** prefers-reduced-motion。true なら遷移は瞬時 */
  reduced: boolean;
};

export class SlideshowScene {
  private renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 10);
  private geometry = new THREE.PlaneGeometry(1, 1);
  private meshes: THREE.Mesh[] = [];
  private materials: THREE.MeshBasicMaterial[] = [];
  private textures: THREE.Texture[] = [];
  private aspects: number[];

  /** スライド単位の連続座標。3 → 4 と進み続ける（4枚なら 4 ≡ 0） */
  private pos = 0;
  private target = 0;
  private dragging = false;
  private dragBase = 0;

  private slotWidth = 1;
  private viewHeight = 1;
  private frame = 0;
  private running = false;
  private lastTick = 0;
  private reduced: boolean;

  constructor({ canvas, images, reduced }: SlideshowSceneOptions) {
    this.reduced = reduced;

    // alpha: 絵の外を透明にして、後ろの固定背景（青い流れ）を見せる
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: false,
      alpha: true,
      premultipliedAlpha: true,
      powerPreference: "low-power",
    });
    this.renderer.setClearColor(0x000000, 0);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    this.aspects = images.map((image) => image.width / image.height);
    for (const image of images) {
      const texture = new THREE.CanvasTexture(image);
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.minFilter = THREE.LinearFilter;
      texture.magFilter = THREE.LinearFilter;
      this.textures.push(texture);

      const material = new THREE.MeshBasicMaterial({
        map: texture,
        transparent: true,
        depthTest: false,
        depthWrite: false,
      });
      this.materials.push(material);

      const mesh = new THREE.Mesh(this.geometry, material);
      this.meshes.push(mesh);
      this.scene.add(mesh);
    }
    this.camera.position.z = 1;
  }

  private get spacing() {
    return this.slotWidth + GAP;
  }

  resize(width: number, height: number, slotWidth: number) {
    if (width === 0 || height === 0) return;
    this.renderer.setSize(width, height, false);
    this.camera.left = -width / 2;
    this.camera.right = width / 2;
    this.camera.top = height / 2;
    this.camera.bottom = -height / 2;
    this.camera.updateProjectionMatrix();
    this.slotWidth = Math.max(1, slotWidth);
    this.viewHeight = height;
    this.layout();
    if (!this.running) this.renderStill();
  }

  /**
   * 循環配置。各スライドを pos に最も近い周回位置へ置き、
   * 中央から離れるほど少し薄く・小さくして主役を1枚に保つ
   */
  private layout() {
    const count = this.meshes.length;
    for (let i = 0; i < count; i++) {
      const turn = count > 1 ? Math.round((this.pos - i) / count) : 0;
      const k = i + count * turn;
      const distance = Math.abs(k - this.pos);

      // contain: slot × 高さの枠に、画像の縦横比のまま収める
      const aspect = this.aspects[i];
      const height = Math.min(this.viewHeight, this.slotWidth / aspect);
      const width = height * aspect;
      const shrink = 1 - Math.min(distance, 1) * 0.04;

      const mesh = this.meshes[i];
      mesh.position.x = (k - this.pos) * this.spacing;
      mesh.scale.set(width * shrink, height * shrink, 1);
      this.materials[i].opacity = Math.max(0.45, 1 - distance * 0.55);
    }
  }

  /** いまの目標を 0..N-1 に正規化した値 */
  private normalizedTarget() {
    const count = this.meshes.length;
    return ((Math.round(this.target) % count) + count) % count;
  }

  /** index のスライドへ、近い方の向きでパンする */
  show(index: number) {
    const count = this.meshes.length;
    if (count === 0 || this.normalizedTarget() === index) return;

    let delta = (((index - this.target) % count) + count) % count;
    if (delta > count / 2) delta -= count;
    this.target = Math.round(this.target + delta);

    if (this.reduced || !this.running) {
      this.pos = this.target;
      this.layout();
      this.renderStill();
    }
  }

  /** ドラッグ開始。以降 dragBy の間は追従を止めて指に付ける */
  beginDrag() {
    this.dragging = true;
    this.dragBase = this.pos;
  }

  /** ドラッグ中。deltaX は開始点からの移動量（CSS px、右が正） */
  dragBy(deltaX: number) {
    if (!this.dragging) return;
    this.pos = this.dragBase - deltaX / this.spacing;
    this.layout();
    if (!this.running) this.renderStill();
  }

  /**
   * ドラッグ終了。しきい値を超えていればその向きへ送り、
   * 止まる先のスライド番号（0..N-1）を返す
   */
  endDrag(): number {
    this.dragging = false;
    const count = this.meshes.length;
    const moved = this.pos - this.dragBase;
    const steps =
      Math.abs(moved) > SWIPE_THRESHOLD
        ? Math.sign(moved) * Math.max(1, Math.round(Math.abs(moved)))
        : 0;
    this.target = Math.round(this.dragBase) + steps;

    if (this.reduced || !this.running) {
      this.pos = this.target;
      this.layout();
      this.renderStill();
    }
    return ((this.target % count) + count) % count;
  }

  setReduced(reduced: boolean) {
    this.reduced = reduced;
    if (reduced) {
      this.stop();
      this.pos = this.target;
      this.layout();
      this.renderStill();
    } else {
      this.start();
    }
  }

  start() {
    if (this.running || this.reduced) return;
    this.running = true;
    this.lastTick = performance.now();
    const tick = () => {
      if (!this.running) return;
      const now = performance.now();
      const dt = Math.min(0.1, (now - this.lastTick) / 1000);
      this.lastTick = now;

      if (!this.dragging && this.pos !== this.target) {
        this.pos += (this.target - this.pos) * (1 - Math.exp(-DAMPING * dt));
        if (Math.abs(this.target - this.pos) < 0.0005) this.pos = this.target;
      }
      this.layout();

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
    for (const material of this.materials) material.dispose();
    this.geometry.dispose();
    this.renderer.dispose();
  }
}
