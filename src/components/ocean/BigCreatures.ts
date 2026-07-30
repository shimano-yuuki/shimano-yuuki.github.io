import * as THREE from "three";

/**
 * 大物の 3D モデル。サメ・ザトウクジラ・マンタ・クラゲ。
 *
 * 小魚と同じ「様式化されたリアル」。外部モデルは使わず、
 * 断面リングの積層（サメ・クジラ）、キャンバー付きの面（マンタ）、
 * 半球と垂れ下がる帯（クラゲ）をコードで組む。
 *
 * 動きは種で違う:
 *  lateral  サメ — 横うねり（尾ほど振れる）
 *  fluke    クジラ — 水平の尾びれが縦に打つ
 *  flap     マンタ — 翼端ほど大きい羽ばたきが外へ伝わる
 *  pulse    クラゲ — 傘の脈動と、遅れて揺れる触手
 */

export type BigSpeciesId = "shark" | "whale" | "manta" | "jellyfish";

const ANIM_MODE: Record<BigSpeciesId, number> = {
  shark: 0,
  whale: 1,
  manta: 2,
  jellyfish: 3,
};

const SPECIES_INDEX: Record<BigSpeciesId, number> = {
  shark: 0,
  whale: 1,
  manta: 2,
  jellyfish: 3,
};

/* ==========================================================================
   ジオメトリの道具
   ========================================================================== */

type RingProfile = {
  x: number;
  ry: number;
  rz: number;
  cy: number;
};

/** 断面リングを積層して胴体を作る。鼻先と尾はキャップで閉じる。 */
function buildTube(
  profile: (t: number) => RingProfile,
  rings: number,
  segments: number,
): THREE.BufferGeometry {
  const positions: number[] = [];
  const indices: number[] = [];

  for (let ring = 0; ring <= rings; ring += 1) {
    const { x, ry, rz, cy } = profile(ring / rings);
    for (let seg = 0; seg < segments; seg += 1) {
      const a = (seg / segments) * Math.PI * 2;
      positions.push(x, cy + Math.cos(a) * ry, Math.sin(a) * rz);
    }
  }
  for (let ring = 0; ring < rings; ring += 1) {
    for (let seg = 0; seg < segments; seg += 1) {
      const a = ring * segments + seg;
      const b = ring * segments + ((seg + 1) % segments);
      const c = (ring + 1) * segments + seg;
      const d = (ring + 1) * segments + ((seg + 1) % segments);
      indices.push(a, c, b, b, c, d);
    }
  }

  const head = profile(0);
  const tail = profile(1);
  const headTip = positions.length / 3;
  positions.push(head.x + head.ry * 0.6, head.cy, 0);
  for (let seg = 0; seg < segments; seg += 1) {
    indices.push(headTip, seg, (seg + 1) % segments);
  }
  const tailTip = positions.length / 3;
  positions.push(tail.x - tail.ry * 0.5, tail.cy, 0);
  const last = rings * segments;
  for (let seg = 0; seg < segments; seg += 1) {
    indices.push(tailTip, last + ((seg + 1) % segments), last + seg);
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(positions, 3),
  );
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

/** 胴体（インデックス付き）とヒレ（三角形の並び）を結合し、aFin を立てる。 */
function mergeWithFins(
  body: THREE.BufferGeometry,
  finTriangles: number[],
): THREE.BufferGeometry {
  const fins = new THREE.BufferGeometry();
  fins.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(finTriangles, 3),
  );
  fins.computeVertexNormals();

  const bodyNonIndexed = body.toNonIndexed();
  const bodyPos = bodyNonIndexed.getAttribute("position");
  const bodyNorm = bodyNonIndexed.getAttribute("normal");
  const finPos = fins.getAttribute("position");
  const finNorm = fins.getAttribute("normal");

  const total = bodyPos.count + finPos.count;
  const positions = new Float32Array(total * 3);
  const normals = new Float32Array(total * 3);
  const flags = new Float32Array(total);
  positions.set(bodyPos.array as Float32Array, 0);
  positions.set(finPos.array as Float32Array, bodyPos.count * 3);
  normals.set(bodyNorm.array as Float32Array, 0);
  normals.set(finNorm.array as Float32Array, bodyPos.count * 3);
  flags.fill(1, bodyPos.count);

  const merged = new THREE.BufferGeometry();
  merged.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  merged.setAttribute("normal", new THREE.BufferAttribute(normals, 3));
  merged.setAttribute("aFin", new THREE.BufferAttribute(flags, 1));

  body.dispose();
  bodyNonIndexed.dispose();
  fins.dispose();
  return merged;
}

