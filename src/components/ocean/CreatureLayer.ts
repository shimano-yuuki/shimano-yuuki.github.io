import * as THREE from "three";
import { CREATURE_PAINTERS, GLOW_POINTS, type CreatureId } from "./creatures";

/**
 * 深度帯ごとに泳ぐ生き物の層。
 *
 * シルエットは起動時に1枚のアトラスへ焼き、板ポリに割り当てて描く。
 * 各個体は自分の深度帯を持ち、そこから離れるほど水に溶けて消える。
 * 位置は流体の速度場からも押されるので、貼り付けた絵ではなく水の中を漂って見える。
 */

type Species = {
  id: CreatureId;
  /** 出現する深度帯。 */
  from: number;
  to: number;
  /** 画面幅に対する大きさ。 */
  scale: number;
  /** 画面を横切るのにかかるおおよその秒数。 */
  crossSeconds: number;
  /** 何体出すか。 */
  count: number;
  /** 縦の揺れ幅。 */
  bob: number;
};

const SPECIES: Species[] = [
  { id: "fish", from: 0.0, to: 0.22, scale: 0.05, crossSeconds: 26, count: 5, bob: 0.03 },
  { id: "school", from: 0.1, to: 0.42, scale: 0.2, crossSeconds: 52, count: 2, bob: 0.02 },
  { id: "shark", from: 0.18, to: 0.44, scale: 0.16, crossSeconds: 40, count: 1, bob: 0.012 },
  { id: "jellyfish", from: 0.34, to: 0.66, scale: 0.11, crossSeconds: 120, count: 3, bob: 0.06 },
  { id: "manta", from: 0.38, to: 0.64, scale: 0.19, crossSeconds: 62, count: 1, bob: 0.02 },
  { id: "whale", from: 0.56, to: 0.84, scale: 0.42, crossSeconds: 110, count: 1, bob: 0.015 },
  { id: "squid", from: 0.62, to: 0.9, scale: 0.2, crossSeconds: 88, count: 1, bob: 0.03 },
  { id: "anglerfish", from: 0.82, to: 1.0, scale: 0.13, crossSeconds: 150, count: 2, bob: 0.02 },
];

/** アトラス1枠の一辺（px）。 */
const CELL = 256;
const COLUMNS = 4;

type Individual = {
  species: Species;
  mesh: THREE.Mesh;
  /** 0〜1 の横位置。1 を超えたら反対側へ回り込む。 */
  offset: number;
  /** 縦位置。読む列を避けるため上下に寄せる。 */
  y: number;
  direction: 1 | -1;
  phase: number;
  /** 手前ほど大きく速い。 */
  parallax: number;
  glow?: THREE.Mesh;
};

export class CreatureLayer {
  readonly scene = new THREE.Scene();
  /**
   * 生き物だけの正射影カメラ。
   * 流体のパスはクリップ座標を直接出すのでカメラを使わないが、
   * こちらはメッシュの位置と大きさで配置するため専用に持つ。
   * 画面全体が -1〜1 に収まる。
   */
  readonly camera = new THREE.OrthographicCamera(-1, 1, 1, -1, -10, 10);
  private individuals: Individual[] = [];
  private atlas: THREE.CanvasTexture;
  private glowTexture: THREE.CanvasTexture;
  private aspect = 1;

  constructor(quality: "high" | "low") {
    this.atlas = new THREE.CanvasTexture(this.paintAtlas());
    this.atlas.minFilter = THREE.LinearFilter;
    this.atlas.magFilter = THREE.LinearFilter;

    this.glowTexture = new THREE.CanvasTexture(this.paintGlow());
    this.glowTexture.minFilter = THREE.LinearFilter;

    this.build(quality);
  }

  /** 全種類を1枚のキャンバスに並べて焼く。 */
  private paintAtlas(): HTMLCanvasElement {
    const ids = Object.keys(CREATURE_PAINTERS) as CreatureId[];
    const rows = Math.ceil(ids.length / COLUMNS);
    const canvas = document.createElement("canvas");
    canvas.width = CELL * COLUMNS;
    canvas.height = CELL * rows;

    const context = canvas.getContext("2d");
    if (!context) return canvas;

    ids.forEach((id, index) => {
      const cx = (index % COLUMNS) * CELL;
      const cy = Math.floor(index / COLUMNS) * CELL;
      context.save();
      context.translate(cx, cy);
      // 白で描いておき、色は描画時に掛ける
      context.fillStyle = "#ffffff";
      CREATURE_PAINTERS[id](context, CELL);
      context.restore();
    });

    return canvas;
  }

