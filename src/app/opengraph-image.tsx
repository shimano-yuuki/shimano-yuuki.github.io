import { ImageResponse } from "next/og";
import { site } from "@/lib/site";

/**
 * サイト共通の OG 画像。誌面の扉のつもりで、罫線と文字だけで組む。
 * ImageResponse は Satori なので Tailwind も globals.css も効かない。
 * すべてインラインの style で書き、複数の子を持つ要素には display を明示する。
 * 日本語はフォントを読み込んでいないので使わない。
 */

export const alt = `${site.fullName} — ${site.role}`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const PAPER = "#F4F1EA";
const INK = "#14110F";
const INK_MUTED = "#5B554C";
const VERMILION = "#C8452E";

export default function Image() {
  return new ImageResponse(
    (
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
    ),
    { ...size },
  );
}