/* ==========================================================================
   種別ジオメトリ
   ========================================================================== */

/** サメ。細長い紡錘形、上葉の長い尾、大きな第一背びれ。 */
function buildShark(): THREE.BufferGeometry {
  const body = buildTube(
    (t) => ({
      x: 0.5 - t * 0.9,
      ry: Math.max(0.082 * Math.pow(Math.sin(Math.PI * Math.pow(t, 0.62)), 0.85), 0.012),
      rz: Math.max(0.082 * Math.pow(Math.sin(Math.PI * Math.pow(t, 0.62)), 0.85), 0.012) * 0.74,
      cy: -0.004 * Math.sin(Math.PI * t),
    }),
    26,
    12,
  );

  return mergeWithFins(body, [
    // 尾びれ。上葉が長い（サメの識別点）
    -0.4, 0.015, 0, -0.68, 0.2, 0, -0.5, 0.005, 0,
    -0.68, 0.2, 0, -0.56, 0.03, 0, -0.5, 0.005, 0,
    -0.4, -0.015, 0, -0.5, -0.005, 0, -0.585, -0.1, 0,
    // 第一背びれ。大きな三角
    0.12, 0.07, 0, -0.02, 0.22, 0, -0.1, 0.06, 0,
    // 第二背びれ
    -0.26, 0.045, 0, -0.32, 0.1, 0, -0.36, 0.04, 0,
    // 胸びれ（左右、後ろ下へ）
    0.18, -0.05, 0.05, 0.0, -0.17, 0.17, -0.02, -0.06, 0.08,
    0.18, -0.05, -0.05, -0.02, -0.06, -0.08, 0.0, -0.17, -0.17,
  ]);
}

/** ザトウクジラ。丸く重い頭、長い胸びれ、水平の尾びれ。 */
function buildWhale(): THREE.BufferGeometry {
  const body = buildTube(
    (t) => ({
      x: 0.5 - t * 0.9,
      ry: Math.max(0.115 * Math.pow(Math.sin(Math.PI * Math.pow(t, 0.5)), 0.7), 0.015),
      rz: Math.max(0.115 * Math.pow(Math.sin(Math.PI * Math.pow(t, 0.5)), 0.7), 0.015) * 0.66,
      cy: -0.02 * Math.sin(Math.PI * Math.pow(t, 0.75)),
    }),
    26,
    12,
  );

  return mergeWithFins(body, [
    // 尾びれ（フルーク）。水平に広がる——ここがクジラの決定的な形
    -0.4, 0.01, 0, -0.64, 0.03, 0.21, -0.5, 0.0, 0.04,
    -0.64, 0.03, 0.21, -0.55, 0.01, 0.05, -0.5, 0.0, 0.04,
    -0.4, 0.01, 0, -0.5, 0.0, -0.04, -0.64, 0.03, -0.21,
    -0.64, 0.03, -0.21, -0.5, 0.0, -0.04, -0.55, 0.01, -0.05,
    // 長い胸びれ（体長の 1/3。ザトウの識別点）
    0.16, -0.07, 0.05, -0.12, -0.26, 0.24, -0.16, -0.1, 0.1,
    0.16, -0.07, -0.05, -0.16, -0.1, -0.1, -0.12, -0.26, -0.24,
    // 小さな背のこぶ
    -0.1, 0.085, 0, -0.16, 0.125, 0, -0.2, 0.075, 0,
  ]);
}

