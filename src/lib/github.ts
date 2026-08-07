import { execSync } from "node:child_process";

/**
 * GitHub の活動データ。すべて**ビルド時**に取得する（output: "export" の
 * 静的サイトなので、閲覧時には一切通信しない）。
 *
 * - 草（コントリビューション）: プロフィールの公開ページを取得して
 *   data-date / data-level を読む。API トークン不要
 * - このサイトの最近のコミット: リポジトリ自身の git log から読む。
 *   ネットワーク不要（Actions 側は fetch-depth: 0 で履歴ごと checkout）
 *
 * どちらも失敗したら null / [] を返し、ビルドは止めない（オフラインでも
 * `npm run build` が通ること）。鮮度は deploy.yml の毎日の定時ビルドで保つ。
 */

const GITHUB_USER = "shimano-yuuki";
const REPO = "shimano-yuuki/shimano-yuuki.github.io";

export type ContributionDay = { date: string; level: number };
export type Contributions = { total: number; days: ContributionDay[] };
export type RepoCommit = { sha: string; date: string; message: string; url: string };

export async function getContributions(): Promise<Contributions | null> {
  try {
    const res = await fetch(
      `https://github.com/users/${GITHUB_USER}/contributions`,
      { headers: { "user-agent": "shimano-site-build" } },
    );
    if (!res.ok) return null;
    const html = await res.text();

    const days: ContributionDay[] = [];
    for (const tag of html.match(/<td[^>]*data-date="[^"]+"[^>]*>/g) ?? []) {
      const date = tag.match(/data-date="(\d{4}-\d{2}-\d{2})"/)?.[1];
      const level = tag.match(/data-level="(\d)"/)?.[1];
      if (date && level !== undefined) days.push({ date, level: Number(level) });
    }
    if (days.length === 0) return null;
    days.sort((a, b) => (a.date < b.date ? -1 : 1));

    const total = Number(
      html
        .match(/([\d,]+)\s+contributions?\s+in the last year/)?.[1]
        ?.replaceAll(",", "") ?? 0,
    );
    return { total, days };
  } catch {
    return null;
  }
}

/** このリポジトリ自身の最近のコミット。 */
export function getRecentCommits(limit = 5): RepoCommit[] {
  try {
    const log = execSync(
      `git log -n ${limit} --pretty=format:%H%x09%cI%x09%s`,
      { encoding: "utf8" },
    );
    return log
      .split("\n")
      .filter(Boolean)
      .map((line) => {
        const [sha, date, ...message] = line.split("\t");
        return {
          sha,
          date: date.slice(0, 10),
          message: message.join("\t"),
          url: `https://github.com/${REPO}/commit/${sha}`,
        };
      });
  } catch {
    return [];
  }
}

export const githubProfileUrl = `https://github.com/${GITHUB_USER}`;
