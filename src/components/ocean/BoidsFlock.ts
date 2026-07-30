import * as THREE from "three";

/**
 * 小魚の群れ。古典 Boids（分離・整列・結合）で泳がせる。
 *
 * 魚は板ポリの絵ではなく、コードで生成した 3D メッシュ。
 * 紡錘形の胴・二又の尾びれ・背びれを持ち、向きを変えるときは
 * 縦軸で回頭するので、正面・背面の見付きが本当に変わる。
 * 旋回時は体を傾け（バンク）、体側のうねりは法線を揺らして
 * 光のさざめきとして見える。外部モデルは使わない。
 *
 * 描画は InstancedMesh の1ドローコール。
 */

type BoidsOptions = {
  count: number;
  /** 出現する深度帯。 */
  from: number;
  to: number;
};

/** 泳ぐ速さ（NDC/秒）。止まると死んで見えるので下限を切らない。 */
const CRUISE = 0.11;
const MIN_SPEED = 0.055;
const MAX_SPEED = 0.34;

/** 魚の体長（ワールド単位。画面の高さが 2）。個体差はこの倍率に掛かる。 */
const BODY_LENGTH = 0.085;

/**
 * 自作モデルの置き場所。Blender などで作った .glb をここに置き、
 * manifest.json の "fish.glb" を true にすると、コード生成の魚の代わりに使われる。
 * （直接 HEAD で存在確認すると、無いときに 404 がコンソールへ赤く残るため、
 *  常に存在するマニフェストを見る方式にしている）
 * 作り方の約束事は docs/OCEAN.md の「自作 3D モデルの差し替え」を参照。
 */
const MODEL_URL = "/models/fish.glb";
const MANIFEST_URL = "/models/manifest.json";

/**
 * 魚のメッシュをコードで組む。
 * x+ が鼻先、x- が尾。長さ 1、原点は体の中心。
 */
