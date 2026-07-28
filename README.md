# shimano-site

ポートフォリオと記録。Next.js + GSAP で組んだ、レトロ／雑誌風の個人サイト。

## 動かす

```bash
npm install
npm run dev      # http://localhost:3000
npm run build    # 本番ビルド（型チェックと frontmatter の検証も走る）
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

## 構成

| 場所 | 役割 |
| --- | --- |
| `src/app/globals.css` | 配色・書体・罫線などのデザイントークン、本文の組版 |
| `src/app/fonts.ts` | 書体の読み込み |
| `src/lib/site.ts` | 名前・肩書き・連絡先。**プロフィールを直すならまずここ** |
| `src/lib/content.ts` | `content/` を読んで型を検証する層 |
| `src/lib/markdown.ts` | Markdown → HTML（GFM・見出しリンク・コードハイライト） |
| `src/components/motion/` | Lenis の慣性スクロールと GSAP の控えめな出現演出 |
| `src/components/ui/` | 罫線・セクション見出し・カバーなどの誌面パーツ |

## 演出について

慣性スクロールと出現アニメーションは、OS の「視差効果を減らす」が有効なときは
すべて無効になります。演出を切っても内容がひと通り読める状態を保っています。

## 公開

`main` に push すると Vercel が自動でデプロイします。
独自ドメインを使う場合は、環境変数 `NEXT_PUBLIC_SITE_URL` に本番 URL を設定してください
（OG 画像・sitemap・RSS の絶対 URL に使われます）。
