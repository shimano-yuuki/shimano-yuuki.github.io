---
name: deploy
description: ビルドから GitHub Pages 公開までの手順とロールバック。push は自由（公開リポジトリなので無料枠を消費しない）。
---

# デプロイ

## 通常の流れ

```bash
npm run build                        # 型 + frontmatter 検証込み
npx eslint src --max-warnings 0
git add -A && git commit && git push origin main
```

push すると `.github/workflows/deploy.yml` が out/ を書き出して
GitHub Pages へ配信する（約 40 秒）。手作業は無い。

進行確認:
```bash
gh run list --repo shimano-yuuki/shimano-yuuki.github.io --limit 1
gh run watch <run-id> --repo shimano-yuuki/shimano-yuuki.github.io
```

公開後の確認: https://shimano-yuuki.github.io を開くか
`node scripts/verify/dive.mjs /tmp/shots https://shimano-yuuki.github.io`

## 無料枠について（調査済み・2026-07）

- 公開リポジトリの Actions は分数無制限。**push で無料枠は消費しない**
- サイト容量 1GB / 転送 100GB/月。現状 8.6MB で問題なし
- ローカルだけで確認したいとき: `npm run dev` または
  `npm run build && npx serve out -l 4321`（GitHub には一切触れない）

## ロールバック

```bash
git revert <壊れたコミット> && git push origin main   # 履歴を残して戻す（推奨）
```

## 名前・OG 画像を変えたとき

`src/lib/site.ts` を変えたら `npm run og` で `public/og.png` を作り直してから commit。