  /** 提灯やクラゲの発光に使う、放射状のにじみ。 */
  private paintGlow(): HTMLCanvasElement {
    const size = 128;
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = size;
    const context = canvas.getContext("2d");
    if (!context) return canvas;

    const gradient = context.createRadialGradient(
      size / 2, size / 2, 0,
      size / 2, size / 2, size / 2,
    );
    gradient.addColorStop(0, "rgba(255,255,255,1)");
    gradient.addColorStop(0.22, "rgba(255,255,255,0.55)");
    gradient.addColorStop(1, "rgba(255,255,255,0)");
    context.fillStyle = gradient;
    context.fillRect(0, 0, size, size);
    return canvas;
  }

  /** アトラス内の位置から UV のオフセットとスケールを出す。 */
  private uvFor(id: CreatureId) {
    const ids = Object.keys(CREATURE_PAINTERS) as CreatureId[];
    const index = ids.indexOf(id);
    const rows = Math.ceil(ids.length / COLUMNS);
    return {
      offset: new THREE.Vector2(
        (index % COLUMNS) / COLUMNS,
        1 - (Math.floor(index / COLUMNS) + 1) / rows,
      ),
      scale: new THREE.Vector2(1 / COLUMNS, 1 / rows),
    };
  }

  private build(quality: "high" | "low") {
    const geometry = new THREE.PlaneGeometry(1, 1);

    for (const species of SPECIES) {
      // 端末が非力なときは頭数を減らす
      const count = quality === "high" ? species.count : Math.max(1, species.count - 1);

      for (let i = 0; i < count; i += 1) {
        const uv = this.uvFor(species.id);
        const material = new THREE.ShaderMaterial({
          vertexShader: creatureVertex,
          fragmentShader: creatureFragment,
          uniforms: {
            uAtlas: { value: this.atlas },
            uUvOffset: { value: uv.offset },
            uUvScale: { value: uv.scale },
            uOpacity: { value: 0 },
            uTint: { value: new THREE.Color(0, 0, 0) },
            uFlip: { value: 1 },
          },
          transparent: true,
          depthTest: false,
          depthWrite: false,
        });

        const mesh = new THREE.Mesh(geometry, material);
        mesh.frustumCulled = false;

        // 読む列（中央）を避け、上下に寄せて配置する
        const towardEdge = i % 2 === 0 ? -1 : 1;
        const y = 0.5 + towardEdge * (0.2 + Math.random() * 0.22);

        const individual: Individual = {
          species,
          mesh,
          offset: Math.random(),
          y,
          direction: Math.random() > 0.5 ? 1 : -1,
          phase: Math.random() * Math.PI * 2,
          parallax: 0.7 + Math.random() * 0.6,
        };

        // 発光を持つ種類には、加算合成の光をぶら下げる
        const glow = GLOW_POINTS[species.id];
        if (glow) {
          const glowMesh = new THREE.Mesh(
            geometry,
            new THREE.MeshBasicMaterial({
              map: this.glowTexture,
              transparent: true,
              blending: THREE.AdditiveBlending,
              depthTest: false,
              depthWrite: false,
              color:
                species.id === "anglerfish"
                  ? new THREE.Color(1.0, 0.92, 0.72)
                  : new THREE.Color(0.55, 0.86, 1.0),
            }),
          );
          glowMesh.frustumCulled = false;
          individual.glow = glowMesh;
          this.scene.add(glowMesh);
        }

        this.scene.add(mesh);
        this.individuals.push(individual);
      }
    }
  }

  setAspect(aspect: number) {
    this.aspect = aspect;
  }

