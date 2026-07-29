import { clamp01 } from "@/lib/depth";

/**
 * 深度の単一の保持場所。
 *
 * 毎フレーム React の state を更新すると再レンダーが走り続けてしまうので、
 * 値はここに置いてキャンバスから直接読む。
 * ゲージのような表示側だけが購読する。
 */
type Listener = (depth: number) => void;

const listeners = new Set<Listener>();

const state = {
  /** スクロールとルートから求まる目標深度。 */
  target: 0,
  /** 実際に描画に使う深度。目標へ滑らかに追従する。 */
  current: 0,
  /** 直近のスクロール速度。流体への外力に使う。 */
  velocity: 0,
  /** 購読側へ通知した最後の値。 */
  notified: -1,
};

export const depthStore = {
  setTarget(value: number) {
    state.target = clamp01(value);
  },

  setVelocity(value: number) {
    state.velocity = value;
  },

  /** ルート遷移直後など、補間せず即座に合わせたいとき。 */
  snap(value: number) {
    state.target = clamp01(value);
    state.current = state.target;
    depthStore.notify();
  },

  /** 毎フレーム、目標へ寄せる。潜航・浮上の慣性になる。 */
  advance(dt: number) {
    const factor = 1 - Math.pow(0.0001, dt);
    state.current += (state.target - state.current) * factor;
    depthStore.notify();
    return state.current;
  },

  get(): number {
    return state.current;
  },

  getVelocity(): number {
    return state.velocity;
  },

  /** 表示が変わる程度に動いたときだけ通知して、無駄な再レンダーを避ける。 */
  notify() {
    if (Math.abs(state.current - state.notified) < 0.002) return;
    state.notified = state.current;
    for (const listener of listeners) listener(state.current);
  },

  subscribe(listener: Listener) {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },
};
