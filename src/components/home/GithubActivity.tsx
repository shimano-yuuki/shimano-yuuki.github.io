import { FadeIn } from "@/components/FadeIn";
import { formatDate } from "@/lib/content";
import type { Contributions, RepoCommit } from "@/lib/github";
import { githubProfileUrl } from "@/lib/github";

/**
 * ホーム下部の「活動」。GitHub の草（直近1年のコントリビューション）と、
 * このサイト自身の最近のコミットを載せる。データはビルド時に取得済みで、
 * ここは受け取って描くだけ（閲覧時の通信なし）。
 *
 * 草は白地に青の5段階。数字と日付の文字は DOM 側の階層色を使い、
 * 升目そのものは絵（情報グラフィック）として扱う。
 */

/** 草の升目の色。薄い → 濃い青（accent #1e40af 相当まで） */
const LEVEL_COLORS = ["#eef1f6", "#c9daf1", "#92b6e4", "#4f83c8", "#1e40af"];

const CELL = 11;
const PITCH = CELL + 2;
const LABEL_H = 16;

const DAY_MS = 24 * 60 * 60 * 1000;

function utc(date: string): number {
  return Date.parse(`${date}T00:00:00Z`);
}

function ContributionGraph({ contributions }: { contributions: Contributions }) {
  const { days } = contributions;

  // GitHub のカレンダーと同じく、日曜始まりの週を列にする
  const first = utc(days[0].date);
  const firstSunday = first - new Date(first).getUTCDay() * DAY_MS;
  const weekOf = (date: string) =>
    Math.floor((utc(date) - firstSunday) / (7 * DAY_MS));
  const weeks = weekOf(days[days.length - 1].date) + 1;

  // 月替わりの列にだけ月ラベルを置く
  const monthLabels: { week: number; label: string }[] = [];
  let lastMonth = -1;
  for (const day of days) {
    const month = new Date(utc(day.date)).getUTCMonth();
    if (month !== lastMonth) {
      const week = weekOf(day.date);
      const prev = monthLabels[monthLabels.length - 1];
      // 前のラベルと近すぎる（重なる）ときは置かない
      if (!prev || week - prev.week >= 3) {
        monthLabels.push({ week, label: `${month + 1}月` });
      }
      lastMonth = month;
    }
  }

  const width = weeks * PITCH - 2;
  const height = LABEL_H + 7 * PITCH - 2;

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      role="img"
      aria-label={`直近1年のコントリビューション ${contributions.total} 件`}
      className="block"
    >
      {monthLabels.map(({ week, label }) => (
        <text
          key={`${week}-${label}`}
          x={week * PITCH}
          y={10}
          className="fill-fg-muted font-mono text-[10px]"
        >
          {label}
        </text>
      ))}
      {days.map((day) => (
        <rect
          key={day.date}
          x={weekOf(day.date) * PITCH}
          y={LABEL_H + new Date(utc(day.date)).getUTCDay() * PITCH}
          width={CELL}
          height={CELL}
          rx={2.5}
          fill={LEVEL_COLORS[day.level] ?? LEVEL_COLORS[0]}
        >
          <title>{day.date}</title>
        </rect>
      ))}
    </svg>
  );
}

export function GithubActivity({
  contributions,
  commits,
}: {
  contributions: Contributions | null;
  commits: RepoCommit[];
}) {
  if (!contributions && commits.length === 0) return null;

  return (
    <section className="measure mt-20" aria-label="GitHub の活動">
      <div className="mb-2 flex items-baseline justify-between gap-6">
        <h2 className="text-sm text-fg-faint">活動 — GitHub</h2>
        <a
          href={githubProfileUrl}
          target="_blank"
          rel="noreferrer noopener"
          className="link-sweep text-sm text-fg-muted transition-colors hover:text-accent"
        >
          GitHub で見る
        </a>
      </div>

      {contributions ? (
        <FadeIn className="border-t border-line pt-5">
          <p className="text-sm text-fg-muted">
            直近1年のコントリビューション
            <span className="label ml-3 text-fg">{contributions.total} 件</span>
          </p>
          {/* 1年分の横幅はモバイルに収まらないので、升目側だけ横スクロール */}
          <div className="mt-4 overflow-x-auto pb-1">
            <ContributionGraph contributions={contributions} />
          </div>
        </FadeIn>
      ) : null}

      {commits.length > 0 ? (
        <div className={contributions ? "mt-10" : undefined}>
          <h3 className="mb-2 text-sm text-fg-faint">このサイトの最近の更新</h3>
          <ul>
            {commits.map((commit, index) => (
              <FadeIn
                as="li"
                key={commit.sha}
                delay={Math.min(index, 5) * 70}
                className="border-t border-line"
              >
                <a
                  href={commit.url}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="group flex flex-wrap items-baseline gap-x-6 gap-y-1 py-4"
                >
                  <time dateTime={commit.date} className="label text-fg-faint">
                    {formatDate(commit.date)}
                  </time>
                  <span className="transition-colors group-hover:text-accent">
                    {commit.message}
                  </span>
                </a>
              </FadeIn>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
}