/** マンタ。キャンバー付きの一枚翼 + 頭鰭 + 細い尾。 */
function buildManta(): THREE.BufferGeometry {
  const SPAN = 22;
  const CHORD = 8;
  const positions: number[] = [];
  const indices: number[] = [];

  // 翼面。s: 翼端方向 0..1、u: 前縁→後縁 0..1
  const point = (sSigned: number, u: number) => {
    const s = Math.abs(sSigned);
    const sweep = 0.1 - 0.4 * Math.pow(s, 1.25);
    const halfChord = 0.2 * (1 - Math.pow(s, 1.35)) + 0.015;
    const x = sweep + halfChord * (1 - 2 * u);
    const z = sSigned * 0.5;
    // 中央の胴の厚みと、翼のわずかな反り
    const camber =
      Math.exp(-Math.pow(s * 2.6, 2)) * 0.055 * Math.pow(Math.sin(Math.PI * u), 0.9) +
      (1 - s) * 0.012 * Math.sin(Math.PI * u);
    return [x, camber, z] as const;
  };

  for (let i = 0; i <= SPAN; i += 1) {
    const sSigned = (i / SPAN) * 2 - 1;
    for (let j = 0; j <= CHORD; j += 1) {
      const [x, y, z] = point(sSigned, j / CHORD);
      positions.push(x, y, z);
    }
  }
  const cols = CHORD + 1;
  for (let i = 0; i < SPAN; i += 1) {
    for (let j = 0; j < CHORD; j += 1) {
      const a = i * cols + j;
      const b = a + 1;
      const c = a + cols;
      const d = c + 1;
      indices.push(a, c, b, b, c, d);
    }
  }

  const wing = new THREE.BufferGeometry();
  wing.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  wing.setIndex(indices);
  wing.computeVertexNormals();

  return mergeWithFins(wing, [
    // 頭鰭（左右の巻いた小さな鰭）
    0.3, -0.005, 0.05, 0.42, -0.03, 0.075, 0.32, -0.02, 0.09,
    0.3, -0.005, -0.05, 0.32, -0.02, -0.09, 0.42, -0.03, -0.075,
    // 鞭のような尾
    -0.3, 0.01, 0.006, -0.75, 0.0, 0.0, -0.3, 0.01, -0.006,
  ]);
}

/** クラゲ。半球の傘、4 本の口腕、細い触手。 */
function buildJellyfish(): THREE.BufferGeometry {
  const LAT = 10;
  const LON = 18;
  const R = 0.3;
  const positions: number[] = [];
  const indices: number[] = [];

  // 傘。頂点からわずかに縁が巻き込むところまで
  for (let lat = 0; lat <= LAT; lat += 1) {
    const phi = (lat / LAT) * Math.PI * 0.58;
    for (let lon = 0; lon < LON; lon += 1) {
      const theta = (lon / LON) * Math.PI * 2;
      positions.push(
        Math.sin(phi) * Math.cos(theta) * R,
        0.16 + Math.cos(phi) * R * 0.62,
        Math.sin(phi) * Math.sin(theta) * R,
      );
    }
  }
  for (let lat = 0; lat < LAT; lat += 1) {
    for (let lon = 0; lon < LON; lon += 1) {
      const a = lat * LON + lon;
      const b = lat * LON + ((lon + 1) % LON);
      const c = (lat + 1) * LON + lon;
      const d = (lat + 1) * LON + ((lon + 1) % LON);
      indices.push(a, b, c, b, d, c);
    }
  }

  const bell = new THREE.BufferGeometry();
  bell.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  bell.setIndex(indices);
  bell.computeVertexNormals();

  // 口腕（幅のある波打つ帯）と触手（細い帯）
  const strips: number[] = [];
  const addStrip = (
    angle: number,
    radius: number,
    width: number,
    top: number,
    bottom: number,
  ) => {
    const cx = Math.cos(angle) * radius;
    const cz = Math.sin(angle) * radius;
    // 幅は帯の向きに対して直交させる
    const wx = -Math.sin(angle) * width;
    const wz = Math.cos(angle) * width;
    strips.push(
      cx - wx, top, cz - wz, cx + wx, top, cz + wz, cx - wx, bottom, cz - wz,
      cx + wx, top, cz + wz, cx + wx, bottom, cz + wz, cx - wx, bottom, cz - wz,
    );
  };
  for (let i = 0; i < 4; i += 1) {
    addStrip((i / 4) * Math.PI * 2 + 0.4, 0.05, 0.032, 0.14, -0.34);
  }
  for (let i = 0; i < 12; i += 1) {
    addStrip((i / 12) * Math.PI * 2, 0.27, 0.007, 0.1, -0.48);
  }

  return mergeWithFins(bell, strips);
}

export const BIG_GEOMETRY_BUILDERS: Record<
  BigSpeciesId,
  () => THREE.BufferGeometry
> = {
  shark: buildShark,
  whale: buildWhale,
  manta: buildManta,
  jellyfish: buildJellyfish,
};

/* ==========================================================================
   マテリアル
   ========================================================================== */

