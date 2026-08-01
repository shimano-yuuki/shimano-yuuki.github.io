import { chromium } from "playwright";
import { readFileSync } from "node:fs";

/**
 * 本文と背景のコントラスト比を実測する。
 *
 * 色は CSS から読まない。Tailwind v4 は color-mix(oklab ...) を吐くため
 * 文字列解析では正しい RGB が取れない。
 * 代わりに「文字あり」と「文字を透明にした」2枚を撮り、差分の大きい画素を
 * 文字とみなして、その位置の両方の色を実測する。
 *
 * 基準: 本文 7:1、大きい文字（18px 以上 or 14px 太字）4.5:1。
 * 11px の小ラベルは 4.5〜7:1 に留めることを許容している（docs/DESIGN.md 参照）。
 *
 * 使い方:
 *   npm run build && npx serve out -l 4321 &
 *   node scripts/verify/contrast.mjs <作業ディレクトリ> [ベースURL]
 */

const OUT = process.argv[2];
const BASE = process.argv[3] ?? "http://localhost:4321";

function luminance([r, g, b]) {
  const lin = (c) => {
    const v = c / 255;
    return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}

function ratio(a, b) {
  const [hi, lo] = a > b ? [a, b] : [b, a];
  return (hi + 0.05) / (lo + 0.05);
}

const PAGES = [
  { path: "/", stops: [0.15, 0.4, 0.7, 0.95] },
  { path: "/works/", stops: [0.1, 0.5, 0.9] },
  { path: "/blog/", stops: [0.1, 0.6] },
  { path: "/blog/2026-07-20-lenis-gsap/", stops: [0.2, 0.6] },
  { path: "/about/", stops: [0.1, 0.5, 0.9] },
];

const HIDE_TEXT = `main *, footer * {
  color: transparent !important;
  -webkit-text-fill-color: transparent !important;
  text-decoration-color: transparent !important;
}`;

const browser = await chromium.launch({ args: ["--enable-unsafe-swiftshader"] });
// 背景の流体が動いていると2枚の差分が取れないため、reduced-motion で静止させる。
// 静止フレームも同じ配色ランプで描かれるので、背景色の実測として有効。
const page = await browser.newPage({
  viewport: { width: 1440, height: 900 },
  reducedMotion: "reduce",
});
const helper = await browser.newPage();
await helper.setContent("<canvas id='a'></canvas><canvas id='b'></canvas>");

const findings = [];

for (const { path, stops } of PAGES) {
  await page.goto(`${BASE}${path}`, { waitUntil: "networkidle" });
  await page.waitForTimeout(2600);

  for (const stop of stops) {
    await page.evaluate((s) => {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      window.scrollTo({ top: max * s, behavior: "instant" });
    }, stop);
    await page.waitForTimeout(1500);

    const samples = await page.evaluate(() => {
      const out = [];
      for (const el of document.querySelectorAll(
        "main p, main h1, main h2, main h3, main li, main time, main span, footer p, footer a",
      )) {
        const text = (el.textContent ?? "").trim();
        if (text.length < 3) continue;
        // 子要素を持つものは、内側の要素で別途拾われるので飛ばす
        if (el.children.length > 0) continue;
        const r = el.getBoundingClientRect();
        if (r.top < 30 || r.bottom > window.innerHeight - 15) continue;
        if (r.width < 30 || r.height < 8) continue;
        const style = getComputedStyle(el);
        out.push({
          text: text.slice(0, 24),
          size: parseFloat(style.fontSize),
          weight: parseInt(style.fontWeight, 10) || 400,
          box: {
            x: Math.round(r.x),
            y: Math.round(r.y),
            w: Math.round(Math.min(r.width, 460)),
            h: Math.round(r.height),
          },
        });
      }
      return out.slice(0, 12);
    });

    if (samples.length === 0) continue;

    // 出現アニメーションが未完了だと、透明な文字を測ってしまう。
    // 最終状態を測りたいので、不透明度を確定させる。
    const settle = await page.addStyleTag({
      content: "main *, footer * { opacity: 1 !important; }",
    });
    await page.waitForTimeout(250);

    const withText = `${OUT}/_with.png`;
    const withoutText = `${OUT}/_without.png`;
    await page.screenshot({ path: withText });
    const style = await page.addStyleTag({ content: HIDE_TEXT });
    await page.waitForTimeout(120);
    await page.screenshot({ path: withoutText });
    await style.evaluate((node) => node.remove());
    await settle.evaluate((node) => node.remove());

    const uriA = "data:image/png;base64," + readFileSync(withText).toString("base64");
    const uriB = "data:image/png;base64," + readFileSync(withoutText).toString("base64");

    const measured = await helper.evaluate(
      async ({ uriA, uriB, samples }) => {
        const load = async (uri) => {
          const img = new Image();
          img.src = uri;
          await img.decode();
          return img;
        };
        const imgA = await load(uriA);
        const imgB = await load(uriB);
        const ca = document.getElementById("a");
        const cb = document.getElementById("b");
        const results = [];

        for (const s of samples) {
          const { x, y, w, h } = s.box;
          ca.width = cb.width = w;
          ca.height = cb.height = h;
          const ctxA = ca.getContext("2d", { willReadFrequently: true });
          const ctxB = cb.getContext("2d", { willReadFrequently: true });
          ctxA.clearRect(0, 0, w, h);
          ctxB.clearRect(0, 0, w, h);
          ctxA.drawImage(imgA, x, y, w, h, 0, 0, w, h);
          ctxB.drawImage(imgB, x, y, w, h, 0, 0, w, h);
          const da = ctxA.getImageData(0, 0, w, h).data;
          const db = ctxB.getImageData(0, 0, w, h).data;

          // 差分の大きい画素＝文字の芯
          const pixels = [];
          for (let i = 0; i < da.length; i += 4) {
            const diff =
              Math.abs(da[i] - db[i]) +
              Math.abs(da[i + 1] - db[i + 1]) +
              Math.abs(da[i + 2] - db[i + 2]);
            if (diff > 24) pixels.push({ i, diff });
          }
          if (pixels.length < 12) {
            results.push(null);
            continue;
          }
          pixels.sort((p, q) => q.diff - p.diff);
          // 上位2割だけを使い、輪郭のアンチエイリアスを避ける
          const core = pixels.slice(0, Math.max(8, Math.floor(pixels.length * 0.2)));
          let ar = 0, ag = 0, ab = 0, br = 0, bg = 0, bb = 0;
          for (const { i } of core) {
            ar += da[i]; ag += da[i + 1]; ab += da[i + 2];
            br += db[i]; bg += db[i + 1]; bb += db[i + 2];
          }
          const n = core.length;
          results.push({
            text: [ar / n, ag / n, ab / n],
            bg: [br / n, bg / n, bb / n],
            coverage: pixels.length,
          });
        }
        return results;
      },
      { uriA, uriB, samples },
    );

    samples.forEach((sample, index) => {
      const m = measured[index];
      if (!m) return;
      const value = ratio(luminance(m.text), luminance(m.bg));
      // 18px 以上、または 14px 以上の太字は「大きい文字」。それ以外は本文扱い。
      const large = sample.size >= 18 || (sample.size >= 14 && sample.weight >= 700);
      const target = large ? 4.5 : 7;
      findings.push({
        page: path,
        stop,
        text: sample.text,
        size: Math.round(sample.size),
        ratio: +value.toFixed(2),
        target,
        pass: value >= target,
      });
    });
  }
}

await browser.close();

const failed = findings.filter((f) => !f.pass);
console.log(`計測 ${findings.length} 件 / 目標未達 ${failed.length} 件`);
if (failed.length) {
  console.log("\n--- 目標を下回った箇所 ---");
  for (const f of failed.sort((a, b) => a.ratio - b.ratio).slice(0, 14)) {
    console.log(
      `${String(f.ratio).padStart(6)}:1 (目標 ${f.target}) ${f.size}px  ${f.page}@${f.stop}  "${f.text}"`,
    );
  }
}
const sorted = [...findings].sort((a, b) => a.ratio - b.ratio);
console.log(`\n最小 ${sorted[0]?.ratio}:1 / 中央 ${sorted[Math.floor(sorted.length / 2)]?.ratio}:1`);
