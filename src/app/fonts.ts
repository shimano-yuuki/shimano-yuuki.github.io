import {
  Instrument_Serif,
  Shippori_Mincho_B1,
  Space_Mono,
  Zen_Kaku_Gothic_New,
} from "next/font/google";

/** 欧文見出し。誌面のロゴ・大見出しに使う。 */
export const displaySerif = Instrument_Serif({
  variable: "--font-display-src",
  subsets: ["latin"],
  weight: "400",
  style: ["normal", "italic"],
  display: "swap",
});

/** 和文見出し。欧文見出しと並べても線の太さが揃うものを選んでいる。 */
export const japaneseSerif = Shippori_Mincho_B1({
  variable: "--font-jp-serif-src",
  subsets: ["latin"],
  weight: ["400", "600", "800"],
  display: "swap",
  preload: false,
});

/** 和文本文。 */
export const japaneseSans = Zen_Kaku_Gothic_New({
  variable: "--font-jp-sans-src",
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  display: "swap",
  preload: false,
});

/** ラベル・ノンブル・日付。雑誌のキャプション部分の役割。 */
export const monoLabel = Space_Mono({
  variable: "--font-label-src",
  subsets: ["latin"],
  weight: ["400", "700"],
  display: "swap",
});

export const fontVariables = [
  displaySerif.variable,
  japaneseSerif.variable,
  japaneseSans.variable,
  monoLabel.variable,
].join(" ");
