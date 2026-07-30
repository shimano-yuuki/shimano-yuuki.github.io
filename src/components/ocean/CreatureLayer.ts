import * as THREE from "three";
import {
  BIG_GEOMETRY_BUILDERS,
  buildBigCreatureMaterial,
  type BigSpeciesId,
} from "./BigCreatures";
import { BoidsFlock } from "./BoidsFlock";
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
  /**
   * 泳ぎ方。
   * lateral: 横うねり（尾ほど振れる） / flap: 翼の羽ばたき（端ほど振れる）
   * pulse: 傘の脈動と触手の遅れ
   * amp は UV 空間での振幅、freq は体に乗る波の数、speed は拍の速さ。
   */
  swim: { mode: "lateral" | "flap" | "pulse"; amp: number; freq: number; speed: number };
};

const SWIM_MODE = { lateral: 0, flap: 1, pulse: 2 } as const;

// 2D のシルエットで残すのは、漆黒の帯に住む2種だけ。
// あの暗さでは輪郭しか見えないので、シルエット + 提灯の光が正しい表現になる。
// 明るい層のサメ・クジラ・マンタ・クラゲは 3D（BIG_SPECIES）へ移した
const SPECIES: Species[] = [
  { id: "squid", from: 0.62, to: 0.9, scale: 0.2, crossSeconds: 88, count: 1, bob: 0.03,
    swim: { mode: "pulse", amp: 0.03, freq: 1.0, speed: 1.0 } },
  { id: "anglerfish", from: 0.8, to: 1.0, scale: 0.18, crossSeconds: 110, count: 2, bob: 0.02,
    swim: { mode: "lateral", amp: 0.014, freq: 3.0, speed: 1.3 } },
];

/** 3D の大物。scale はワールド単位の体長（画面の高さが 2）。 */
type BigSpecies = {
  id: BigSpeciesId;
  from: number;
  to: number;
  scale: number;
  crossSeconds: number;
  count: number;
  bob: number;
  swim: { amp: number; freq: number; speed: number };
  /** 翼を見せるための一定の傾き（マンタ用）。 */
  roll?: number;
  /** 直立して漂う（クラゲ用）。回頭しない。 */
  upright?: boolean;
};

const BIG_SPECIES: BigSpecies[] = [
  { id: "shark", from: 0.16, to: 0.44, scale: 0.36, crossSeconds: 52, count: 1,
    bob: 0.012, swim: { amp: 0.05, freq: 4.5, speed: 2.6 } },
  { id: "whale", from: 0.44, to: 0.88, scale: 0.85, crossSeconds: 110, count: 2,
    bob: 0.01, swim: { amp: 0.06, freq: 3.0, speed: 1.5 } },
  { id: "manta", from: 0.36, to: 0.64, scale: 0.5, crossSeconds: 72, count: 1,
    bob: 0.018, swim: { amp: 0.14, freq: 0, speed: 1.7 }, roll: 0.5 },
  { id: "jellyfish", from: 0.34, to: 0.66, scale: 0.34, crossSeconds: 170, count: 3,
    bob: 0.05, swim: { amp: 0.07, freq: 0, speed: 1.5 }, upright: true },
];

/** 生物発光が自分の体に映る色。 */
const ANGLER_LIT = new THREE.Color(0.5, 0.42, 0.28);
const JELLY_LIT = new THREE.Color(0.2, 0.38, 0.5);

/** アトラス1枠の一辺（px）。 */
const CELL = 256;
const COLUMNS = 4;

