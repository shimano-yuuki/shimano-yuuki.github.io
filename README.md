# shimano-yuuki.github.io

ポートフォリオと記録。黒地に情報が主役の、ミニマルな個人サイト。

**公開先** → https://shimano-yuuki.github.io

## 動かす

```bash
npm install
npm run dev      # http://localhost:3000
npm run build    # out/ に静的書き出し（型チェックと frontmatter の検証も走る）
npm run og       # OG 画像 public/og.png を作り直す（名前や肩書きを変えたとき）
```

## 作品や記事を増やす

**設定ファイルは触りません。`content/` に Markdown を1本置いて push するだけです。**

```
content/
  works/   ← 作品。/works と /works/<ファイル名> になる
  blog/    ← 記事。/blog と /blog/<ファイル名> になる
```

ファイル名がそのまま URL になります。`content/blog/2026-08-01-example.md` → `/blog/2026-08-01-example`

### 作品を1件増やす

`content/works/新しい作品.md` を作って、先頭に frontmatter を書きます。

```yaml
---
title: 作品名
subtitle: 一言での説明
summary: 一覧のカードに出る1〜2文。
date: 2026-08-01
role:
  - 設計
  - 実装
stack:
  - Flutter
  - TypeScript
cover: /images/works/新しい作品/cover.jpg # 画像がなければ "" のままでOK
gallery: []
links:
  github: https://github.com/...
  site: https://...
featured: true # true にするとトップページにも出る
order: 1 # 一覧の並び順。小さいほど前
---
本文をここから Markdown で書きます。
```

### 記事を1件増やす

`content/blog/2026-08-01-タイトル.md`

```yaml
---
title: 記事のタイトル
date: 2026-08-01
tags:
  - フロントエンド
excerpt: 一覧に出る短い紹介文。
draft: false # true にすると本番では非公開（開発中だけ見える）
---
本文をここから Markdown で書きます。
```

### 画像を足す

`public/images/works/<作品名>/cover.jpg` のように置き、frontmatter の `cover` にパスを書きます。
`cover` が空のあいだは、色面と文字だけの「刷り見本」が自動で表示されます。

### 書き間違えたとき

frontmatter の必須項目が抜けていたり日付の形式が違うと、`npm run build` が
どのファイルのどの項目かを指摘して止まります。壊れたまま公開されることはありません。

## ドキュメント

| | |
| --- | --- |
| `docs/DESIGN.md` | 意匠の決まり（配色・書体・可読性基準） |
| `docs/CONTENT.md` | content/ の frontmatter 仕様 |
| `docs/DECISIONS.md` | なぜこうなったかの経緯 |
| `.claude/skills/` | 定型作業の手順（調整・追加・検証・デプロイ） |
| `scripts/verify/` | 実測ツール（潜水スクショ・コントラスト・fps） |

## 構成

| 場所 | 役割 |
| --- | --- |
| `src/app/globals.css` | 配色・書体・罫線などのデザイントークン、本文の組版 |
| `src/app/fonts.ts` | 書体の読み込み |
| `src/lib/site.ts` | 名前・肩書き・連絡先。**プロフィールを直すならまずここ** |
| `src/lib/content.ts` | `content/` を読んで型を検証する層 |
| `src/lib/markdown.ts` | Markdown → HTML（GFM・見出しリンク・コードハイライト） |
| `src/components/FadeIn.tsx` | 唯一の出現演出（IntersectionObserver 数行） |
| `src/components/home/` | 色面プレート・ステータス行・作品表 |

## 演出について

演出は「そっと現れる」1種類と、色面の中の時計だけです。
OS の「視差効果を減らす」が有効なときは出現も即時表示になります。

## 公開

`main` に push すると GitHub Actions が `out/` を書き出して GitHub Pages へ配信します
（`.github/workflows/deploy.yml`）。手元で何かを叩く必要はありません。

### 静的サイトゆえの制約

- **画像は最適化されない。** サーバーを使わないので、置いた画像がそのまま配信されます。
  写真やスクショは、アップロード前に長辺 2000px 程度・数百 KB まで縮めてください。
- **OG 画像は実ファイル。** GitHub Pages は拡張子で Content-Type を決めるため、
  Next.js の `opengraph-image.tsx` 規約（拡張子なしで書き出される）は使えません。
  代わりに `npm run og` で `public/og.png` を作り、`src/app/layout.tsx` から参照しています。
- **`/feed.xml` へのリンクは `<a>` で書く。** `<Link>` にすると Next が存在しない
  RSC ペイロードを先読みして 404 になります。

### 独自ドメインを使う場合

1. `public/CNAME` に独自ドメインを1行で書く
2. `.github/workflows/deploy.yml` の `NEXT_PUBLIC_SITE_URL` を新しい URL に変える
3. `src/lib/site.ts` の `url` の既定値も合わせる
