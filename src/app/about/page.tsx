/**
 * About — プロフィールページ。
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
import { SplitHeading } from "@/components/motion/SplitHeading";
import { site } from "@/lib/site";
import { SectionMark } from "./_components/SectionMark";

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

/* ---------------------------------------------------------------
   連絡先。site.links に、このサイト固有の RSS を足して並べる。
   --------------------------------------------------------------- */

const contacts = [
  ...site.links.map((link) => ({ label: link.label, href: link.href })),
  { label: "RSS", href: "/feed.xml" },
];

/* ========================================================================= */

export default function AboutPage() {
  return (
    <div className="measure pb-32 sm:pb-48">
      {/* 扉 */}
      <header className="pt-28 pb-24 sm:pt-40 sm:pb-36">
        <Reveal>
          <p className="label text-fg-faint">
            {site.name} — Est. {site.established}
          </p>
        </Reveal>

        <SplitHeading
          as="h1"
          lines={["About"]}
          className="display mt-10 text-[clamp(3rem,12vw,11rem)]"
        />

        <Reveal className="mt-12 flex flex-wrap items-baseline gap-x-10 gap-y-4">
          <p className="max-w-md text-base leading-loose text-fg-muted">
            {site.tagline}
          </p>
          <span className="label text-fg-faint">自己紹介</span>
        </Reveal>
      </header>

      {/* プロフィール */}
      <Reveal as="section">
        <SectionMark index="01" title="Profile" titleJa="人物" />

        <div className="mt-14 grid gap-14 md:grid-cols-[minmax(0,1fr)_minmax(0,1.35fr)] md:gap-20">
          {/* 名前 */}
          <div>
            <p className="display text-[clamp(2.25rem,8vw,4rem)]">
              {site.fullName}
            </p>
            <p className="mt-6 text-lg text-fg-muted">{site.nameJa}</p>
            <p className="label mt-3 text-fg-faint">{site.role}</p>
          </div>

          {/* 本文 */}
          <div>
            {intro.map((paragraph, index) => (
              <p
                key={index}
                className={
                  index === 0
                    ? "text-[1.0625rem] leading-[2.1] text-fg"
                    : "mt-8 text-[0.9375rem] leading-[2.1] text-fg-muted"
                }
              >
                {paragraph}
              </p>
            ))}
          </div>
        </div>
      </Reveal>

      {/* 技術 */}
      <Reveal as="section" className="pt-32 sm:pt-44">
        <SectionMark index="02" title="Skills" titleJa="技術" />

        <div className="mt-14 grid gap-16 sm:grid-cols-2 sm:gap-x-16 sm:gap-y-20">
          {skills.map((group) => (
            <div key={group.area}>
              <div className="flex items-baseline gap-4">
                <span className="label text-fg-faint">{group.area}</span>
                <span className="text-[0.6875rem] text-fg-faint">
                  {group.areaJa}
                </span>
              </div>
              <ul className="mt-6 flex flex-wrap items-baseline gap-x-8 gap-y-3">
                {group.items.map((item) => (
                  <li
                    key={item}
                    className="display-soft text-[clamp(1.25rem,4.5vw,1.875rem)]"
                  >
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </Reveal>

      {/* 年表 */}
      <Reveal as="section" className="pt-32 sm:pt-44">
        <SectionMark index="03" title="Timeline" titleJa="年譜" />

        <ol className="mt-14">
          {timeline.map((entry) => (
            <li
              key={entry.year}
              className="grid gap-x-12 gap-y-4 py-10 first:pt-0 sm:grid-cols-[7rem_minmax(0,1fr)]"
            >
              <p className="label pt-1 text-fg-faint">{entry.year}</p>
              <div>
                <h3 className="display-soft text-[clamp(1.375rem,5vw,2.125rem)]">
                  {entry.title}
                </h3>
                <p className="mt-5 max-w-xl text-sm leading-loose text-fg-muted">
                  {entry.body}
                </p>
              </div>
            </li>
          ))}
        </ol>
      </Reveal>

      {/* 連絡先 */}
      <Reveal as="section" className="pt-32 sm:pt-44">
        <SectionMark index="04" title="Contact" titleJa="連絡先" />

        <ul className="mt-14">
          {contacts.map((contact) => (
            <li key={contact.label} className="border-b border-line">
              <a
                href={contact.href}
                target={contact.href.startsWith("http") ? "_blank" : undefined}
                rel="noreferrer"
                className="group flex flex-wrap items-baseline gap-x-8 gap-y-2 py-8 sm:py-10"
              >
                <span className="display text-[clamp(2.25rem,10vw,5rem)] text-fg-muted transition-[color,transform] duration-700 ease-[var(--ease-out-expo)] group-hover:translate-x-3 group-hover:text-fg">
                  {contact.label}
                </span>
                <span className="label ml-auto min-w-0 break-all text-fg-faint transition-colors duration-500 ease-[var(--ease-out-expo)] group-hover:text-fg-muted">
                  {contact.href.replace(/^mailto:|^https?:\/\//, "")} ↗
                </span>
              </a>
            </li>
          ))}
        </ul>
      </Reveal>

      {/* 奥付（このサイトの仕様） */}
      <Reveal as="footer" className="pt-32 sm:pt-44">
        <div className="flex flex-wrap gap-x-16 gap-y-8 border-t border-line pt-6">
          <p className="label text-fg-faint">Colophon</p>
          <dl className="flex flex-wrap gap-x-12 gap-y-5">
            {colophon.map((row) => (
              <div key={row.term}>
                <dt className="label text-fg-faint">{row.term}</dt>
                <dd className="mt-2 font-mono text-[0.6875rem] tracking-wide text-fg-muted">
                  {row.value}
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </Reveal>
    </div>
  );
}
