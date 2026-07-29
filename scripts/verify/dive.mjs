/**
 * 潜水の検証。
 * トップページを段階的にスクロールして各深度のスクショを撮り、
 * 深度計が動くこと・ページ遷移でキャンバス（水）が作り直されないことを確認する。
 *
 * 使い方:
 *   npm run build && npx serve out -l 4321 &
 *   node scripts/verify/dive.mjs <出力ディレクトリ> [ベースURL]
 *
 * playwright が無ければ: npx playwright@latest install chromium
 */
import { chromium } from "playwright";

const OUT = process.argv[2];
const BASE = process.argv[3] ?? "http://localhost:4321";

const browser = await chromium.launch({ args: ["--enable-unsafe-swiftshader"] });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const errors = [];
page.on("pageerror", (e) => errors.push(String(e)));
page.on("console", (m) => {
  if (m.type() === "error") errors.push(m.text());
});

await page.goto(`${BASE}/`, { waitUntil: "networkidle" });
await page.waitForTimeout(3500);

// トップページを少しずつ潜っていき、各段階を撮る
const stops = [0, 0.25, 0.5, 0.75, 1];
for (const [i, t] of stops.entries()) {
  await page.evaluate((ratio) => {
    const max = document.documentElement.scrollHeight - window.innerHeight;
    window.scrollTo({ top: max * ratio, behavior: "instant" });
  }, t);
  await page.waitForTimeout(2200);
  await page.screenshot({ path: `${OUT}/dive-${i}-${t}.png` });
}

// 深度ゲージが動いているか
const gauge = await page.evaluate(() => {
  const nodes = [...document.querySelectorAll("p")].filter((p) =>
    /-[\d,]+ m/.test(p.textContent ?? ""),
  );
  return nodes[0]?.textContent ?? "見つからない";
});
console.log("ゲージ:", gauge);

// 別ページへ移って水が続いているか（キャンバスが作り直されていないか）
await page.evaluate(() => window.scrollTo(0, 0));
const before = await page.evaluate(() => {
  const c = document.querySelector("canvas");
  c.dataset.marked = "yes";
  return c.dataset.marked;
});
await page.click('a[href="/works/"]').catch(() => {});
await page.waitForTimeout(2500);
const after = await page.evaluate(() => {
  const c = document.querySelector("canvas");
  return { marked: c?.dataset.marked ?? "作り直された", url: location.pathname };
});
console.log("遷移前のマーク:", before, "→ 遷移後:", JSON.stringify(after));
await page.screenshot({ path: `${OUT}/dive-works.png` });

console.log("errors:", errors.slice(0, 3).join(" | ") || "なし");
await browser.close();
