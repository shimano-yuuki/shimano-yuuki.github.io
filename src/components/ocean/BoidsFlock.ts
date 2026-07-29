import * as THREE from "three";

/**
 * 小魚の群れ。古典 Boids（分離・整列・結合）で泳がせる。
 *
 * 以前は「群れを1枚のテクスチャに焼いた絵」だったが、それでは群れが
 * 曲がらない・割れない・逃げない。ここでは1匹ずつを個体として持ち、
 * 3つの規則と少しの外力だけで群れの振る舞いを出す。
 *
 * 描画は InstancedMesh の1ドローコール。位置・向き・大きさは
 * インスタンス行列に、うねりの位相だけを個体属性で渡す。
 */

type BoidsOptions = {
  count: number;
  atlas: THREE.Texture;
  /** アトラス内の小魚セルの UV。 */
  uvOffset: THREE.Vector2;
  uvScale: THREE.Vector2;
  /** 出現する深度帯。 */
  from: number;
  to: number;
};

/** 泳ぐ速さ（NDC/秒）。止まると死んで見えるので下限を切らない。 */
const CRUISE = 0.11;
const MIN_SPEED = 0.055;
const MAX_SPEED = 0.34;

export class BoidsFlock {
  readonly mesh: THREE.InstancedMesh;
  readonly from: number;
  readonly to: number;

  private material: THREE.ShaderMaterial;
  private positions: Float32Array;
  private velocities: Float32Array;
  /** 個体差。大きさの倍率。大きい個体はわずかに遅い。 */
  private sizes: Float32Array;
  private count: number;
  private dummy = new THREE.Object3D();
  private lastTime = 0;

  constructor({ count, atlas, uvOffset, uvScale, from, to }: BoidsOptions) {
    this.count = count;
    this.from = from;
    this.to = to;

    this.positions = new Float32Array(count * 2);
    this.velocities = new Float32Array(count * 2);
    this.sizes = new Float32Array(count);

    // 群れらしく、ひとかたまりの周辺にばらまいて始める
    const cx = Math.random() * 1.2 - 0.6;
    const cy = Math.random() > 0.5 ? 0.5 : -0.5;
    const heading = Math.random() * Math.PI * 2;
    for (let i = 0; i < count; i += 1) {
      this.positions[i * 2] = cx + (Math.random() - 0.5) * 0.5;
      this.positions[i * 2 + 1] = cy + (Math.random() - 0.5) * 0.3;
      this.velocities[i * 2] = Math.cos(heading) * CRUISE;
      this.velocities[i * 2 + 1] = Math.sin(heading) * CRUISE * 0.4;
      this.sizes[i] = 0.75 + Math.random() * 0.5;
    }

    const geometry = new THREE.PlaneGeometry(1, 1);
    const phases = new Float32Array(count);
    for (let i = 0; i < count; i += 1) phases[i] = Math.random() * Math.PI * 2;
    geometry.setAttribute(
      "aPhase",
      new THREE.InstancedBufferAttribute(phases, 1),
    );

    this.material = new THREE.ShaderMaterial({
      vertexShader: boidVertex,
      fragmentShader: boidFragment,
      uniforms: {
        uAtlas: { value: atlas },
        uUvOffset: { value: uvOffset },
        uUvScale: { value: uvScale },
        uOpacity: { value: 0 },
        uTint: { value: new THREE.Color(0, 0, 0) },
        uTime: { value: 0 },
      },
      transparent: true,
      depthTest: false,
      depthWrite: false,
    });

    this.mesh = new THREE.InstancedMesh(geometry, this.material, count);
    this.mesh.frustumCulled = false;
    this.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  }

  /**
   * 1フレームぶん進める。
   * @param presence 深度帯へのいる度合い（0〜1）。0 なら描画も更新もしない
   * @param pointer カーソルの NDC 座標。無ければ null
   */
  update(
    time: number,
    presence: number,
    tint: THREE.Color,
    opacity: number,
    flow: number,
    pointer: { x: number; y: number } | null,
    aspect: number,
  ) {
    this.material.uniforms.uTime.value = time;
    (this.material.uniforms.uTint.value as THREE.Color).copy(tint);
    this.material.uniforms.uOpacity.value = opacity;

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

      // 読む列（画面中央の帯）からの弱い斥力。可読性のための規則
      if (Math.abs(y) < 0.28) {
        fy += (y >= 0 ? 1 : -1) * (1 - Math.abs(y) / 0.28) * 0.16;
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

    // インスタンス行列に反映
    for (let i = 0; i < this.count; i += 1) {
      const ix = i * 2;
      const vx = v[ix];
      const vy = v[ix + 1];
      const mirrored = vx < 0;

      // 進行方向へ頭を向ける。左向きは鏡像にしてから角度を合わせる
      const angle = mirrored ? Math.atan2(-vy, -vx) : Math.atan2(vy, vx);

      const width = 0.042 * this.sizes[i];
      this.dummy.position.set(p[ix], p[ix + 1], 0);
      this.dummy.rotation.set(0, 0, angle * 0.7);
      this.dummy.scale.set(
        (mirrored ? -1 : 1) * width * 2,
        width * aspect * 2,
        1,
      );
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

const boidVertex = /* glsl */ `
  attribute float aPhase;

  varying vec2 vUv;
  varying float vPhase;

  void main() {
    vUv = uv;
    vPhase = aPhase;
    gl_Position =
      projectionMatrix * modelViewMatrix * instanceMatrix * vec4(position, 1.0);
  }
`;

const boidFragment = /* glsl */ `
  precision highp float;

  uniform sampler2D uAtlas;
  uniform vec2 uUvOffset;
  uniform vec2 uUvScale;
  uniform float uOpacity;
  uniform vec3 uTint;
  uniform float uTime;

  varying vec2 vUv;
  varying float vPhase;

  void main() {
    vec2 local = vUv;

    // 体のうねり。頭（アトラスの x が大きい側）はほぼ動かず、尾ほど振れる
    float tail = pow(1.0 - local.x, 1.4);
    local.y += sin(local.x * 7.0 - uTime * 7.5 - vPhase) * 0.09 * tail;

    if (local.y < 0.0 || local.y > 1.0) discard;

    vec2 uv = uUvOffset + local * uUvScale;
    float mask = texture2D(uAtlas, uv).a;
    if (mask < 0.01) discard;
    gl_FragColor = vec4(uTint, mask * uOpacity);
  }
`;
