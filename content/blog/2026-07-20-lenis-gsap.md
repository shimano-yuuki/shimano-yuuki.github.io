---
title: Lenis と GSAP ScrollTrigger を噛み合わせる
date: 2026-07-20
tags:
  - フロントエンド
  - GSAP
excerpt: 慣性スクロールを入れると ScrollTrigger の発火位置がずれる。両者を同じ ticker に乗せて解決した話。
cover: ""
draft: false
---

慣性スクロールを入れたページで GSAP の ScrollTrigger を使うと、要素の出現位置が微妙にずれます。
Lenis が独自に位置を持っているのに、ScrollTrigger はブラウザのスクロール位置を見ているためです。

## 同じ ticker に乗せる

Lenis の `raf` を GSAP の ticker から呼び、スクロールのたびに `ScrollTrigger.update()` を叩きます。

```ts
const lenis = new Lenis({ lerp: 0.1 });

lenis.on("scroll", ScrollTrigger.update);

const raf = (time: number) => lenis.raf(time * 1000);
gsap.ticker.add(raf);
gsap.ticker.lagSmoothing(0);
```

`time * 1000` が要ります。GSAP の ticker は秒、Lenis はミリ秒を期待しているためです。

## 動きを止める人のことを忘れない

慣性スクロールは、酔いやすい人にとってはただの負担になります。
`prefers-reduced-motion: reduce` が有効なときは、Lenis を生成せずブラウザ標準のスクロールに任せています。

```ts
if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
```

演出を足すときは、必ず「切ったときにちゃんと読めるか」を先に確認するようにしています。
