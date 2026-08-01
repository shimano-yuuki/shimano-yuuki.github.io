import * as THREE from "three";

/**
 * 小型熱帯魚の群れ。古典 Boids（分離・整列・結合）で泳がせる。
 *
 * 魚は板ポリの絵ではなく、コードで生成した 3D メッシュ。
 * 紡錘形の胴・二又の尾びれ・背びれを持ち、向きを変えるときは
 * 縦軸で回頭するので、正面・背面の見付きが本当に変わる。
 * 旋回時は体を傾け（バンク）、体側のうねりは法線を揺らして
 * 光のさざめきとして見える。外部モデルは使わない。
 *
 * 種の違いは「装い（配色・縞・鼻先の差し色）」と「体つき（体高・ヒレ）」と
 * 「暮らし（泳層・速さ）」のパラメータで表す。テトラもエンゼルもコリドラスも
 * 同じ仕組みから生まれる。描画は 1 群れにつき InstancedMesh の1ドローコール。
 */

export type SpeciesLook = {
  /** 背中。上から見られても沈む色 */
  back: THREE.Color;
  /** 体側の輝線。カージナルの藍のように光を返す帯。不要なら黒 */
  stripe: THREE.Color;
  /** 腹側。カージナルの赤、エンバーの橙など種の見せ場 */
  belly: THREE.Color;
  /** 鼻先の差し色（ラミーノーズの赤）。amount 0 で無効 */
  nose?: THREE.Color;
  noseAmount?: number;
  /** 体の横縞の濃さ 0〜1（スマトラ・エンゼル） */
  bars?: number;
};

export type SpeciesBody = {
  /** 体高の倍率。1 でテトラ、2 超でエンゼルの円盤形 */
  depth?: number;
  /** 腹の張り出し。ハチェットの竜骨で使う */
  keel?: number;
  /** 背びれ・尻びれの縦倍率（エンゼルの帆） */
  finHeight?: number;
  /** 尾びれの大きさ */
  tail?: number;
};

export type FlockOptions = {
  count: number;
  look: SpeciesLook;
  body?: SpeciesBody;
  /** 体長（ワールド単位。画面の高さが 2）。 */
  bodyLength?: number;
  /** 泳ぐ速さの倍率。大型はゆっくり */
  speed?: number;
  /** 好みの泳層（NDC y）。コリドラスは底、ハチェットは水面近く */
  preferredY?: number | null;
  /** 奥行き。群れごとに少しずらすと重なりが読める */
  z?: number;
};

/** 泳ぐ速さ（NDC/秒）。止まると死んで見えるので下限を切らない。 */
const CRUISE = 0.1;
const MIN_SPEED = 0.05;
const MAX_SPEED = 0.3;

/**
 * 魚のメッシュをコードで組む。小型カラシン（テトラ）を基本形に、
 * 体高・竜骨・ヒレの倍率で種の体つきを変える。
 * x+ が鼻先、x- が尾。長さ 1、原点は体の中心。
 * ヒレは aFin=1 の薄板で、シェーダー側で半透明にする。
 */
