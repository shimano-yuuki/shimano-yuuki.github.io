---
name: verify-visual
description: 見た目の変更を実測で検証する手順（潜水スクショ・コントラスト比・fps）。見た目を触ったら必ずどれかを走らせる。
---

# 見た目の実測検証

「読める気がする」「動いてる気がする」を禁止し、数値と画像で確認する。

## 準備（共通）

```bash
npm run build
npx serve out -l 4321 &        # 本番同等の静的配信
# playwright が無ければ: npx playwright@latest install chromium
```

## 1. 潜水スクショ + ページ遷移の連続性

```bash
node scripts/verify/dive.mjs /tmp/shots
```

- 各深度のスクショが /tmp/shots に落ちる。目視で崩れを確認
- 出力の「遷移後」が `marked: "yes"` なら、ページを移っても
  キャンバス（水）が作り直されていない = 合格

## 2. コントラスト比（水・ベール・文字色を触ったら必須）

```bash
node scripts/verify/contrast.mjs /tmp/shots
```

- 基準: 本文 7:1 / 大きい文字 4.5:1 / 11px 小ラベルのみ 4.5〜7:1 許容
- 仕組み: 文字あり・文字なしの2枚を撮り、差分画素から実測。
  CSS の色文字列は読まない（Tailwind v4 の color-mix が解析不能なため）
- スクロール直後の未完アニメを測らないよう opacity を確定させてから撮っている

## 3. fps（負荷を増やす変更をしたら）

```bash
node scripts/verify/fps.mjs
```

**注意: ヘッドレスはソフトウェア描画。絶対値は実機よりずっと低い。
変更前後の相対比較にだけ使い、絶対値では判断しない。**

## 4. reduced-motion

```bash
node scripts/verify/reduced-motion.mjs
```

「透明のまま残る要素: 0」と「2.5秒間 完全一致（静止）」の両方で合格。
