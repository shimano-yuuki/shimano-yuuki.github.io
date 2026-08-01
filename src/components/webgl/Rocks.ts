import * as THREE from "three";

/**
 * 岩組。画面の右下に、押しつぶした球をいくつか重ねて置く。
 *
 * 魚より手前（z が大きい）に不透明で描くので、岩の裏へ回った魚は
 * 本当に見えなくなる——「岩陰に潜る」はこの前後関係だけで成立させる。
 * 隠れ家の座標は SHELTER として公開し、魚の側がここへ引かれる。
 */

/** 隠れ家。岩のすぐ裏（NDC。x はアスペクト適用前の割合） */
export const SHELTER = { x: 0.63, y: -0.8 };

type Stone = {
  /** 中心 x（-1〜1 の割合。描画時にアスペクトを掛ける） */
  x: number;
  y: number;
  sx: number;
  sy: number;
  tilt: number;
};

const STONES: Stone[] = [
  { x: 0.63, y: -1.0, sx: 0.3, sy: 0.24, tilt: 0.12 },
  { x: 0.76, y: -1.04, sx: 0.22, sy: 0.17, tilt: -0.2 },
  { x: 0.52, y: -1.05, sx: 0.17, sy: 0.13, tilt: 0.3 },
];

const rockVertex = /* glsl */ `
  varying vec3 vNormal;
  varying vec3 vLocal;

  void main() {
    vNormal = normalize(normalMatrix * normal);
    vLocal = position;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const rockFragment = /* glsl */ `
  precision highp float;

  varying vec3 vNormal;
  varying vec3 vLocal;

  float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
  }

  void main() {
    vec3 normal = normalize(vNormal);

    // 上面だけが水明かりを受け、側面は闇に沈む
    float top = max(normal.y, 0.0);
    vec3 color = mix(
      vec3(0.024, 0.03, 0.036),
      vec3(0.075, 0.09, 0.104),
      top * 0.75 + max(normal.x, 0.0) * 0.1
    );

    // 岩肌のざらつき
    float grain = hash(floor(vLocal.xy * 26.0) + floor(vLocal.z * 26.0));
    color *= 0.9 + grain * 0.2;

    // 稜線にうっすら水明かり
    color += vec3(0.561, 0.847, 0.878) * pow(top, 3.0) * 0.04;

    gl_FragColor = vec4(color, 1.0);
  }
`;

export class Rocks {
  readonly meshes: THREE.Mesh[];

  private geometry = new THREE.SphereGeometry(1, 24, 16);
  private material = new THREE.ShaderMaterial({
    vertexShader: rockVertex,
    fragmentShader: rockFragment,
    depthTest: true,
    depthWrite: true,
  });

  constructor() {
    this.meshes = STONES.map((stone) => {
      const mesh = new THREE.Mesh(this.geometry, this.material);
      mesh.scale.set(stone.sx, stone.sy, stone.sx * 0.8);
      mesh.rotation.z = stone.tilt;
      mesh.position.set(stone.x, stone.y, 0.6); // 魚（z ≤ 0.35）より手前
      // 魚の後・手前の水草の前。不透明なので深度でも勝つ
      mesh.renderOrder = 2.5;
      return mesh;
    });
  }

  setAspect(aspect: number) {
    this.meshes.forEach((mesh, i) => {
      mesh.position.x = STONES[i].x * aspect;
    });
  }

  dispose() {
    this.geometry.dispose();
    this.material.dispose();
  }
}
