/**
 * フレームレートの計測。
 *
 * 注意: ヘッドレスはソフトウェア描画（SwiftShader）なので、実 GPU より
 * 大幅に遅い「下限値」が出る。変更前後の相対比較にだけ使うこと。
 *
 * 使い方:
 *   npm run build && npx serve out -l 4321 &
 *   node scripts/verify/fps.mjs [ベースURL]
 */
import { chromium } from "playwright";

const BASE = process.argv[2] ?? "http://localhost:4321";

const browser = await chromium.launch({ args: ["--enable-unsafe-swiftshader"] });

for (const [width, height, label] of [
  [1440, 900, "デスクトップ"],
  [375, 812, "モバイル"],
]) {
  const page = await browser.newPage({ viewport: { width, height } });
  await page.goto(`${BASE}/`, { waitUntil: "networkidle" });
  await page.waitForTimeout(3000);

  const fps = await page.evaluate(
    () =>
      new Promise((resolve) => {
        let frames = 0;
        const start = performance.now();
        const tick = () => {
          frames += 1;
          if (performance.now() - start < 3000) requestAnimationFrame(tick);
          else resolve(Math.round((frames / (performance.now() - start)) * 1000));
        };
        requestAnimationFrame(tick);
      }),
  );
  console.log(`${label} (${width}x${height}): ${fps} fps`);
  await page.close();
}

await browser.close();
