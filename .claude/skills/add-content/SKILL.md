---
name: add-content
description: 作品（works）や記事（blog）を追加・編集する手順。frontmatter の仕様は docs/CONTENT.md が正。
---

# 作品・記事の追加

## 手順

1. `docs/CONTENT.md` の frontmatter 仕様に従って `content/works/` か
   `content/blog/` に `.md` を1本置く。**設定ファイルは触らない**
2. 検証:
   ```bash
   npm run build
   ```
   frontmatter の不備はここでファイル名と項目を名指しで止まる
3. 画像を使う場合は先に縮める（長辺 2000px・数百 KB。最適化は走らない）。
   置き場所は `public/images/works/<slug>/`
4. ローカルで見た目を確認して push（自動デプロイ）

## 注意

- 見出しだけ置いて本文が空だと、空セクションがそのまま出る。中身と一緒に足す
- `draft: true` は開発中のみ表示。本番からは消える
- 日付は `YYYY-MM-DD` 固定