function buildFishGeometry({
  depth = 1,
  keel = 1,
  finHeight = 1,
  tail = 1,
}: SpeciesBody): THREE.BufferGeometry {
  const RINGS = 28;
  const SEGMENTS = 14;

  const positions: number[] = [];
  const indices: number[] = [];

  // 体高。最大は体の前 4 割あたり。尾柄で細く絞る
  const height = (t: number) =>
    Math.max(
      0.155 * depth * Math.pow(Math.sin(Math.PI * Math.pow(t, 0.7)), 0.95),
      0.018,
    );
  // 横幅は体高の半分弱（体高倍率には追従させない。円盤形は薄いのが正しい）
  const width = (t: number) =>
    0.155 * Math.pow(Math.sin(Math.PI * Math.pow(t, 0.7)), 0.95) *
      (0.46 - 0.12 * t) +
    0.006;
  // 断面の中心。腹側へ下げると「背は張り、腹は深い」魚の輪郭になる
  const centerY = (t: number) =>
    -0.018 * keel * Math.sin(Math.PI * Math.pow(t, 0.85));

  for (let ring = 0; ring <= RINGS; ring += 1) {
    const t = ring / RINGS;
    const x = 0.5 - t * 0.92; // 鼻先 +0.5 → 尾柄 -0.42
    const ry = height(t);
    const rz = width(t);
    const cy = centerY(t);
    for (let seg = 0; seg < SEGMENTS; seg += 1) {
      const a = (seg / SEGMENTS) * Math.PI * 2;
      positions.push(x, cy + Math.cos(a) * ry, Math.sin(a) * rz);
    }
  }

  for (let ring = 0; ring < RINGS; ring += 1) {
    for (let seg = 0; seg < SEGMENTS; seg += 1) {
      const a = ring * SEGMENTS + seg;
      const b = ring * SEGMENTS + ((seg + 1) % SEGMENTS);
      const c = (ring + 1) * SEGMENTS + seg;
      const d = (ring + 1) * SEGMENTS + ((seg + 1) % SEGMENTS);
      indices.push(a, c, b, b, c, d);
    }
  }

  // 鼻先と尾柄をふさぐ
  const noseTip = positions.length / 3;
  positions.push(0.515, centerY(0), 0);
  for (let seg = 0; seg < SEGMENTS; seg += 1) {
    indices.push(noseTip, seg, (seg + 1) % SEGMENTS);
  }
  const tailTip = positions.length / 3;
  positions.push(-0.435, centerY(1), 0);
  const lastRing = RINGS * SEGMENTS;
  for (let seg = 0; seg < SEGMENTS; seg += 1) {
    indices.push(tailTip, lastRing + ((seg + 1) % SEGMENTS), lastRing + seg);
  }

  const body = new THREE.BufferGeometry();
  body.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  body.setIndex(indices);
  body.computeVertexNormals();

  // ---- ヒレ。すべて薄板の三角形 ----
  // 尾びれ。付け根 (-0.41, 0) を支点に大きさを変える
  const tailFin = [
    -0.41, 0.025, 0, -0.62, 0.15, 0, -0.52, 0.014, 0,
    -0.62, 0.15, 0, -0.55, 0.045, 0, -0.52, 0.014, 0,
    -0.41, -0.025, 0, -0.52, -0.014, 0, -0.62, -0.15, 0,
    -0.62, -0.15, 0, -0.52, -0.014, 0, -0.55, -0.045, 0,
  ].map((v, i) => {
    if (i % 3 === 0) return -0.41 + (v + 0.41) * tail;
    if (i % 3 === 1) return v * Math.max(tail, depth * 0.75);
    return v;
  });
  // 背びれと尻びれ。体高に追従し、finHeight でさらに伸ばす（エンゼルの帆）
  const vertical = depth * finHeight;
  const dorsalAnal = [
    // 背びれ
    0.1, 0.13, 0, 0.02, 0.24, 0, -0.05, 0.11, 0,
    0.02, 0.24, 0, -0.09, 0.16, 0, -0.05, 0.11, 0,
    // 尻びれ（カラシンの長い尻びれ）
    -0.05, -0.12, 0, -0.16, -0.19, 0, -0.28, -0.07, 0,
  ].map((v, i) => (i % 3 === 1 ? v * vertical : v));
  // 胸びれ（左右）。後ろ下へ開く
  const pectorals = [
    0.24, -0.04, 0.05, 0.1, -0.11, 0.11, 0.09, -0.05, 0.07,
    0.24, -0.04, -0.05, 0.09, -0.05, -0.07, 0.1, -0.11, -0.11,
  ];

  const fins = new THREE.BufferGeometry();
  fins.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(
      [...tailFin, ...dorsalAnal, ...pectorals],
      3,
    ),
  );
  fins.computeVertexNormals();

  // ---- 結合し、体/ヒレの区別を aFin 属性で持たせる ----
  const bodyNonIndexed = body.toNonIndexed();
  const bodyPos = bodyNonIndexed.getAttribute("position");
  const bodyNorm = bodyNonIndexed.getAttribute("normal");
  const finPos = fins.getAttribute("position");
  const finNorm = fins.getAttribute("normal");

  const total = bodyPos.count + finPos.count;
  const mergedPositions = new Float32Array(total * 3);
  const mergedNormals = new Float32Array(total * 3);
  const finFlags = new Float32Array(total);
  mergedPositions.set(bodyPos.array as Float32Array, 0);
  mergedPositions.set(finPos.array as Float32Array, bodyPos.count * 3);
  mergedNormals.set(bodyNorm.array as Float32Array, 0);
  mergedNormals.set(finNorm.array as Float32Array, bodyPos.count * 3);
  finFlags.fill(1, bodyPos.count);

  const merged = new THREE.BufferGeometry();
  merged.setAttribute("position", new THREE.BufferAttribute(mergedPositions, 3));
  merged.setAttribute("normal", new THREE.BufferAttribute(mergedNormals, 3));
  merged.setAttribute("aFin", new THREE.BufferAttribute(finFlags, 1));

  body.dispose();
  bodyNonIndexed.dispose();
  fins.dispose();
  return merged;
}