  /**
   * 位置と濃さを更新する。
   * @param depth いまの深度
   * @param time 経過秒
   * @param flow スクロールの勢い。速く送ると生き物も流される。
   */
  update(
    depth: number,
    time: number,
    flow: number,
    veil: number,
    waterLight: THREE.Color,
  ) {
    /*
      浅い水では逆光の黒いシルエットが正しい。
      しかし本文の背後では水を落としているので、黒いままだと黒に溶けて消える。
      そこでベールが濃いほど、水の明るい側の色をわずかに帯びさせ、
      「暗い水の中でうっすら光を返す影」に寄せる。
    */
    // ベールは DOM の膜なので生き物ごと暗くする。埋もれないよう、
    // ベールが濃いときは水の明部よりさらに明るい側へ寄せる。
    const lift = Math.pow(veil, 1.4);
    const tint = new THREE.Color(0, 0, 0).lerp(
      new THREE.Color(
        Math.min(waterLight.r * 1.7, 1),
        Math.min(waterLight.g * 1.7, 1),
        Math.min(waterLight.b * 1.7, 1),
      ),
      lift,
    );

    for (const individual of this.individuals) {
      const { species, mesh } = individual;

      // 深度帯の中では常に見えていて、縁に近づいたときだけ溶けて消える。
      // 中心からの二乗で落とすと帯の端で必ず 0 になり、
      // 水面や最深部にいる種類が出てこないため、内側は平らに保つ。
      const center = (species.from + species.to) / 2;
      const half = (species.to - species.from) / 2;
      const distance = Math.abs(depth - center) / Math.max(half, 0.001);
      const t = Math.min(Math.max((distance - 0.62) / 0.38, 0), 1);
      const presence = 1 - t * t * (3 - 2 * t);

      const material = mesh.material as THREE.ShaderMaterial;
      (material.uniforms.uTint.value as THREE.Color).copy(tint);
      // 深いほど水に溶けて輪郭が薄くなる。
      // ベールの下では逆に少し濃くしないと、暗い水に埋もれてしまう。
      material.uniforms.uOpacity.value =
        presence * (0.9 - depth * 0.35) * (1 + veil * 0.55);

      if (presence <= 0.001) {
        mesh.visible = false;
        if (individual.glow) individual.glow.visible = false;
        continue;
      }
      mesh.visible = true;

      // 横に進む。1 を超えたら反対側から入り直す。
      const speed = individual.parallax / species.crossSeconds;
      individual.offset =
        (individual.offset + speed * (1 / 60) * individual.direction + 1) % 1;

      const x = individual.offset * 2.4 - 1.2;
      const bob =
        Math.sin(time * 0.35 + individual.phase) * species.bob +
        // スクロールの勢いで押し流される
        flow * 0.35;
      const y = (individual.y + bob) * 2 - 1;

      const width = species.scale * individual.parallax;
      const height = width * this.aspect;

      mesh.position.set(x, -y, 0);
      mesh.scale.set(width * 2, height * 2, 1);
      material.uniforms.uFlip.value = individual.direction;

      if (individual.glow) {
        const glowSpot = GLOW_POINTS[species.id];
        if (glowSpot) {
          const [gx, gy, gr] = glowSpot;
          // シルエットの中の発光位置に合わせる
          const localX = (gx - 0.5) * width * 2 * individual.direction;
          const localY = (0.5 - gy) * height * 2;
          individual.glow.visible = true;
          individual.glow.position.set(x + localX, -y + localY, 0);
          const pulse = 0.85 + Math.sin(time * 1.1 + individual.phase) * 0.15;
          individual.glow.scale.setScalar(gr * width * 9 * pulse);
          (individual.glow.material as THREE.MeshBasicMaterial).opacity =
            presence * 0.85 * pulse;
        }
      }
    }
  }

  dispose() {
    this.atlas.dispose();
    this.glowTexture.dispose();
    this.scene.traverse((object) => {
      const mesh = object as Partial<THREE.Mesh>;
      mesh.geometry?.dispose();
      const material = mesh.material;
      if (Array.isArray(material)) material.forEach((m) => m.dispose());
      else material?.dispose();
    });
  }
}

const creatureVertex = /* glsl */ `
  uniform float uFlip;
  varying vec2 vUv;

  void main() {
    // 進行方向に合わせて左右を反転する
    vUv = vec2(uFlip > 0.0 ? uv.x : 1.0 - uv.x, uv.y);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const creatureFragment = /* glsl */ `
  precision highp float;

  uniform sampler2D uAtlas;
  uniform vec2 uUvOffset;
  uniform vec2 uUvScale;
  uniform float uOpacity;
  uniform vec3 uTint;

  varying vec2 vUv;

  void main() {
    vec2 uv = uUvOffset + vUv * uUvScale;
    float mask = texture2D(uAtlas, uv).a;
    if (mask < 0.01) discard;
    gl_FragColor = vec4(uTint, mask * uOpacity);
  }
`;
