---
name: ocean-tuning
description: 海の見た目（流れの速さ・水の色・生き物・光・ベール）を調整するときの手順。どの定数がどこにあるかは docs/OCEAN.md の早見表が正。
---

# 海の調整

## 手順

1. `docs/OCEAN.md` の「調整パラメータ早見表」で対象の定数と場所を引く
2. 値を変える（1回の調整で触る定数は少なく。効果の切り分けができなくなる）
3. ローカル確認:
   ```bash
   npm run dev        # 触りながら見る
   ```
   仕上げ確認は本番同等で:
   ```bash
   npm run build && npx serve out -l 4321
   node scripts/verify/dive.mjs /tmp/shots
   ```
4. **水の明るさ・ベール・文字色を触った場合はコントラスト再計測が必須**:
   ```bash
   node scripts/verify/contrast.mjs /tmp/shots
   ```
   基準は docs/DESIGN.md（本文 7:1）。下回ったら戻すか別の手を考える
5. 解像度・粒子数・生き物の数を増やした場合は fps の相対比較:
   ```bash
   node scripts/verify/fps.mjs
   ```

## 過去にやらかした調整（同じ轍を踏まない）

- カースティクス強度 0.5 → 画面が電撃になった。0.09 が現在値
- 攪拌の speed/force を上げすぎ → 洗濯機。海はゆっくりが正解
- 生き物の presence を中心距離の二乗で落とす → 帯の端（水面・最深部）の種が
  永久に出ない。内側フラット + 縁だけ smoothstep が正解
