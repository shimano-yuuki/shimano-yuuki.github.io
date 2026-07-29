# OCEAN — 海の仕組み

`src/components/ocean/` の全体像と、調整したいときにどこを触るか。

## 深度モデル

サイト全体で1つの正規化深度 `d ∈ [0, 1]`。0 が水面、1 が最深部（-3,200m 相当）。

```
d = ページの基準深度 + スクロール進捗 × ページの深度幅
```

| ルート | 深度帯 | 主な住人 |
|---|---|---|
| `/` | 0.00–0.55 | 小魚、群れ、サメ |
| `/works` | 0.30–0.55 | 群れ、サメ |
| `/works/[slug]` | 0.45–0.65 | クラゲ、マンタ |
| `/blog` | 0.55–0.75 | クジラ（帯は 0.44–0.88 なのでトップ下部から見える） |
| `/blog/[slug]` | 0.65–0.85 | 大王イカ |
| `/about` | 0.85–1.00 | チョウチンアンコウ |

- 帯の定義: `src/lib/depth.ts` の `BANDS`
- 水の色: 同ファイルの `WATER_RAMP`
- 値の流れ: `DepthController`（スクロール→目標深度）→ `depthStore`（毎フレーム補間）
  → `OceanBackground`（エンジンへ反映）。React の再レンダーは通さない

## 描画スタック（下から順）

1. **水** — `FluidSimulation.ts`。Stable Fluids（移流→渦度強調→発散→圧力→勾配減算）
2. **色** — 流体の輝度を深度の色ランプに通す（`fluidShaders.ts` の displayFragment）
3. **生き物** — `CreatureLayer.ts`（単独遊泳のシルエット）+ `BoidsFlock.ts`
   （コード生成の 3D 魚の群れ。専用シーン・カメラで描く）
4. **光条・カースティクス** — `oceanShaders.ts` の lightFragment。浅い層のみ
5. **マリンスノー** — 同 particleVertex/Fragment（気泡は水槽っぽいので廃止）
6. **生物発光** — CreatureLayer 内の加算グロー（アンコウの提灯・クラゲ）
7. **ベール** — DOM の黒い膜（`ContentVeil.tsx`）。本文の背後で水を落とす

## 調整パラメータ早見表

| 変えたいこと | 場所 |
|---|---|
| 水の流れの速さ・強さ | `FluidSimulation.ts` の `autoStir` 内 `stirrers`。speed は基本角速度（周期90秒）の整数倍を守ると軌道が閉じてループする |
| 渦の巻き具合 | 同 `uCurlStrength`（現在 15。大きいほど渦が立つ） |
| 水の色 | `src/lib/depth.ts` の `WATER_RAMP` |
| 文字（SHIMANO）の消える深度 | `fluidShaders.ts` displayFragment の `textFade` |
| 光条・カースティクスの強さ | `oceanShaders.ts` lightFragment 末尾の係数（0.2 / 0.09） |
| 生き物の種類・数・大きさ・速さ | `CreatureLayer.ts` の `SPECIES` |
| 泳ぎ方（うねりの振幅・波数・拍） | 同 `SPECIES` の `swim` |
| 群れの匹数・逃避半径・規則の強さ | `BoidsFlock.ts`（count / 0.38 / 各係数） |
| ベールの濃さ | `ContentVeil.tsx` の `PEAK`（現在 0.86） |
| ベールの立ち上がり速さ | `DepthController.tsx`（現在 0.4 画面ぶん） |
| 深度計の最大メートル | `src/lib/depth.ts` の `MAX_DEPTH_METERS` |
| シミュレーション解像度 | `FluidSimulation.ts` の `SETTINGS` |

## 性能の仕掛け

- 画面外・タブ非表示でループ停止（`OceanBackground` の IntersectionObserver / visibilitychange）
- スクロールもポインタも 3 秒止まると流体更新が1フレームおきになる（`lastInteraction`）
- モバイル（幅 768 未満 or 粗ポインタ）は解像度と生き物の数を落とす
- 画素密度の上限 1.5
- fps 計測は `scripts/verify/fps.mjs`。**ヘッドレスはソフトウェア描画なので
  絶対値ではなく変更前後の相対比較にだけ使う**

## 落とし穴

- 流体パスはクリップ座標を直接出す（カメラ無視）。生き物は専用の
  正射影カメラで描く。混ぜない
- ベールは加算合成の光を消せない。光を落とすときはシェーダー側の `uVeil` も使う
- `Species` の深度帯の端では presence が滑らかに 0 になる。水面（d=0）や
  最深部（d=1）に住む種は、帯を端まで届かせないと永久に現れない
