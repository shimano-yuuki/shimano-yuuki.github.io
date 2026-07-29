<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# AGENTS — このリポジトリの運用契約

個人サイト（https://shimano-yuuki.github.io）。
「サイト全体が1本の水柱で、スクロールが潜水になる」WebGL サイト。

## ドキュメントは 1関心事 = 1置き場所

| 知りたいこと | 場所 |
|---|---|
| 動かし方・記事の増やし方 | `README.md` |
| 意匠の決まり（配色・書体・可読性基準） | `docs/DESIGN.md` |
| 海の仕組み（深度・シェーダー・調整パラメータ） | `docs/OCEAN.md` |
| content/ の frontmatter 仕様 | `docs/CONTENT.md` |
| なぜこうなったかの経緯 | `docs/DECISIONS.md` |
| 定型作業の手順 | `.claude/skills/*/SKILL.md` |

同じ内容を複数の場所に書かない。矛盾したら docs/ 側が正。

## 原則

1. **見た目の変更は必ず実測で検証する。** 目視の「読める気がする」で済ませない。
   `scripts/verify/` に道具がある（使い方は `.claude/skills/verify-visual/SKILL.md`）。
   - コントラスト: 本文 7:1 / 大きい文字 4.5:1（`docs/DESIGN.md` の基準）
   - 潜水の連続性: ページ遷移でキャンバスが作り直されないこと
2. **演出は切れることが前提。** `prefers-reduced-motion` で全アニメーションが止まり、
   WebGL 非対応でグラデーションに落ちても、内容がすべて読めること。
3. **push は自由。** 公開リポジトリなので GitHub Actions の分数は無制限。
   ただし push 前にローカルで `npm run build` が通ること。
4. **Next.js 16 の作法**: `params` は Promise。metadata 系ルートは
   `output: "export"` のため `dynamic = "force-static"` が要る。
   詳細は冒頭の nextjs-agent-rules と既存ページの実装を踏襲する。

## GitHub Pages ゆえの制約（ハマりどころ）

- 画像は最適化されない（`images.unoptimized`）。置く前に縮める
- OG 画像はファイル規約が使えない（拡張子なしで書き出される）。
  `npm run og` で `public/og.png` を生成する方式
- `/feed.xml` へのリンクは `<a>` で書く（`<Link>` だと RSC 先読みが 404 を吐く）
- `body` に背景色を置かない（固定キャンバスの海が隠れる）

## 検証コマンド

```bash
npm run build                      # 型 + frontmatter 検証込み
npx eslint src --max-warnings 0
npx serve out -l 4321              # 本番同等をローカル配信
node scripts/verify/dive.mjs /tmp/shots      # 潜水スクショ + 連続性
node scripts/verify/contrast.mjs /tmp/shots  # コントラスト実測
node scripts/verify/fps.mjs                  # fps（相対比較のみ）
```