export function buildBigCreatureMaterial(
  id: BigSpeciesId,
  swim: { amp: number; freq: number; speed: number },
): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    vertexShader: bigVertex,
    fragmentShader: bigFragment,
    uniforms: {
      uTime: { value: 0 },
      uPhase: { value: Math.random() * Math.PI * 2 },
      uOpacity: { value: 0 },
      uLift: { value: new THREE.Color(0, 0, 0) },
      uWaterLight: { value: new THREE.Color(0.3, 0.6, 0.7) },
      uSwim: { value: new THREE.Vector3(swim.amp, swim.freq, swim.speed) },
      uMode: { value: ANIM_MODE[id] },
      uSpecies: { value: SPECIES_INDEX[id] },
    },
    transparent: true,
    side: THREE.DoubleSide,
    depthTest: true,
    depthWrite: id !== "jellyfish",
  });
}

const bigVertex = /* glsl */ `
  attribute float aFin;

  uniform float uTime;
  uniform float uPhase;
  uniform vec3 uSwim;
  uniform float uMode;

  varying vec3 vNormal;
  varying vec3 vLocal;
  varying float vFin;

  void main() {
    vec3 pos = position;
    vec3 nrm = normal;
    float t = uTime * uSwim.z + uPhase;

    if (uMode < 0.5) {
      // サメ: 横うねり。尾ほど振れる
      float tail = pow(max(0.55 - pos.x, 0.0), 1.6);
      pos.z += sin(pos.x * uSwim.y - t) * uSwim.x * tail;
      float slope = cos(pos.x * uSwim.y - t) * uSwim.x * tail * uSwim.y;
      nrm = normalize(vec3(nrm.x - slope * nrm.z * 0.5, nrm.y, nrm.z));
    } else if (uMode < 1.5) {
      // クジラ: 尾が縦に打つ。頭は据わり、後半身から尾びれへ増幅
      float tail = pow(max(0.45 - pos.x, 0.0), 1.7);
      pos.y += sin(pos.x * uSwim.y - t) * uSwim.x * tail;
      float slope = cos(pos.x * uSwim.y - t) * uSwim.x * tail * uSwim.y;
      nrm = normalize(vec3(nrm.x - slope * nrm.y * 0.5, nrm.y, nrm.z));
    } else if (uMode < 2.5) {
      // マンタ: 翼端ほど大きい羽ばたきが、外へ波として伝わる
      float span = abs(pos.z) * 2.0;
      pos.y += sin(t - span * 1.4) * uSwim.x * pow(span, 1.4);
      float slope = cos(t - span * 1.4) * uSwim.x * pow(span, 1.2) * 1.4;
      nrm = normalize(vec3(nrm.x, nrm.y, nrm.z - slope * nrm.y * sign(pos.z) * 0.6));
    } else {
      // クラゲ: 傘は横に脈動し、垂れた帯は遅れて揺れる
      float bell = smoothstep(-0.05, 0.2, pos.y) * (1.0 - aFin);
      float squeeze = 1.0 + sin(t) * uSwim.x * bell;
      pos.x *= squeeze;
      pos.z *= squeeze;
      float hang = max(-pos.y, 0.0);
      pos.x += sin(t * 0.8 - hang * 4.0 + uPhase) * hang * 0.12 * aFin;
      pos.z += cos(t * 0.7 - hang * 3.4 + uPhase) * hang * 0.1 * aFin;
    }

    vLocal = position;
    vFin = aFin;
    vNormal = normalize(mat3(modelMatrix) * nrm);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
  }
`;

