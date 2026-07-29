/**
 * サイト全体で使う定数。名前・連絡先はここだけ直せば全ページに反映される。
 */
export const site = {
  name: "SHIMANO",
  fullName: "Shimano Yuuki",
  nameJa: "島野 友暉",
  role: "Software Engineer",
  tagline: "アプリと Web をつくっています。",
  description:
    "モバイルアプリと Web を中心につくっているエンジニアのポートフォリオと記録。",
  established: "2026",
  url: process.env.NEXT_PUBLIC_SITE_URL ?? "https://shimano-yuuki.github.io",
  locale: "ja_JP",
  links: [
    { label: "GitHub", href: "https://github.com/shimano-yuuki" },
    { label: "Email", href: "mailto:yuukireirei5@gmail.com" },
  ],
} as const;

export const navigation = [
  { label: "Index", labelJa: "トップ", href: "/" },
  { label: "Works", labelJa: "作品", href: "/works" },
  { label: "Journal", labelJa: "記録", href: "/blog" },
  { label: "About", labelJa: "自己紹介", href: "/about" },
] as const;