type BigIndividual = {
  species: BigSpecies;
  mesh: THREE.Mesh;
  material: THREE.ShaderMaterial;
  offset: number;
  y: number;
  direction: 1 | -1;
  phase: number;
  parallax: number;
};

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
  /** 小魚の群れ。Boids で泳ぐ。 */
  private flock: BoidsFlock;
  /** 3D の大物。群れと同じシーンで描く。 */
  private bigs: BigIndividual[] = [];
  /** 深度パララックス用。前フレームの深度。 */
  private prevDepth = -1;

  constructor(quality: "high" | "low") {
    this.atlas = new THREE.CanvasTexture(this.paintAtlas());
    this.atlas.minFilter = THREE.LinearFilter;
    this.atlas.magFilter = THREE.LinearFilter;

    this.glowTexture = new THREE.CanvasTexture(this.paintGlow());
    this.glowTexture.minFilter = THREE.LinearFilter;

    this.build(quality);

    // 群れは 3D メッシュなので専用のシーンとカメラを持つ（BoidsFlock 参照）
    this.flock = new BoidsFlock({
      count: quality === "high" ? 48 : 24,
      from: 0.02,
      to: 0.44,
    });

    // 大物も同じ 3D シーンに住まわせる
    for (const species of BIG_SPECIES) {
      const geometry = BIG_GEOMETRY_BUILDERS[species.id]();
      const count = quality === "high" ? species.count : Math.max(1, species.count - 1);
      for (let i = 0; i < count; i += 1) {
        const material = buildBigCreatureMaterial(species.id, species.swim);
        const mesh = new THREE.Mesh(geometry, material);
        mesh.frustumCulled = false;
        // 群れ（z=0）より奥に置く。大物は常に群れの向こうを行く
        mesh.position.z = -1.5;

        const towardEdge = i % 2 === 0 ? -1 : 1;
        this.bigs.push({
          species,
          mesh,
          material,
          offset: Math.random(),
          y: 0.5 + towardEdge * (0.2 + Math.random() * 0.22),
          direction: Math.random() > 0.5 ? 1 : -1,
          phase: Math.random() * Math.PI * 2,
          parallax: 0.75 + Math.random() * 0.5,
        });
        this.flock.scene.add(mesh);
      }
    }
  }

  /** シルエット層 → 3D の群れ、の順で描く。 */
  render(renderer: THREE.WebGLRenderer) {
    renderer.render(this.scene, this.camera);
    // 群れは深度バッファを使うので、前のパスの深度を捨ててから描く
    renderer.clearDepth();
    renderer.render(this.flock.scene, this.flock.camera);
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
            uTime: { value: 0 },
            uPhase: { value: Math.random() * Math.PI * 2 },
            uSwim: {
              value: new THREE.Vector3(
                species.swim.amp,
                species.swim.freq,
                species.swim.speed,
              ),
            },
            uMode: { value: SWIM_MODE[species.swim.mode] },
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
    veil: number,
    waterLight: THREE.Color,
    pointer: { x: number; y: number } | null,
  ) {
    // 深度の変化量。潜れば生き物とすれ違う（上へ流れる）根拠になる
    if (this.prevDepth < 0) this.prevDepth = depth;
    const depthDelta = depth - this.prevDepth;
    this.prevDepth = depth;
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
      material.uniforms.uTime.value = time;
      (material.uniforms.uTint.value as THREE.Color).copy(tint);

      // 発光する種は、自分の光が体に映る。真っ黒な深海で影ごと消えないための照明
      if (species.id === "anglerfish") {
        (material.uniforms.uTint.value as THREE.Color).lerp(
          ANGLER_LIT, 0.55,
        );
      } else if (species.id === "jellyfish") {
        (material.uniforms.uTint.value as THREE.Color).lerp(
          JELLY_LIT, 0.3,
        );
      }
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
      // 潜るほど、その種の帯の中心を過ぎた分だけ上へ流れていく。
      // スクロール速度を直接足すと上下に跳ねて見えるので、
      // なめらかに補間される深度そのものに結びつける
      const drift = (depth - center) * -0.6 * individual.parallax;
      const bob = Math.sin(time * 0.35 + individual.phase) * species.bob;
      const y = (individual.y + bob + drift) * 2 - 1;

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

    // 3D の大物
    for (const big of this.bigs) {
      const { species, mesh, material } = big;
      const center = (species.from + species.to) / 2;
      const half = (species.to - species.from) / 2;
      const distance = Math.abs(depth - center) / Math.max(half, 0.001);
      const t = Math.min(Math.max((distance - 0.62) / 0.38, 0), 1);
      const presence = 1 - t * t * (3 - 2 * t);

      material.uniforms.uTime.value = time;
      (material.uniforms.uLift.value as THREE.Color).copy(tint);
      (material.uniforms.uWaterLight.value as THREE.Color).copy(waterLight);
      material.uniforms.uOpacity.value =
        presence * (0.92 - depth * 0.3) * (1 + veil * 0.45);

      if (presence <= 0.001) {
        mesh.visible = false;
        continue;
      }
      mesh.visible = true;

      const speed = big.parallax / species.crossSeconds;
      big.offset = (big.offset + speed * (1 / 60) * big.direction + 1) % 1;

      const x = big.offset * 2.4 - 1.2;
      const drift = (depth - center) * -0.6 * big.parallax;
      const bob = Math.sin(time * 0.35 + big.phase) * species.bob;
      const yTop = big.y + bob + drift;
      const yNdc = -(yTop * 2 - 1);

      const scale = species.scale * big.parallax;
      mesh.position.set(x * this.aspect, yNdc, -1.5);
      mesh.scale.setScalar(scale);

      if (species.upright) {
        // クラゲは回頭せず、ゆっくり傾いで漂う
        mesh.rotation.set(0, 0, Math.sin(time * 0.25 + big.phase) * 0.14);
      } else {
        const yaw = big.direction > 0 ? 0 : Math.PI;
        // マンタは翼が見える角度まで一定に傾ける
        const roll = (species.roll ?? 0) * -big.direction;
        mesh.rotation.order = "ZYX";
        mesh.rotation.set(roll, yaw, 0);
      }
    }

    // 群れ。単独遊泳と同じ濃度規則で出入りする
    {
      const center = (this.flock.from + this.flock.to) / 2;
      const half = (this.flock.to - this.flock.from) / 2;
      const distance = Math.abs(depth - center) / Math.max(half, 0.001);
      const t = Math.min(Math.max((distance - 0.62) / 0.38, 0), 1);
      const presence = 1 - t * t * (3 - 2 * t);
      this.flock.update(
        time,
        presence,
        tint,
        presence * (0.9 - depth * 0.35) * (1 + veil * 0.55),
        depthDelta,
        pointer,
        this.aspect,
        waterLight,
      );
    }
  }

  dispose() {
    this.flock.dispose();
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
  uniform float uTime;
  uniform float uPhase;
  /** x: 振幅（UV 空間）, y: 体に乗る波の数, z: 拍の速さ */
  uniform vec3 uSwim;
  /** 0: 横うねり / 1: 羽ばたき / 2: 脈動 */
  uniform float uMode;

  varying vec2 vUv;

  /**
   * 体を UV 側で歪めて泳がせる。
   * vUv は反転済みのアトラス向き（頭 = x が大きい側）なので、
   * どちらへ進んでいても尾の重みは同じ式で取れる。
   */
  vec2 swimWarp(vec2 uv) {
    float t = uTime * uSwim.z + uPhase;

    if (uMode < 0.5) {
      // 横うねり。頭はほぼ動かず、尾に向かって進行波の振幅が増える
      float tail = pow(1.0 - uv.x, 1.4);
      uv.y += sin(uv.x * uSwim.y - t) * uSwim.x * tail;
    } else if (uMode < 1.5) {
      // 羽ばたき。翼端（左右の端）ほど大きく上下する
      float wing = pow(abs(uv.x - 0.5) * 2.0, 1.6);
      uv.y += sin(t) * uSwim.x * wing;
    } else {
      // 脈動。傘が横に締まって開き、触手（v が小さい側）は遅れて揺れる
      float squeeze = 1.0 + sin(t) * uSwim.x;
      uv.x = 0.5 + (uv.x - 0.5) * squeeze;
      float trail = 1.0 - uv.y;
      uv.x += sin(t - trail * 2.4) * uSwim.x * 0.6 * trail * trail;
      uv.y += cos(t) * uSwim.x * 0.3 * (1.0 - trail);
    }
    return uv;
  }

  void main() {
    vec2 local = swimWarp(vUv);
    if (local.x < 0.0 || local.x > 1.0 || local.y < 0.0 || local.y > 1.0) {
      discard;
    }

    vec2 uv = uUvOffset + local * uUvScale;
    float mask = texture2D(uAtlas, uv).a;
    if (mask < 0.01) discard;
    gl_FragColor = vec4(uTint, mask * uOpacity);
  }
`;
