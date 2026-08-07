# CONTENT — content/ の書き方

**設定ファイルは触らない。Markdown を1本置いて push するだけで増える。**
ファイル名がそのまま URL になる（`content/blog/2026-08-01-example.md` → `/blog/2026-08-01-example/`）。

読み込みと検証は `src/lib/content.ts`。frontmatter は Zod で検証され、
必須項目の欠落や日付の形式違いは `npm run build` が**ファイル名と項目を名指しで**止める。

## 作品 — `content/works/*.md`

```yaml
---
title: 作品名            # 必須
subtitle: 一言での説明
summary: 一覧カードに出る1〜2文。   # 必須
date: 2026-08-01         # 必須。YYYY-MM-DD
role: [設計, 実装]
stack: [Flutter, TypeScript]   # /works の絞り込みタグになる
cover: ""                # 画像パス。空ならサンプル作品画が自動生成される。
                         # 書くと トップのスライド / 詳細ページ上部 / OG に出る
gallery: []
links:
  github: https://github.com/...   # 空文字のリンクは表示されない
featured: true           # true でトップのスライドショーに出る（作品表には全作品が出る）
order: 1                 # 一覧の並び。小さいほど前
draft: false             # true は開発中のみ表示
---
本文（Markdown / GFM）
```

## 記事 — `content/blog/*.md`

```yaml
---
title: 記事のタイトル      # 必須
date: 2026-08-01         # 必須。YYYY-MM-DD
tags: [フロントエンド]
excerpt: 一覧に出る短い紹介文。   # 必須
cover: ""
draft: false
---
本文
```

- 目次は h2 / h3 から自動生成（見出し2つ未満なら出ない）
- コードブロックはシンタックスハイライトつき（モノクロームに減色される）

## 画像

- `public/images/works/<slug>/cover.jpg` に置いて frontmatter の `cover` にパスを書く
- 推奨は 1600×1000（16:10）・300KB 以下。スライドは contain 表示なので
  どの縦横比でも切り抜かれない
- **最適化は走らない**（GitHub Pages の静的配信）。縮めてから置く

## 反映される場所

1本足すと自動で反映される: 一覧ページ / トップの抜粋 / 詳細ページ（SSG）/
sitemap.xml / feed.xml。手作業は不要。
