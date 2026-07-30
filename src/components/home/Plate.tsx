import { StatusLine } from "./StatusLine";

/**
 * ヒーローの色面。サイトで唯一、色を大胆に使う場所。
 * 深海の青のグラデーションに、細い等深線を一組だけ引く
 * （かつてこのサイトが海だったことへの、小さな目配せ）。
 */
export function Plate() {
  return (
    <div className="relative overflow-hidden rounded-md bg-gradient-to-b from-plate to-plate-deep">
      {/* 等深線。中心をずらした同心の楕円 */}
      <svg
        className="absolute inset-0 h-full w-full"
        viewBox="0 0 1200 620"
        preserveAspectRatio="xMidYMid slice"
        aria-hidden="true"
      >
        {/* 2群に分け、逆向きにゆっくり漂わせる。潮の満ち引きの速さ */}
        <g
          className="contour-a"
          fill="none"
          stroke="#8fd8e0"
          strokeOpacity="0.36"
          strokeWidth="1"
        >
          {[0, 2, 4].map((i) => (
            <ellipse
              key={i}
              cx={720 + i * 26}
              cy={360 + i * 14}
              rx={560 - i * 88}
              ry={300 - i * 46}
            />
          ))}
        </g>
        <g
          className="contour-b"
          fill="none"
          stroke="#8fd8e0"
          strokeOpacity="0.36"
          strokeWidth="1"
        >
          {[1, 3, 5].map((i) => (
            <ellipse
              key={i}
              cx={720 + i * 26}
              cy={360 + i * 14}
              rx={560 - i * 88}
              ry={300 - i * 46}
            />
          ))}
        </g>
      </svg>

      <div className="relative flex min-h-[52svh] flex-col justify-between p-5 sm:p-8">
        <StatusLine />

        <p className="max-w-md text-sm leading-relaxed text-fg/90">
          アプリと Web をつくっています。
          <br />
          つくったものと、つくる途中で考えたことを置いています。
        </p>
      </div>
    </div>
  );
}