export class TetraFlock {
  readonly mesh: THREE.InstancedMesh;

  private material: THREE.ShaderMaterial;
  private positions: Float32Array;
  private velocities: Float32Array;
  /** 個体差。大きさの倍率。大きい個体はわずかに遅い。 */
  private sizes: Float32Array;
  /** 回頭の状態。0 = 右向き、π = 左向き。目標へ滑らかに追従する。 */
  private yaws: Float32Array;
  private prevHeadings: Float32Array;
  private count: number;
  private bodyLength: number;
  private speed: number;
  private preferredY: number | null;
  private z: number;
  /** 回遊目標の位相。群れごとにずらして、皆が同じ点に集まらないようにする */
  private wanderPhase = Math.random() * Math.PI * 2;
  private dummy = new THREE.Object3D();
  private lastTime = 0;

  constructor({
    count,
    look,
    body = {},
    bodyLength = 0.075,
    speed = 1,
    preferredY = null,
    z = 0,
  }: FlockOptions) {
    this.count = count;
    this.bodyLength = bodyLength;
    this.speed = speed;
    this.preferredY = preferredY;
    this.z = z;

    this.positions = new Float32Array(count * 2);
    this.velocities = new Float32Array(count * 2);
    this.sizes = new Float32Array(count);
    this.yaws = new Float32Array(count);
    this.prevHeadings = new Float32Array(count);

    // 群れらしく、ひとかたまりの周辺にばらまいて始める
    const cx = Math.random() * 1.2 - 0.6;
    const cy =
      preferredY ?? (Math.random() > 0.5 ? 0.55 : -0.55);
    const heading = Math.random() > 0.5 ? 0 : Math.PI;
    for (let i = 0; i < count; i += 1) {
      this.positions[i * 2] = cx + (Math.random() - 0.5) * 0.5;
      this.positions[i * 2 + 1] = cy + (Math.random() - 0.5) * 0.25;
      this.velocities[i * 2] = Math.cos(heading) * CRUISE * speed;
      this.velocities[i * 2 + 1] = (Math.random() - 0.5) * CRUISE * 0.4;
      this.sizes[i] = 0.72 + Math.random() * 0.55;
      this.yaws[i] = heading > 1 ? Math.PI : 0;
    }

    const geometry = buildFishGeometry(body);
    const phases = new Float32Array(count);
    for (let i = 0; i < count; i += 1) phases[i] = Math.random() * Math.PI * 2;
    geometry.setAttribute(
      "aPhase",
      new THREE.InstancedBufferAttribute(phases, 1),
    );

    this.material = new THREE.ShaderMaterial({
      vertexShader: fishVertex,
      fragmentShader: fishFragment,
      uniforms: {
        uTime: { value: 0 },
        uOpacity: { value: 0 },
        uBack: { value: look.back },
        uStripe: { value: look.stripe },
        uBelly: { value: look.belly },
        uNose: { value: look.nose ?? new THREE.Color(0, 0, 0) },
        uNoseAmount: { value: look.noseAmount ?? 0 },
        uBars: { value: look.bars ?? 0 },
        // 水明かり。水面の光の色
        uWaterLight: { value: new THREE.Color(0.36, 0.62, 0.68) },
      },
      transparent: true,
      side: THREE.DoubleSide,
      depthTest: true,
      depthWrite: true,
    });

    this.mesh = new THREE.InstancedMesh(geometry, this.material, count);
    this.mesh.frustumCulled = false;
    this.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  }