function buildFishGeometry(): THREE.BufferGeometry {
  const positions: number[] = [];
  const indices: number[] = [];

  const RINGS = 22;
  const SEGMENTS = 10;

  // 紡錘形の胴。前 1/3 が最も太く、尾柄に向かって絞る。
  // 実際の魚と同じく左右（z）を上下（y）より薄くする。
  for (let ring = 0; ring <= RINGS; ring += 1) {
    const t = ring / RINGS; // 0 = 鼻先, 1 = 尾柄
    const x = 0.55 - t * 1.0;
    const bulge = Math.sin(Math.min(Math.max(t, 0.001), 0.999) * Math.PI);
    const ry = 0.13 * Math.pow(bulge, 0.72) * (1 - t * 0.18);
    const rz = ry * 0.5;

    for (let seg = 0; seg < SEGMENTS; seg += 1) {
      const a = (seg / SEGMENTS) * Math.PI * 2;
      positions.push(x, Math.cos(a) * ry, Math.sin(a) * rz);
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

  const body = new THREE.BufferGeometry();
  body.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  body.setIndex(indices);
  body.computeVertexNormals();

  // ひれは薄い板。二又の尾と、小さな背びれ。
  const finPositions = [
    // 尾びれ上葉
    -0.44, 0.0, 0, -0.62, 0.16, 0, -0.53, 0.015, 0,
    // 尾びれ下葉
    -0.44, 0.0, 0, -0.53, -0.015, 0, -0.62, -0.16, 0,
    // 背びれ
    0.16, 0.1, 0, 0.02, 0.2, 0, -0.04, 0.09, 0,
  ];
  const fins = new THREE.BufferGeometry();
  fins.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(finPositions, 3),
  );
  fins.computeVertexNormals();

  // 手で結合する（three の例のユーティリティに依存しない）
  const bodyNonIndexed = body.toNonIndexed();
  const merged = new THREE.BufferGeometry();
  const bodyPos = bodyNonIndexed.getAttribute("position");
  const bodyNorm = bodyNonIndexed.getAttribute("normal");
  const finPos = fins.getAttribute("position");
  const finNorm = fins.getAttribute("normal");

  const mergedPositions = new Float32Array(
    (bodyPos.count + finPos.count) * 3,
  );
  const mergedNormals = new Float32Array((bodyPos.count + finPos.count) * 3);
  mergedPositions.set(bodyPos.array as Float32Array, 0);
  mergedPositions.set(finPos.array as Float32Array, bodyPos.count * 3);
  mergedNormals.set(bodyNorm.array as Float32Array, 0);
  mergedNormals.set(finNorm.array as Float32Array, bodyPos.count * 3);

  merged.setAttribute(
    "position",
    new THREE.BufferAttribute(mergedPositions, 3),
  );
  merged.setAttribute("normal", new THREE.BufferAttribute(mergedNormals, 3));

  body.dispose();
  bodyNonIndexed.dispose();
  fins.dispose();
  return merged;
}

export class BoidsFlock {
  /** 魚は 3D なので専用のシーンとカメラで描く（横幅をアスペクトに合わせる）。 */
  readonly scene = new THREE.Scene();
  readonly camera = new THREE.OrthographicCamera(-1, 1, 1, -1, -10, 10);
  readonly mesh: THREE.InstancedMesh;
  readonly from: number;
  readonly to: number;

  private material: THREE.ShaderMaterial;
  private positions: Float32Array;
  private velocities: Float32Array;
  /** 個体差。大きさの倍率。大きい個体はわずかに遅い。 */
  private sizes: Float32Array;
  /** 回頭の状態。0 = 右向き、π = 左向き。目標へ滑らかに追従する。 */
  private yaws: Float32Array;
  private prevHeadings: Float32Array;
  private count: number;
  private dummy = new THREE.Object3D();
  private lastTime = 0;
  private lastAspect = 0;
  private disposed = false;

  constructor({ count, from, to }: BoidsOptions) {
    this.count = count;
    this.from = from;
    this.to = to;

    this.positions = new Float32Array(count * 2);
    this.velocities = new Float32Array(count * 2);
    this.sizes = new Float32Array(count);
    this.yaws = new Float32Array(count);
    this.prevHeadings = new Float32Array(count);

    // 群れらしく、ひとかたまりの周辺にばらまいて始める
    const cx = Math.random() * 1.2 - 0.6;
    const cy = Math.random() > 0.5 ? 0.5 : -0.5;
    const heading = Math.random() > 0.5 ? 0 : Math.PI;
    for (let i = 0; i < count; i += 1) {
      this.positions[i * 2] = cx + (Math.random() - 0.5) * 0.5;
      this.positions[i * 2 + 1] = cy + (Math.random() - 0.5) * 0.3;
      this.velocities[i * 2] = Math.cos(heading) * CRUISE;
      this.velocities[i * 2 + 1] = (Math.random() - 0.5) * CRUISE * 0.4;
      this.sizes[i] = 0.75 + Math.random() * 0.5;
      this.yaws[i] = heading > 1 ? Math.PI : 0;
    }

    const geometry = buildFishGeometry();
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
        uLift: { value: new THREE.Color(0, 0, 0) },
        uWaterLight: { value: new THREE.Color(0.3, 0.6, 0.7) },
      },
      transparent: true,
      side: THREE.DoubleSide,
      depthTest: true,
      depthWrite: true,
    });

    this.mesh = new THREE.InstancedMesh(geometry, this.material, count);
    this.mesh.frustumCulled = false;
    this.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.scene.add(this.mesh);

    // 自作モデルがあれば読み込んで差し替える。無ければコード生成のまま
    void this.tryLoadModel();
  }

  /**
   * public/models/fish.glb があれば形状を差し替える。
   * マテリアルは差し替えない——水中のライティング（カウンターシェーディング・
   * リムライト・ベールの持ち上げ）はこちらのシェーダーが受け持つので、
   * Blender 側はメッシュの形だけ作ればよい。
   */
  private async tryLoadModel() {
    try {
      // マニフェストで有効化されているときだけ読みにいく
      const manifest = await fetch(MANIFEST_URL);
      if (!manifest.ok) return;
      const entries = (await manifest.json()) as Record<string, boolean>;
      if (!entries["fish.glb"]) return;

      const { GLTFLoader } = await import(
        "three/examples/jsm/loaders/GLTFLoader.js"
      );
      const gltf = await new GLTFLoader().loadAsync(MODEL_URL);
      if (this.disposed) return;

      const geometry = mergeSceneGeometry(gltf.scene);
      if (!geometry) return;
      normalizeFishGeometry(geometry);

      // うねりの位相は個体属性なので、新しい形状にも付け直す
      geometry.setAttribute(
        "aPhase",
        this.mesh.geometry.getAttribute("aPhase"),
      );

      const previous = this.mesh.geometry;
      this.mesh.geometry = geometry;
      previous.dispose();
    } catch {
      // 読み込みに失敗したらコード生成の魚のまま泳ぎ続ける
    }
  }

  /**
   * 1フレームぶん進める。
   * @param presence 深度帯へのいる度合い（0〜1）。0 なら描画も更新もしない
   * @param pointer カーソルの NDC 座標。無ければ null
   */
  update(
    time: number,
    presence: number,
    lift: THREE.Color,
    opacity: number,
    flow: number,
    pointer: { x: number; y: number } | null,
    aspect: number,
    waterLight: THREE.Color,
  ) {
    this.material.uniforms.uTime.value = time;
    (this.material.uniforms.uLift.value as THREE.Color).copy(lift);
    (this.material.uniforms.uWaterLight.value as THREE.Color).copy(waterLight);
    this.material.uniforms.uOpacity.value = opacity;

    // 3D の見付きを歪めないよう、カメラの横幅をアスペクトに合わせる
    if (aspect !== this.lastAspect) {
      this.lastAspect = aspect;
      this.camera.left = -aspect;
      this.camera.right = aspect;
      this.camera.updateProjectionMatrix();
    }

    if (presence <= 0.001) {
      this.mesh.visible = false;
      this.lastTime = time;
      return;
    }
    this.mesh.visible = true;

    const dt = Math.min(Math.max(time - this.lastTime, 0), 0.05);
    this.lastTime = time;
    if (dt === 0) return;

    // 群れ全体が追いかける回遊目標。ゆっくり動く点で、群れが一体で曲がる理由になる
    const targetX = Math.sin(time * 0.05) * 0.8 + Math.sin(time * 0.013) * 0.3;
    const targetY =
      Math.sin(time * 0.083 + 1.7) * 0.55 * Math.sign(Math.sin(time * 0.011) || 1);

    const p = this.positions;
    const v = this.velocities;

    for (let i = 0; i < this.count; i += 1) {
      const ix = i * 2;
      const x = p[ix];
      const y = p[ix + 1];

      // --- 3つの規則。近傍は全探索（数十匹なので十分軽い） ---
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

        if (d2 < 0.0016) {
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

      // 回遊目標へゆるく引かれる
      fx += (targetX - x) * 0.055;
      fy += (targetY - y) * 0.055;

      // 読む列（画面中央の帯）からの斥力。可読性のための規則。
      // 群れが小ラベルの真後ろを通ると一瞬コントラストが落ちるため、
      // 帯を広めに取り、押し返しも強めにしてある
      if (Math.abs(y) < 0.36) {
        fy += (y >= 0 ? 1 : -1) * (1 - Math.abs(y) / 0.36) * 0.26;
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

      // スクロールの勢いで押し流される（単独遊泳の個体と同じ向き）
      fy -= flow * 0.5;

      // 上下の壁は柔らかく押し返す
      if (y > 0.88) fy -= (y - 0.88) * 3;
      if (y < -0.88) fy += (-0.88 - y) * 3;

      v[ix] += fx * dt;
      v[ix + 1] += fy * dt;

      // 速度を泳げる範囲に収める。大きい個体はわずかに遅い
      const limit = 1 / (0.85 + this.sizes[i] * 0.2);
      const speed = Math.hypot(v[ix], v[ix + 1]);
      const max = MAX_SPEED * limit;
      if (speed > max) {
        v[ix] *= max / speed;
        v[ix + 1] *= max / speed;
      } else if (speed < MIN_SPEED) {
        const scale = speed > 0.0001 ? MIN_SPEED / speed : 0;
        if (scale === 0) {
          v[ix] = CRUISE;
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

      const s = BODY_LENGTH * this.sizes[i];
      this.dummy.position.set(p[ix] * aspect, p[ix + 1], 0);
      this.dummy.rotation.order = "ZYX";
      this.dummy.rotation.set(bank, yaw, pitch);
      this.dummy.scale.setScalar(s);
      this.dummy.updateMatrix();
      this.mesh.setMatrixAt(i, this.dummy.matrix);
    }
    this.mesh.instanceMatrix.needsUpdate = true;
  }

  dispose() {
    this.disposed = true;
    this.mesh.geometry.dispose();
    this.material.dispose();
  }
}

/**
 * GLB 内の全メッシュを、配置ごと 1 つのジオメトリにまとめる。
 * 位置と法線だけ拾う。UV やマテリアルは水中ライティングでは使わない。
 */
function mergeSceneGeometry(root: THREE.Object3D): THREE.BufferGeometry | null {
  const chunks: { position: Float32Array; normal: Float32Array }[] = [];

  root.updateMatrixWorld(true);
  root.traverse((object) => {
    const mesh = object as THREE.Mesh;
    if (!mesh.isMesh) return;

    let geometry = mesh.geometry.clone();
    if (geometry.index) geometry = geometry.toNonIndexed();
    geometry.applyMatrix4(mesh.matrixWorld);
    if (!geometry.getAttribute("normal")) geometry.computeVertexNormals();

    chunks.push({
      position: geometry.getAttribute("position").array as Float32Array,
      normal: geometry.getAttribute("normal").array as Float32Array,
    });
    geometry.dispose();
  });

  if (chunks.length === 0) return null;

  const total = chunks.reduce((sum, c) => sum + c.position.length, 0);
  const positions = new Float32Array(total);
  const normals = new Float32Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    positions.set(chunk.position, offset);
    normals.set(chunk.normal, offset);
    offset += chunk.position.length;
  }

  const merged = new THREE.BufferGeometry();
  merged.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  merged.setAttribute("normal", new THREE.BufferAttribute(normals, 3));
  return merged;
}

/**
 * どんな大きさ・位置で作られていても泳げるように揃える。
 * 中心を原点へ、体長（x の幅）を 1 に。向きだけは揃えられないので、
 * 「頭を +X に向けて作る」ことを約束事にしている。
 */
function normalizeFishGeometry(geometry: THREE.BufferGeometry) {
  geometry.computeBoundingBox();
  const box = geometry.boundingBox;
  if (!box) return;

  const center = new THREE.Vector3();
  box.getCenter(center);
  geometry.translate(-center.x, -center.y, -center.z);

  const length = box.max.x - box.min.x;
  if (length > 0.0001) {
    const scale = 1 / length;
    geometry.scale(scale, scale, scale);
  }
}

const fishVertex = /* glsl */ `
  attribute float aPhase;

  uniform float uTime;

  varying vec3 vNormal;
  varying float vLocalY;

  void main() {
    vec3 pos = position;
    vec3 nrm = normal;

    // 体のうねり。実際の魚と同じく左右（ローカル z）へ振る。
    // 真横からは輪郭がほとんど変わらず、法線が揺れて体側の光が
    // さざめく——それが本物の見え方になる。
    float t = uTime * 7.5 + aPhase;
    float tail = pow(max(0.55 - pos.x, 0.0), 1.5);
    float wave = sin(pos.x * 7.0 - t);
    pos.z += wave * 0.16 * tail;

    // うねりの傾きぶんだけ法線を横に振る（厳密でなくてよい）
    float slope = cos(pos.x * 7.0 - t) * 0.16 * tail * 7.0;
    nrm = normalize(vec3(nrm.x - slope * nrm.z * 0.6, nrm.y, nrm.z));

    vLocalY = position.y;
    vNormal = normalize(mat3(instanceMatrix) * nrm);

    gl_Position =
      projectionMatrix * modelViewMatrix * instanceMatrix * vec4(pos, 1.0);
  }
`;

const fishFragment = /* glsl */ `
  precision highp float;

  uniform float uOpacity;
  uniform vec3 uLift;
  uniform vec3 uWaterLight;

  varying vec3 vNormal;
  varying float vLocalY;

  void main() {
    vec3 normal = normalize(vNormal);
    // 両面描画なので、裏面は法線を返す
    if (!gl_FrontFacing) normal = -normal;

    vec3 lightDirection = normalize(vec3(0.35, 0.75, 0.55));
    float diffuse = max(dot(normal, lightDirection), 0.0);
    // 輪郭が水の明るさを拾う。逆光の海で生き物が見える理由
    float rim = pow(1.0 - abs(normal.z), 2.4);

    // 背は濃く腹は淡い（カウンターシェーディング）
    vec3 base = mix(
      vec3(0.012, 0.02, 0.032),
      vec3(0.05, 0.075, 0.095),
      smoothstep(0.06, -0.08, vLocalY)
    );

    vec3 color =
        base
      + uWaterLight * (diffuse * 0.22 + rim * 0.5)
      + uLift * 0.55;

    gl_FragColor = vec4(color, uOpacity);
  }
`;
