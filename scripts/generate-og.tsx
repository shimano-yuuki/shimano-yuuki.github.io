/**
 * OG 画像を public/og.png に書き出す。
 *
 * Next.js の opengraph-image.tsx（ファイル規約）は、静的書き出しすると
 * 拡張子なしのファイルになる。GitHub Pages は拡張子で Content-Type を
 * 決めるため、そのままだと SNS がサムネイルとして認識してくれない。
 * そこでここで .png として書き出し、layout.tsx から参照している。
 *
 * 名前や肩書きを変えたら `npm run og` で作り直すこと。
 */
import { writeFile } from "node:fs/promises";
import path from "node:path";
import { ImageResponse } from "next/og";
import { site } from "../src/lib/site";

const VOID = "#000000";
const FG = "#ffffff";
const FG_MUTED = "#8a8a8a";
const FG_FAINT = "#5a5a5a";
const LINE = "#1f1f1f";

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
        backgroundColor: VOID,
        color: FG,
        padding: "56px 64px",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          fontSize: 19,
          letterSpacing: "0.2em",
          textTransform: "uppercase",
          color: FG_MUTED,
        }}
      >
        <div style={{ display: "flex" }}>{site.name}</div>
        <div style={{ display: "flex" }}>Portfolio &amp; Journal</div>
      </div>

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
            fontSize: 132,
            fontWeight: 800,
            lineHeight: 1,
            letterSpacing: "-0.045em",
          }}
        >
          {site.fullName}
        </div>
        <div
          style={{
            display: "flex",
            marginTop: 26,
            fontSize: 27,
            letterSpacing: "0.14em",
            textTransform: "uppercase",
            color: FG_MUTED,
          }}
        >
          {site.role}
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column" }}>
        <div style={{ height: 1, backgroundColor: LINE }} />
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            marginTop: 20,
            fontSize: 19,
            letterSpacing: "0.18em",
            textTransform: "uppercase",
            color: FG_FAINT,
          }}
        >
          <div style={{ display: "flex" }}>
            {site.url.replace(/^https?:\/\//, "")}
          </div>
          <div style={{ display: "flex" }}>{`Est. ${site.established}`}</div>
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