  setOpacity(value: number) {
    this.material.uniforms.uOpacity.value = value;
  }

  /**
   * 1フレームぶん進める。
   * @param pointer カーソルの NDC 座標（-1〜1）。無ければ null
   */
  update(
    time: number,
    pointer: { x: number; y: number } | null,
    aspect: number,
  ) {
    this.material.uniforms.uTime.value = time;

    const dt = Math.min(Math.max(time - this.lastTime, 0), 0.05);
    this.lastTime = time;
    if (dt === 0) return;

    // 群れ全体が追いかける回遊目標。ゆっくり動く点で、群れが一体で曲がる理由になる
    const wt = time + this.wanderPhase * 20.0;
    const targetX = Math.sin(wt * 0.05) * 0.8 + Math.sin(wt * 0.013) * 0.3;
    const targetY =
      Math.sin(wt * 0.083 + 1.7) * 0.55 * Math.sign(Math.sin(wt * 0.011) || 1);

    const p = this.positions;
    const v = this.velocities;

    for (let i = 0; i < this.count; i += 1) {
      const ix = i * 2;
      const x = p[ix];
      const y = p[ix + 1];

      // --- 3つの規則。近傍は全探索(数十匹なので十分軽い) ---
      let sepX = 0, sepY = 0;
      let aliX = 0, aliY = 0;
      let cohX = 0, cohY = 0;
      let neighbors = 0;

      for (let j = 0; j < this.count; j += 1) {
        if (j === i) continue;
        const jx = j * 2;
        const dx = p[jx] - x;
        const dy = p[jx + 1] - y;
        const d2 = dx * dx + dy * dy;

        if (d2 < 0.002) {
          // 分離: 近すぎる相手からは距離の二乗に反比例して離れる
          sepX -= dx / (d2 + 0.0001);
          sepY -= dy / (d2 + 0.0001);
        }
        if (d2 < 0.04) {
          aliX += v[jx];
          aliY += v[jx + 1];
          cohX += p[jx];
          cohY += p[jx + 1];
          neighbors += 1;
        }
      }

      let fx = sepX * 0.0022;
      let fy = sepY * 0.0022;

      if (neighbors > 0) {
        // 整列: 近くの平均速度へ寄せる
        fx += (aliX / neighbors - v[ix]) * 1.4;
        fy += (aliY / neighbors - v[ix + 1]) * 1.4;
        // 結合: 近くの重心へ寄る
        fx += (cohX / neighbors - x) * 0.55;
        fy += (cohY / neighbors - y) * 0.55;
      }

      // 回遊目標へゆるく引かれる。泳層持ちは縦は泳層へ帰る
      fx += (targetX - x) * 0.055;
      if (this.preferredY === null) {
        fy += (targetY - y) * 0.055;
      } else {
        fy += (this.preferredY - y) * 1.1;
      }

      // 読む列（画面中央の帯）からの斥力。可読性のための規則。
      // 群れが本文の真後ろを通ると一瞬コントラストが落ちるため、
      // 帯を広めに取り、押し返しも強めにしてある
      if (Math.abs(y) < 0.34) {
        fy += (y >= 0 ? 1 : -1) * (1 - Math.abs(y) / 0.34) * 0.26;
      }

      // カーソルからの逃避。群れが割れて、離れると再結合する
      if (pointer) {
        const dx = x - pointer.x;
        const dy = y - pointer.y;
        const d = Math.hypot(dx * aspect, dy);
        if (d < 0.38 && d > 0.0001) {
          const panic = (1 - d / 0.38) * 1.9;
          fx += (dx / d) * panic;
          fy += (dy / d) * panic;
        }
      }

      // 上下の壁は柔らかく押し返す
      if (y > 0.88) fy -= (y - 0.88) * 3;
      if (y < -0.88) fy += (-0.88 - y) * 3;

      v[ix] += fx * dt;
      v[ix + 1] += fy * dt;

      // 速度を泳げる範囲に収める。大きい個体はわずかに遅い
      const limit = this.speed / (0.85 + this.sizes[i] * 0.2);
      const speed = Math.hypot(v[ix], v[ix + 1]);
      const max = MAX_SPEED * limit;
      const min = MIN_SPEED * this.speed;
      if (speed > max) {
        v[ix] *= max / speed;
        v[ix + 1] *= max / speed;
      } else if (speed < min) {
        const scale = speed > 0.0001 ? min / speed : 0;
        if (scale === 0) {
          v[ix] = CRUISE * this.speed;
        } else {
          v[ix] *= scale;
          v[ix + 1] *= scale;
        }
      }

      p[ix] += v[ix] * dt;
      p[ix + 1] += v[ix + 1] * dt;

      // 横は画面外でループ
      if (p[ix] > 1.3) p[ix] = -1.3;
      else if (p[ix] < -1.3) p[ix] = 1.3;
    }

    // --- 姿勢を決めてインスタンス行列へ ---
    for (let i = 0; i < this.count; i += 1) {
      const ix = i * 2;
      // ワールド座標（x はアスペクトぶん広い）での速度から向きを決める
      const vxw = v[ix] * aspect;
      const vyw = v[ix + 1];

      // 回頭。右向きなら 0、左向きなら π。縦軸でゆっくり回るので、
      // 向きを変える瞬間は正面（背面）の見付きになる
      const targetYaw = vxw >= 0 ? 0 : Math.PI;
      this.yaws[i] += (targetYaw - this.yaws[i]) * Math.min(dt * 4.5, 1);
      const yaw = this.yaws[i];

      // 進行方向への傾き。回頭後の座標系で小さな角度になる式を使う
      const pitch =
        targetYaw === 0
          ? Math.atan2(vyw, Math.max(vxw, 0.0001))
          : Math.atan2(-vyw, Math.max(-vxw, 0.0001));

      // 旋回の速さに応じて体を傾ける（バンク）
      const heading = Math.atan2(vyw, vxw);
      let turn = heading - this.prevHeadings[i];
      if (turn > Math.PI) turn -= Math.PI * 2;
      if (turn < -Math.PI) turn += Math.PI * 2;
      this.prevHeadings[i] = heading;
      const bank = Math.max(Math.min(-turn / Math.max(dt, 0.001) * 0.22, 0.7), -0.7);

      const s = this.bodyLength * this.sizes[i];
      this.dummy.position.set(p[ix] * aspect, p[ix + 1], this.z);
      this.dummy.rotation.order = "ZYX";
      this.dummy.rotation.set(bank, yaw, pitch);
      this.dummy.scale.setScalar(s);
      this.dummy.updateMatrix();
      this.mesh.setMatrixAt(i, this.dummy.matrix);
    }
    this.mesh.instanceMatrix.needsUpdate = true;
  }

