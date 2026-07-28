/**
 * OG 画像を public/og.png に書き出す。
 *
 * Next.js の opengraph-image.tsx（ファイル規約）は、静的書き出しすると
 * 拡張子なしのファイルになる。GitHub Pages は拡張子で Content-Type を
 * 決めるため、そのままだと SNS がサムネイルとして認識してくれない。
 * そこでビルド前にここで .png として書き出し、layout.tsx から参照している。
 *
 * 名前や肩書きを変えたら `npm run og` で作り直すこと。
 */
import { writeFile } from "node:fs/promises";
import path from "node:path";
import { ImageResponse } from "next/og";
import { site } from "../src/lib/site";

const PAPER = "#F4F1EA";
const INK = "#14110F";
const INK_MUTED = "#5B554C";
const VERMILION = "#C8452E";

const SIZE = { width: 1200, height: 630 };

function Plate() {
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        backgroundColor: PAPER,
        color: INK,
        padding: "64px 72px",
      }}
    >
      {/* 天の罫。太罫＋細罫の二重罫。 */}
      <div style={{ display: "flex", flexDirection: "column" }}>
        <div style={{ height: 3, backgroundColor: INK }} />
        <div style={{ height: 1, marginTop: 4, backgroundColor: INK }} />
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            marginTop: 20,
            fontSize: 20,
            letterSpacing: "0.22em",
            textTransform: "uppercase",
            color: INK_MUTED,
          }}
        >
          <div style={{ display: "flex" }}>{site.name}</div>
          <div style={{ display: "flex" }}>Portfolio &amp; Journal</div>
        </div>
      </div>

      {/* 中央左寄せの誌名 */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-start",
        }}
      >
        <div
          style={{
            display: "flex",
            fontSize: 110,
            lineHeight: 1.05,
            letterSpacing: "-0.02em",
          }}
        >
          {site.fullName}
        </div>
        <div
          style={{
            display: "flex",
            marginTop: 24,
            fontSize: 30,
            letterSpacing: "0.16em",
            textTransform: "uppercase",
            color: INK_MUTED,
          }}
        >
          {site.role}
        </div>
      </div>

      {/* 地の罫と、右下の朱ラベル */}
      <div style={{ display: "flex", flexDirection: "column" }}>
        <div style={{ height: 1, backgroundColor: INK }} />
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginTop: 20,
            fontSize: 20,
            letterSpacing: "0.2em",
            textTransform: "uppercase",
            color: INK_MUTED,
          }}
        >
          <div style={{ display: "flex" }}>
            {site.url.replace(/^https?:\/\//, "")}
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              color: VERMILION,
              letterSpacing: "0.24em",
            }}
          >
            {`EST. ${site.established}`}
          </div>
        </div>
      </div>
    </div>
  );
}

async function main() {
  const image = new ImageResponse(<Plate />, SIZE);
  const output = path.join(process.cwd(), "public", "og.png");
  await writeFile(output, Buffer.from(await image.arrayBuffer()));
  console.log(`wrote ${output} (${SIZE.width}x${SIZE.height})`);
}

main();