const bigFragment = /* glsl */ `
  precision highp float;

  uniform float uOpacity;
  uniform vec3 uLift;
  uniform vec3 uWaterLight;
  uniform float uSpecies;

  varying vec3 vNormal;
  varying vec3 vLocal;
  varying float vFin;

  float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
  }

  void main() {
    vec3 normal = normalize(vNormal);
    if (!gl_FrontFacing) normal = -normal;

    vec3 lightDirection = normalize(vec3(0.35, 0.8, 0.5));
    vec3 viewDirection = vec3(0.0, 0.0, 1.0);
    float diffuse = max(dot(normal, lightDirection), 0.0);
    vec3 halfway = normalize(lightDirection + viewDirection);
    float specular = pow(max(dot(normal, halfway), 0.0), 40.0);
    float rim = pow(1.0 - abs(normal.z), 2.6);

    vec3 color;
    float alpha = uOpacity;

    if (uSpecies < 0.5) {
      // ---- サメ。灰青の背、淡い腹、エラの切れ込み ----
      float band = vLocal.y;
      vec3 back = vec3(0.04, 0.06, 0.075);
      vec3 flank = vec3(0.14, 0.175, 0.2);
      vec3 belly = vec3(0.3, 0.33, 0.35);
      color = mix(flank, back, smoothstep(0.0, 0.07, band));
      color = mix(color, belly, smoothstep(-0.02, -0.07, band));
      color *= 0.35 + diffuse * 0.65;
      color += uWaterLight * (specular * 0.35 + rim * 0.5);

      // エラ。5本の縦の切れ込み
      float gz = fract(vLocal.x * 22.0);
      float gill = step(0.75, gz) *
        step(0.2, vLocal.x) * step(vLocal.x, 0.34) *
        smoothstep(0.06, 0.02, abs(band + 0.005));
      color *= 1.0 - gill * 0.35 * (1.0 - vFin);

      // 目
      float eye = smoothstep(0.014, 0.008, distance(vLocal.xy, vec2(0.41, 0.02)));
      color = mix(color, vec3(0.01, 0.012, 0.016), eye * (1.0 - vFin));

    } else if (uSpecies < 1.5) {
      // ---- ザトウクジラ。スレートグレー、白い胸びれ、喉の畝 ----
      float band = vLocal.y;
      vec3 back = vec3(0.042, 0.052, 0.066);
      vec3 belly = vec3(0.14, 0.155, 0.17);
      color = mix(belly, back, smoothstep(-0.06, 0.05, band));
      color *= 0.35 + diffuse * 0.65;
      color += uWaterLight * (specular * 0.28 + rim * 0.55);

      // 喉の畝。腹側の前半分に走る細い筋
      float groove = sin(band * 160.0) * 0.5 + 0.5;
      float grooveMask =
        smoothstep(-0.02, -0.06, band) * step(0.05, vLocal.x) * (1.0 - vFin);
      color *= 1.0 - groove * grooveMask * 0.12;

      // フジツボ。頭の白い点々
      float barnacle = step(0.986, hash(floor(vLocal.xy * 90.0))) *
        step(0.3, vLocal.x) * (1.0 - vFin);
      color += barnacle * 0.12;

      // 白い胸びれ（ザトウの見せ場）
      color = mix(color, vec3(0.36, 0.4, 0.42) * (0.5 + diffuse * 0.5), vFin * step(vLocal.y, 0.0));

      // 目
      float eye = smoothstep(0.013, 0.007, distance(vLocal.xy, vec2(0.36, -0.055)));
      color = mix(color, vec3(0.008, 0.01, 0.014), eye * (1.0 - vFin));

    } else if (uSpecies < 2.5) {
      // ---- マンタ。背は濃紺、腹は白。肩の淡い模様 ----
      bool dorsal = gl_FrontFacing;
      vec3 back = vec3(0.035, 0.05, 0.07);
      vec3 belly = vec3(0.34, 0.37, 0.39);
      color = dorsal ? back : belly;
      color *= 0.4 + diffuse * 0.6;
      color += uWaterLight * (specular * 0.3 + rim * 0.5);

      // 肩の淡いV字（背側だけ）
      if (dorsal) {
        float chevron =
          exp(-(pow(vLocal.x - 0.16, 2.0) / 0.004 +
                pow(abs(vLocal.z) - 0.14, 2.0) / 0.008));
        color += vec3(0.07, 0.085, 0.09) * chevron;
      }

    } else {
      // ---- クラゲ。半透明の傘。縁ほど濃く見え、中に生殖腺の環 ----
      vec3 tint = vec3(0.3, 0.42, 0.5);
      float fresnel = pow(1.0 - abs(normal.z), 1.8);
      color = tint * (0.25 + diffuse * 0.3) + uWaterLight * (fresnel * 0.55 + specular * 0.25);

      // 生殖腺。傘の頂部に4つ葉の環（ミズクラゲの目印）
      float az = atan(vLocal.z, vLocal.x);
      float lobes = pow(abs(sin(az * 2.0)), 2.0);
      float ringMask = smoothstep(0.16, 0.1, length(vLocal.xz)) *
        smoothstep(0.3, 0.38, vLocal.y) * (1.0 - vFin);
      color += vec3(0.16, 0.1, 0.12) * lobes * ringMask;

      // 傘はガラスのように透け、縁と帯は少し濃い
      alpha = uOpacity * mix(0.32 + fresnel * 0.5, 0.5, vFin);
    }

    // ベール下の持ち上げ。光の当たる面と輪郭にだけ乗せて立体感を保つ
    color += uLift * (0.16 + diffuse * 0.36 + rim * 0.7);

    gl_FragColor = vec4(color, alpha);
  }
`;
