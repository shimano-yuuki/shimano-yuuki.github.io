import type { NextConfig } from "next";

/**
 * GitHub Pages 向けの静的書き出し。
 * - output: "export" … out/ に HTML を書き出す。サーバーは使わない。
 * - trailingSlash … /about/index.html の形にして、拡張子なし URL でも確実に引けるようにする。
 * - images.unoptimized … 画像最適化はサーバーが要るので切る。置いた画像がそのまま配信される。
 */
const nextConfig: NextConfig = {
  output: "export",
  trailingSlash: true,
  images: { unoptimized: true },
};

export default nextConfig;