  dispose() {
    this.mesh.geometry.dispose();
    this.material.dispose();
  }
}

const fishVertex = /* glsl */ `
  attribute float aPhase;
  attribute float aFin;

  uniform float uTime;

  varying vec3 vNormal;
  varying vec3 vLocal;
  varying float vFin;

  void main() {
    vec3 pos = position;
    vec3 nrm = normal;

    // 体のうねり。実際の魚と同じく左右（ローカル z）へ振る。
    // 真横からは輪郭がほとんど変わらず、法線が揺れて体側の光が
    // さざめく——それが本物の見え方になる。
    float t = uTime * 7.0 + aPhase;
    float tail = pow(max(0.55 - pos.x, 0.0), 1.5);
    float wave = sin(pos.x * 7.0 - t);
    pos.z += wave * 0.15 * tail;

    // うねりの傾きぶんだけ法線を横に振る（厳密でなくてよい）
    float slope = cos(pos.x * 7.0 - t) * 0.15 * tail * 7.0;
    nrm = normalize(vec3(nrm.x - slope * nrm.z * 0.6, nrm.y, nrm.z));

    vLocal = position;
    vFin = aFin;
    vNormal = normalize(mat3(instanceMatrix) * nrm);

    gl_Position =
      projectionMatrix * modelViewMatrix * instanceMatrix * vec4(pos, 1.0);
  }
`;

