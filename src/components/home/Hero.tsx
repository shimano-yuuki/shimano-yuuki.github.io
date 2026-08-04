import { StatusLine } from "./StatusLine";

/**
 * スライドショーの下に置く短い自己紹介。主役は上の作品で、文字は添え物。
 * 文字はこの2〜3行とステータス行だけ。
 */
export function Hero() {
  return (
    <div className="flex flex-col justify-between gap-10 pt-20 sm:flex-row sm:items-end sm:pt-24">
      <p className="max-w-md text-sm leading-relaxed text-fg/90">
        ふだんは業務でモバイルアプリをつくっています。
        <br />
        ここには個人でつくったものと、つくる途中で考えたことを置いています。
      </p>

      <StatusLine />
    </div>
  );
}
