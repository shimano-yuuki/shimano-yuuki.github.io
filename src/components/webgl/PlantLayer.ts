import * as THREE from "three";
import { plantFragment, plantVertex } from "./aquariumShaders";

/**
 * 水草。細長い短冊のインスタンスを画面の下辺に植え、
 * 頂点シェーダーで根元を固定したまま水流に揺らす。
 *
 * 奥の層（魚の後ろ）と手前の層（魚の前）の2枚に分け、
 * 手前は太く暗いシルエットにして奥行きをつくる。
 * ページ表示（page）では左が文字と黒なので右の袖だけに植え、
 * タンク表示（tank。スマホの右下小窓）では左右両方に植える。
 */

type PlantOptions = {
  /** 奥の層の本数 */
  backCount: number;
  /** 手前の層の本数 */
  frontCount: number;
  /** page: 右の袖だけ / tank: 左右の袖 */
  layout: "page" | "tank";
};

type BladeSpec = {
  rootX: number;
  height: number;
  lean: number;
  phase: number;
  width: number;
  tone: number;
  depth: number;
  shade: number;
};

function makeBladeMesh(blades: BladeSpec[], renderOrder: number) {
  // 位置は使わず、uv.y（根元 0 → 先端 1）と position.x（幅方向）だけを
  // シェーダーで使う。縦の分割は曲げを滑らかにするためのもの。
  const plane = new THREE.PlaneGeometry(1, 1, 1, 12);
  const geometry = new THREE.InstancedBufferGeometry();
  geometry.index = plane.index;
  geometry.setAttribute("position", plane.getAttribute("position"));
  geometry.setAttribute("uv", plane.getAttribute("uv"));
  geometry.instanceCount = blades.length;

  const aBlade = new Float32Array(blades.length * 4);
  const aStyle = new Float32Array(blades.length * 4);
  blades.forEach((blade, i) => {
    aBlade.set([blade.rootX, blade.height, blade.lean, blade.phase], i * 4);
    aStyle.set([blade.width, blade.tone, blade.depth, blade.shade], i * 4);
  });
  geometry.setAttribute("aBlade", new THREE.InstancedBufferAttribute(aBlade, 4));
  geometry.setAttribute("aStyle", new THREE.InstancedBufferAttribute(aStyle, 4));

  const material = new THREE.ShaderMaterial({
    vertexShader: plantVertex,
    fragmentShader: plantFragment,
    uniforms: {
      uTime: { value: 0 },
      uAspect: { value: 1 },
      uOpacity: { value: 0 },
    },
    transparent: true,
    depthTest: true,
    depthWrite: false,
    side: THREE.DoubleSide,
  });

  const mesh = new THREE.Mesh(geometry, material);
  mesh.frustumCulled = false;
  mesh.renderOrder = renderOrder;
  return mesh;
}

/**
 * 袖に寄せた根元位置。中央（本文の帯）を空ける。
 * page では左は完全な黒に保つため、株は右の袖だけに植える。
 */
function sideRoot(minOffset: number, spread: number, layout: "page" | "tank") {
  const side = layout === "tank" && Math.random() < 0.5 ? -1 : 1;
  return side * (minOffset + Math.pow(Math.random(), 0.8) * spread);
}

export class PlantLayer {
  readonly meshes: THREE.Mesh[];

  constructor({ backCount, frontCount, layout }: PlantOptions) {
    const back: BladeSpec[] = [];
    for (let i = 0; i < backCount; i += 1) {
      const rootX = sideRoot(0.14, 0.92, layout);
      back.push({
        rootX,
        // 袖に近いほど丈を高く。中央寄りの株は短く沈める。
        // 前景であって主役ではないので、画面の下 1/4 に収める
        height: 0.22 + Math.abs(rootX) * 0.28 + Math.random() * 0.16,
        lean: (Math.random() - 0.5) * 0.5,
        phase: Math.random() * Math.PI * 2,
        width: 0.032 + Math.random() * 0.04,
        // 大半は緑、ときどき赤茶（ロタラ系）を混ぜて単調を避ける
        tone: Math.random() < 0.16 ? 0.5 + Math.random() * 0.35 : Math.random() * 0.2,
        depth: -0.5,
        shade: 0.55 + Math.random() * 0.35,
      });
    }

    const front: BladeSpec[] = [];
    for (let i = 0; i < frontCount; i += 1) {
      const rootX = sideRoot(0.5, 0.6, layout);
      front.push({
        rootX,
        height: 0.4 + Math.random() * 0.28,
        lean: (Math.random() - 0.5) * 0.4,
        phase: Math.random() * Math.PI * 2,
        // 手前は広葉（エキノドルス系）。やや太く、暗いシルエットにする
        width: 0.08 + Math.random() * 0.06,
        tone: Math.random() * 0.15,
        depth: 0.5,
        shade: 0.3 + Math.random() * 0.2,
      });
    }

    this.meshes = [makeBladeMesh(back, 1), makeBladeMesh(front, 3)];
  }

  private eachMaterial(fn: (material: THREE.ShaderMaterial) => void) {
    for (const mesh of this.meshes) fn(mesh.material as THREE.ShaderMaterial);
  }

  update(time: number) {
    this.eachMaterial((m) => {
      m.uniforms.uTime.value = time;
    });
  }

  setAspect(aspect: number) {
    this.eachMaterial((m) => {
      m.uniforms.uAspect.value = aspect;
    });
  }

  setOpacity(value: number) {
    this.eachMaterial((m) => {
      m.uniforms.uOpacity.value = value;
    });
  }

  dispose() {
    for (const mesh of this.meshes) {
      mesh.geometry.dispose();
      (mesh.material as THREE.ShaderMaterial).dispose();
    }
  }
}
