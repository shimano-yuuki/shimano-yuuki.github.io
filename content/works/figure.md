---
title: figure
subtitle: 筋トレ・ランニング記録 & 分析アプリ
summary: 重量 × 回数をセット単位でサッと記録し、伸びをグラフで確認できるトレーニング記録アプリ。「分析」と「わかりやすさ」に絞って設計した Flutter 製 iOS アプリ。
date: 2026-08-06
role:
  - 要件定義
  - 画面設計
  - 実装
stack:
  - Flutter
  - Dart
  - Riverpod
  - Firebase
cover: /images/works/figure/cover.jpg
gallery: []
# リポジトリは非公開のため App Store のみ
links:
  App Store: https://apps.apple.com/jp/app/figure-%E7%AD%8B%E3%83%88%E3%83%AC-%E3%83%88%E3%83%AC%E3%83%BC%E3%83%8B%E3%83%B3%E3%82%B0-%E3%83%95%E3%82%A3%E3%83%83%E3%83%88%E3%83%8D%E3%82%B9/id6760589898
featured: true
order: 2
---

「figure」は、筋トレとランニングの記録・分析アプリです。
ジムでの入力コストを最小にしながら、重量や回数の伸びをグラフで一目で確認できます。

## 主な機能

- **セットごとの記録** — 重量 × 回数をセット単位で、ジムでもサッと入力
- **ラベルで整理** — 上半身・下半身などのタブでメニューを絞り込み
- **伸びが見える分析** — 重量・回数・距離の推移をグラフで一目で確認。最大重量や推定 1RM の推移も追える
- **筋トレもランニングも** — 種目タイプに合わせた入力とグラフで両方カバー

## 開発について

「他の筋トレアプリって、ぐちゃぐちゃして分かりづらくない？」——そんな疑問から、このアプリの開発は始まりました。
機能を詰め込むのではなく**「分析」**と**「わかりやすさ」**に絞って設計。ジムでの入力コストを下げ、記録を途切れさせないことを最優先にしています。

## 使った技術

Flutter（Dart）製の iOS アプリ。状態管理は Riverpod、ルーティングは go_router、モデルは freezed で構成し、グラフ描画には fl_chart を使用。バックエンドは Firebase（Authentication / Cloud Firestore / Remote Config）で、Google・Apple のソーシャルログインに対応しています。
