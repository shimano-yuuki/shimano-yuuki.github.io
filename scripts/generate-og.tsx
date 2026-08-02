/**
 * OG 画像を public/og.png に書き出す。
 *
 * GitHub Pages は拡張子で Content-Type を決めるため、Next.js の
 * opengraph-image ファイル規約（拡張子なしで書き出される）は使えない。
 * ここで .png として生成し、layout.tsx から参照する。
 * 名前や肩書きを変えたら `npm run og` で作り直すこと。
 */
import { writeFile } from "node:fs/promises";
import path from "node:path";
import { ImageResponse } from "next/og";
import { site } from "../src/lib/site";

const BG = "#000000";
const FG = "#f2f1e8";
const FG_MUTED = "#b9b7ac";
const CYAN = "#8fd8e0";

const SIZE = { width: 1200, height: 630 };

function Plate() {
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        backgroundColor: BG,
        color: FG,
        padding: 48,
      }}
    >
      {/* 左: 名前と肩書き */}
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          paddingRight: 40,
        }}
      >
        <div style={{ display: "flex", fontSize: 20, color: FG_MUTED }}>
          {site.url.replace(/^https?:\/\//, "")}
        </div>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div
            style={{
              display: "flex",
              fontSize: 76,
              fontWeight: 700,
              lineHeight: 1.05,
              letterSpacing: "0.01em",
            }}
          >
            {site.fullName.toUpperCase()}
          </div>
          <div
            style={{
              display: "flex",
              marginTop: 18,
              fontSize: 24,
              color: FG_MUTED,
            }}
          >
            {site.role}
          </div>
        </div>
        <div style={{ display: "flex", fontSize: 20, color: FG_MUTED }}>
          TOKYO, JP — STATUS : WORKING
        </div>
      </div>

      {/* 右: 深海の色面。等深線の楕円を重ねる */}
      <div
        style={{
          width: 420,
          borderRadius: 10,
          background: "linear-gradient(180deg, #0e5a78 0%, #071c2c 100%)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {[340, 250, 170, 100].map((size, index) => (
          <div
            key={index}
            style={{
              position: "absolute",
              width: size,
              height: size * 0.62,
              border: "1.5px solid " + CYAN,
              opacity: 0.4,
              borderRadius: "50%",
              transform: "translate(" + index * 8 + "px, " + index * 5 + "px)",
            }}
          />
        ))}
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
