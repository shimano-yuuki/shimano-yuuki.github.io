import { Archivo, JetBrains_Mono, Noto_Sans_JP } from "next/font/google";

/**
 * 欧文。可変フォントで太さと幅を持つので、これ1本で大見出しから細いラベルまで賄える。
 */
export const display = Archivo({
  variable: "--font-display-src",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800", "900"],
  display: "swap",
});

/** 和文。参照サイトと同じく Noto Sans JP。 */
export const japanese = Noto_Sans_JP({
  variable: "--font-jp-src",
  subsets: ["latin"],
  weight: ["300", "400", "500", "700"],
  display: "swap",
  preload: false,
});

/** ラベル・数値・座標表示。 */
export const mono = JetBrains_Mono({
  variable: "--font-mono-src",
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  display: "swap",
});

export const fontVariables = [
  display.variable,
  japanese.variable,
  mono.variable,
].join(" ");
