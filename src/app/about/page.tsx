/**
 * About — プロフィールページ。
 *
 * ============================================================
 *  差し替えるのはこのファイルの上半分だけで済むようにしてある。
 * ------------------------------------------------------------
 *  1. INTRO       … 自己紹介の本文（2〜3段落）。仮テキスト。
 *  2. SKILLS      … 領域ごとの技術。区分（areaJa）ごと追加・削除して良い。
 *  3. TIMELINE    … 年表。新しい順に並べて書く。
 *  4. COLOPHON    … このサイト自体の仕様書き。制作環境を変えたら直す。
 *
 *  名前・肩書き・連絡先は src/lib/site.ts が出どころなので、
 *  ここでは触らない（site.fullName / site.nameJa / site.role / site.links）。
 * ============================================================
 */

import type { Metadata } from "next";
import { FadeIn } from "@/components/FadeIn";
import { site } from "@/lib/site";

export const metadata: Metadata = {
  title: "About",
  description: `${site.fullName}（${site.nameJa}）— ${site.role}。${site.description}`,
  openGraph: {
    title: `About | ${site.name}`,
    description: `${site.fullName}（${site.nameJa}）— ${site.role}`,
  },
};

/* ---------------------------------------------------------------
   1. INTRO — 自己紹介の本文。仮テキスト。
   --------------------------------------------------------------- */

const intro = [
  "モバイルアプリと Web をつくっているエンジニアです。ふだんは Flutter で iOS / Android のアプリを、TypeScript で Web を書いています。使う人の手元でどう動くかを先に決めてから、実装の形を選ぶようにしています。",
  "つくるものは個人開発が中心です。地図を扱うアプリ、記録をためるアプリなど、自分がほしいと思ったものを小さく出して、使いながら直していく進め方をしています。設計より先に触れるものをつくる、という順番を崩さないようにしています。",
  "画面の細部と文字組みが好きで、余白と罫線でどこまで説明できるかをよく考えています。このサイトも、装飾を足すのではなく、組版と 2 色だけで成立させることを目標に組みました。",
];

/* ---------------------------------------------------------------
   2. SKILLS — 領域ごとの技術。
   --------------------------------------------------------------- */

const skills = [
  {
    areaJa: "モバイル",
    items: ["Flutter", "Dart", "Riverpod", "Firebase"],
  },
  {
    areaJa: "ウェブ",
    items: ["TypeScript", "React", "Next.js", "Tailwind CSS"],
  },
  {
    areaJa: "サーバー",
    items: ["Node.js", "Supabase", "PostgreSQL", "REST / JSON"],
  },
  {
    areaJa: "道具",
    items: ["Git / GitHub", "Figma", "Vercel", "VS Code"],
  },
];

/* ---------------------------------------------------------------
   3. TIMELINE — 年表。新しい順。
   --------------------------------------------------------------- */

const timeline = [
  {
    year: "2026",
    title: "ポートフォリオを開設",
    body: "つくったものと考えたことを置いておく場所として、この誌面をつくりました。",
  },
  {
    year: "2025",
    title: "個人開発のアプリを公開",
    body: "Flutter で書いたアプリをストアに出し、使う人からの声をもとに手を入れ続けています。",
  },
  {
    year: "2024",
    title: "Flutter でモバイル開発を始める",
    body: "画面をコードで組み立てる書き味が肌に合い、以来アプリづくりの主軸にしています。",
  },
  {
    year: "2023",
    title: "Web をつくり始める",
    body: "HTML と CSS から入り、TypeScript と React まで手を広げました。",
  },
];

/* ---------------------------------------------------------------
   4. COLOPHON — このサイトの仕様。最後に 1 行で記す。
   --------------------------------------------------------------- */

const colophon = ["Next.js", "Tailwind CSS", "Markdown", "GitHub Pages"];

/* ========================================================================= */

export default function AboutPage() {
  return (
    <div className="measure pb-24 sm:pb-32">
      {/* 冒頭 */}
      <FadeIn as="header" className="pt-20 sm:pt-28">
        <h1 className="text-sm text-fg-muted">自己紹介</h1>

        <div className="mt-10 flex flex-wrap items-baseline gap-x-4 gap-y-2">
          <p className="display text-2xl">{site.fullName}</p>
          <p className="text-sm text-fg-muted">{site.nameJa}</p>
        </div>
        <p className="label mt-2 text-fg-faint">{site.role}</p>
      </FadeIn>

      {/* 本文 */}
      <FadeIn as="section" className="mt-14 sm:mt-16">
        <div className="max-w-[40rem]">
          {intro.map((paragraph, index) => (
            <p
              key={index}
              className={
                index === 0
                  ? "leading-[2.1] text-fg"
                  : "mt-7 text-[0.9375rem] leading-[2.1] text-fg-muted"
              }
            >
              {paragraph}
            </p>
          ))}
        </div>
      </FadeIn>

      {/* 技術 */}
      <FadeIn as="section" className="mt-24 sm:mt-32">
        <h2 className="text-sm text-fg-muted">技術</h2>

        <dl className="mt-8 max-w-[40rem]">
          {skills.map((group) => (
            <div
              key={group.areaJa}
              className="grid gap-x-8 gap-y-2 border-t border-line py-5 sm:grid-cols-[7rem_minmax(0,1fr)]"
            >
              <dt className="text-sm text-fg">{group.areaJa}</dt>
              <dd className="label text-fg-muted">{group.items.join(" / ")}</dd>
            </div>
          ))}
        </dl>
      </FadeIn>

      {/* 年譜 */}
      <FadeIn as="section" className="mt-24 sm:mt-32">
        <h2 className="text-sm text-fg-muted">年譜</h2>

        <ol className="mt-8 max-w-[40rem]">
          {timeline.map((entry) => (
            <li
              key={entry.year}
              className="grid gap-x-8 gap-y-2 border-t border-line py-6 sm:grid-cols-[7rem_minmax(0,1fr)]"
            >
              <p className="label pt-1 text-fg-faint">{entry.year}</p>
              <div>
                <h3 className="text-sm text-fg">{entry.title}</h3>
                <p className="mt-3 text-sm leading-loose text-fg-muted">
                  {entry.body}
                </p>
              </div>
            </li>
          ))}
        </ol>
      </FadeIn>

      {/* 連絡先はフッターにまとめてあるので、ここでは一言だけ */}
      <FadeIn as="section" className="mt-24 sm:mt-32">
        <p className="max-w-[40rem] text-sm text-fg-muted">
          連絡先はページ下部のフッターにあります。仕事の相談も雑談も歓迎です。
        </p>
      </FadeIn>

      {/* 奥付 */}
      <FadeIn className="mt-24 sm:mt-32">
        <footer className="border-t border-line pt-5">
          <p className="label text-fg-faint">
            このサイト — {colophon.join(" / ")}
          </p>
        </footer>
      </FadeIn>
    </div>
  );
}
