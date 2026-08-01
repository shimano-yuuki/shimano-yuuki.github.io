import { StatusLine } from "./StatusLine";

/**
 * ヒーロー。色面は敷かず、最初の1画面は背景の水槽をそのまま見せる。
 * 文字はステータス行と自己紹介の2つだけ。水槽が主役、文字は添え物。
 */
export function Hero() {
  return (
    <div className="flex min-h-[62svh] flex-col justify-between pt-6 pb-10 sm:pt-10">
      <StatusLine />

      <p className="max-w-md text-sm leading-relaxed text-fg/90">
        アプリと Web をつくっています。
        <br />
        つくったものと、つくる途中で考えたことを置いています。
      </p>
    </div>
  );
}