const fishFragment = /* glsl */ `
  precision highp float;

  uniform float uOpacity;
  uniform vec3 uBack;
  uniform vec3 uStripe;
  uniform vec3 uBelly;
  uniform vec3 uNose;
  uniform float uNoseAmount;
  uniform float uBars;
  uniform vec3 uWaterLight;

  varying vec3 vNormal;
  varying vec3 vLocal;
  varying float vFin;

  float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
  }

  void main() {
    vec3 normal = normalize(vNormal);
    if (!gl_FrontFacing) normal = -normal;

    vec3 lightDirection = normalize(vec3(0.3, 0.85, 0.45));
    vec3 viewDirection = vec3(0.0, 0.0, 1.0);
    float diffuse = max(dot(normal, lightDirection), 0.0);
    vec3 halfway = normalize(lightDirection + viewDirection);
    float specular = pow(max(dot(normal, halfway), 0.0), 44.0);
    float rim = pow(1.0 - abs(normal.z), 2.6);

    float body = 1.0 - vFin;

    // ---- 種の装い。背は沈み、体側に輝線、腹側に見せ場の色 ----
    float band = vLocal.y;
    vec3 base = mix(uBack, uBelly, smoothstep(0.02, -0.05, band));

    // 体側の輝線
    float stripe = exp(-pow((band - 0.03) / 0.045, 2.0)) * body;

    // 鱗のきらめき。粗い格子のノイズで反射率を揺らす
    float sparkle = hash(floor(vec2(vLocal.x * 90.0, vLocal.y * 60.0)));

    vec3 color = base * (0.32 + diffuse * 0.68);
    color += uStripe * stripe * (0.4 + specular * (1.0 + sparkle * 0.6) + diffuse * 0.3);
    color += uWaterLight * (specular * 0.3 + rim * 0.45);
    color += (sparkle - 0.5) * 0.03 * body;

    // 横縞（スマトラ・エンゼル）。体側にだけ落ちる暗い帯
    float bars = smoothstep(0.35, 0.75, sin((vLocal.x + 0.06) * 17.0));
    color *= 1.0 - bars * uBars * 0.7 * body;

    // 鼻先の差し色（ラミーノーズの赤）
    float noseZone = smoothstep(0.3, 0.44, vLocal.x);
    color = mix(color, uNose * (0.35 + diffuse * 0.75), noseZone * uNoseAmount * body);

    // エラぶたの陰。頭と胴の境に薄い縦の影を落とす
    float gill = smoothstep(0.014, 0.0, abs(vLocal.x - 0.3 + band * 0.3));
    color *= 1.0 - gill * 0.2 * body;

    // 目。黒目の縁がわずかに光る
    float eyeDistance = distance(vLocal.xy, vec2(0.4, 0.02));
    float eyeRing = smoothstep(0.032, 0.022, eyeDistance);
    float pupil = smoothstep(0.018, 0.01, eyeDistance);
    color = mix(color, vec3(0.6, 0.64, 0.66), eyeRing * body);
    color = mix(color, vec3(0.012, 0.016, 0.02), pupil * body);

    // ヒレは薄く透け、水明かりをほんのり通す
    color = mix(color, color * 0.88 + uWaterLight * 0.14, vFin);
    float alpha = uOpacity * mix(1.0, 0.5, vFin);

    gl_FragColor = vec4(color, alpha);
  }
`;
