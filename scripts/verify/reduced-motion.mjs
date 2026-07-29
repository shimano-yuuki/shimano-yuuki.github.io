/**
 * 「視差効果を減らす」有効時の検証。
 * 生き物と水が静止し、透明のまま残る要素（読めない内容）が無いことを確認する。
 *
 * 使い方:
 *   npm run build && npx serve out -l 4321 &
 *   node scripts/verify/reduced-motion.mjs [ベースURL]
 */
import { chromium } from "playwright";

const BASE = process.argv[2] ?? "http://localhost:4321";

const browser = await chromium.launch({ args: ["--enable-unsafe-swiftshader"] });
const page = await browser.newPage({
  viewport: { width: 1440, height: 900 },
  reducedMotion: "reduce",
});

await page.goto(`${BASE}/works/`, { waitUntil: "networkidle" });
await page.waitForTimeout(2000);

const first = await page.screenshot();
await page.waitForTimeout(2500);
const second = await page.screenshot();

const hidden = await page.evaluate(
  () =>
    [...document.querySelectorAll("main *")].filter(
      (el) =>
        parseFloat(getComputedStyle(el).opacity) < 0.05 &&
        el.textContent?.trim(),
    ).length,
);

console.log("透明のまま残る要素:", hidden, hidden === 0 ? "(合格)" : "(要修正)");
console.log(
  "画面の静止:",
  Buffer.compare(first, second) === 0
    ? "2.5秒間 完全一致（合格）"
    : "差分あり — ノイズやゲージ程度か目視で確認すること",
);

await browser.close();
