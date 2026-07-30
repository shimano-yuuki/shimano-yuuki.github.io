---
name: verify-visual
description: 見た目の変更を実測で検証する手順（コントラスト比・reduced-motion）。見た目を触ったら必ず走らせる。
---

# 見た目の実測検証

「読める気がする」を禁止し、数値と画像で確認する。

## 準備（共通）

```bash
npm run build
npx serve out -l 4321 &        # 本番同等の静的配信
# playwright が無ければ: npx playwright@latest install chromium
```

## 1. コントラスト比（配色・文字色を触ったら必須）

```bash
node scripts/verify/contrast.mjs /tmp/shots
```

- 基準: 本文 7:1 / 大きい文字 4.5:1（docs/DESIGN.md）
- 仕組み: 文字あり・文字なしの2枚を撮り、差分画素から実測。
  CSS の色文字列は読まない（Tailwind v4 の color-mix が解析不能なため）

## 2. reduced-motion

```bash
node scripts/verify/reduced-motion.mjs
```

「透明のまま残る要素: 0」で合格。FadeIn が即表示になっていること。
（時計は動き続けてよい——時刻表示は装飾ではなく情報）
