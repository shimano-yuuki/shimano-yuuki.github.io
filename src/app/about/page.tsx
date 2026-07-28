/**
 * About — 誌面の「プロフィール」ページ。
 *
 * ============================================================
 *  差し替えるのはこのファイルの上半分だけで済むようにしてある。
 * ------------------------------------------------------------
 *  1. INTRO       … 自己紹介の本文（2〜3段落）。仮テキスト。
 *  2. SKILLS      … 領域ごとの技術。区分（area）ごと追加・削除して良い。
 *  3. TIMELINE    … 年表。新しい順に並べて書く。
 *  4. COLOPHON    … このサイト自体の仕様書き。制作環境を変えたら直す。
 *
 *  名前・肩書き・連絡先は src/lib/site.ts が出どころなので、
 *  ここでは触らない（site.fullName / site.nameJa / site.role / site.links）。
 * ============================================================
 */

import type { Metadata } from "next";
import { Reveal } from "@/components/motion/Reveal";
import { Rule } from "@/components/ui/Rule";
import { SectionHead } from "@/components/ui/SectionHead";
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
    area: "Mobile",
    areaJa: "モバイル",
    items: ["Flutter", "Dart", "Riverpod", "Firebase"],
  },
  {
    area: "Web",
    areaJa: "ウェブ",
    items: ["TypeScript", "React", "Next.js", "Tailwind CSS", "GSAP"],
  },
  {
    area: "Backend",
    areaJa: "サーバー",
    items: ["Node.js", "Supabase", "PostgreSQL", "REST / JSON"],
  },
  {
    area: "Tools",
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
   4. COLOPHON — このサイトの仕様。
   --------------------------------------------------------------- */

const colophon = [
  { term: "Framework", value: "Next.js (App Router)" },
  { term: "Styling", value: "Tailwind CSS" },
  { term: "Motion", value: "GSAP / Lenis" },
  { term: "Content", value: "Markdown" },
  { term: "Hosting", value: "Vercel" },
];

/* ========================================================================= */

export default function AboutPage() {
  return (
    <div className="spread pb-8">
      {/* 扉 */}
      <Reveal as="header" className="pt-12 pb-10 sm:pt-20 sm:pb-14">
        <p className="label text-ink-faint">
          Est. {site.established} — {site.name}
        </p>
        <div className="mt-5 flex flex-wrap items-baseline gap-x-6 gap-y-2">
          <h1 className="display text-[clamp(3.25rem,15vw,8.5rem)] leading-none">
            About
          </h1>
          <p className="jp-serif text-sm text-ink-muted">自己紹介</p>
        </div>
        <p className="jp-serif mt-6 max-w-xl text-base leading-loose text-ink-muted">
          {site.tagline}
        </p>
      </Reveal>

      {/* プロフィール */}
      <Reveal as="section" className="pt-4">
        <SectionHead index="01" title="Profile" titleJa="人物" />

        <div className="mt-8 grid gap-8 md:grid-cols-[16rem_1fr] md:gap-12">
          {/* 名前の柱 */}
          <div className="border-t border-rule pt-4 md:border-t-0 md:pt-0">
            <p className="display text-[clamp(1.75rem,6vw,2.5rem)] leading-tight">
              {site.fullName}
            </p>
            <p className="jp-serif mt-2 text-lg">{site.nameJa}</p>
            <p className="label mt-4 text-vermilion">{site.role}</p>
          </div>

          {/* 本文 */}
          <div className="border-t border-rule-faint pt-6 md:border-t-0 md:pt-0">
            {intro.map((paragraph, index) => (
              <p
                key={index}
                className={`text-[0.9375rem] leading-loose text-ink ${
                  index === 0 ? "" : "mt-6"
                }`}
              >
                {paragraph}
              </p>
            ))}
          </div>
        </div>
      </Reveal>

      {/* 技術 */}
      <Reveal as="section" className="pt-20">
        <SectionHead index="02" title="Skills" titleJa="技術" />

        <dl className="mt-8 border-t border-rule">
          {skills.map((group) => (
            <div
              key={group.area}
              className="grid gap-x-10 gap-y-2 border-b border-rule-faint py-5 sm:grid-cols-[12rem_1fr]"
            >
              <dt className="flex items-baseline gap-3">
                <span className="label text-vermilion">{group.area}</span>
                <span className="jp-serif text-xs text-ink-faint">
                  {group.areaJa}
                </span>
              </dt>
              <dd className="flex flex-wrap items-baseline gap-x-6 gap-y-2">
                {group.items.map((item) => (
                  <span key={item} className="text-sm text-ink">
                    {item}
                  </span>
                ))}
              </dd>
            </div>
          ))}
        </dl>
      </Reveal>

      {/* 年表 */}
      <Reveal as="section" className="pt-20">
        <SectionHead index="03" title="Timeline" titleJa="年譜" />

        <ol className="mt-8 border-t border-rule">
          {timeline.map((entry) => (
            <li
              key={entry.year}
              className="grid gap-x-10 gap-y-2 border-b border-rule-faint py-6 sm:grid-cols-[12rem_1fr]"
            >
              <p className="label text-ink-faint">{entry.year}</p>
              <div>
                <p className="jp-serif text-base leading-snug">{entry.title}</p>
                <p className="mt-2 text-sm leading-loose text-ink-muted">
                  {entry.body}
                </p>
              </div>
            </li>
          ))}
        </ol>
      </Reveal>

      {/* 連絡先 */}
      <Reveal as="section" className="pt-20">
        <SectionHead index="04" title="Contact" titleJa="連絡先" />

        <ul className="mt-8 border-t border-rule">
          {site.links.map((link) => (
            <li key={link.label} className="border-b border-rule-faint">
              <a
                href={link.href}
                target={link.href.startsWith("http") ? "_blank" : undefined}
                rel="noreferrer"
                className="group flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 py-5"
              >
                <span className="display text-2xl transition-colors group-hover:text-vermilion sm:text-3xl">
                  {link.label}
                </span>
                <span className="label min-w-0 break-all text-ink-muted">
                  {link.href.replace(/^mailto:|^https?:\/\//, "")} ↗
                </span>
              </a>
            </li>
          ))}
          <li className="border-b border-rule-faint">
            <a
              href="/feed.xml"
              className="group flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 py-5"
            >
              <span className="display text-2xl transition-colors group-hover:text-vermilion sm:text-3xl">
                RSS
              </span>
              <span className="label min-w-0 break-all text-ink-muted">
                feed.xml ↗
              </span>
            </a>
          </li>
        </ul>
      </Reveal>

      {/* 奥付（このサイトの仕様） */}
      <Reveal as="section" className="pt-20">
        <Rule weight="hair" />
        <div className="mt-6 grid gap-6 sm:grid-cols-[12rem_1fr] sm:gap-10">
          <p className="label text-ink-faint">Colophon</p>
          <dl className="flex flex-wrap gap-x-10 gap-y-3">
            {colophon.map((row) => (
              <div key={row.term}>
                <dt className="label text-ink-faint">{row.term}</dt>
                <dd className="mt-1 text-sm text-ink-muted">{row.value}</dd>
              </div>
            ))}
          </dl>
        </div>
      </Reveal>
    </div>
  );
}
