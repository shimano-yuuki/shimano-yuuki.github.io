import { SplitHeading } from "@/components/motion/SplitHeading";
import { CoverPlate } from "@/components/ui/CoverPlate";
import { formatDate, type Work } from "@/lib/content";
import { site } from "@/lib/site";

/**
 * 誌面の表紙。左に大きな欧文タイトル、右に最新作のカバー。
 * 下端に発行データの1行を敷いて、雑誌の表紙まわりの情報密度を出す。
 */
export function Hero({ lead }: { lead?: Work }) {
  return (
    <section className="spread pt-8 pb-10 md:pt-14">
      <div className="grid items-end gap-8 md:grid-cols-12 md:gap-10">
        <div className="md:col-span-7">
          <p className="label text-vermilion">
            Portfolio &amp; Journal — Vol. 01
          </p>

          <SplitHeading
            as="h1"
            lines={["Software", "Engineer"]}
            className="display mt-5 text-[clamp(3.25rem,13vw,8.5rem)]"
          />

          <p className="jp-serif mt-6 max-w-md text-lg leading-relaxed text-ink-muted">
            {site.tagline}
            <br />
            つくったものと、つくる途中で考えたことを置いています。
          </p>
        </div>

        <div className="md:col-span-5">
          <CoverPlate
            src={lead?.cover || undefined}
            alt={lead ? `${lead.title} のカバー` : "カバー"}
            label={lead?.title ?? site.name}
            index="Cover"
            priority
            sizes="(min-width: 768px) 40vw, 100vw"
            className="aspect-4/5"
          />
          {lead ? (
            <p className="label mt-2 text-ink-faint">
              On the cover — {lead.title} / {formatDate(lead.date)}
            </p>
          ) : null}
        </div>
      </div>

      {/* 発行データの帯 */}
      <div className="mt-12 flex flex-wrap items-center justify-between gap-x-6 gap-y-1 border-y border-rule-faint py-2">
        <span className="label text-ink-faint">{site.nameJa}</span>
        <span className="label text-ink-faint">Tokyo, Japan</span>
        <span className="label text-ink-faint">Est. {site.established}</span>
        <span className="label text-ink-faint">Scroll ↓</span>
      </div>
    </section>
  );
}
