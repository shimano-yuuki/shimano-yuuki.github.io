/**
 * About ページ専用の区分見出し。
 * 髪の毛一本の罫と小さなラベルだけ。見出しそのものは大きくせず、
 * 下に来る内容（名前・技術名・年譜）に大きさを譲る役目にしている。
 */

type SectionMarkProps = {
  /** 通し番号。"01" のように 2 桁で渡す。 */
  index: string;
  title: string;
  titleJa: string;
};

export function SectionMark({ index, title, titleJa }: SectionMarkProps) {
  return (
    <div className="flex items-baseline gap-4 border-t border-line pt-5">
      <span className="label text-fg-faint">{index}</span>
      <h2 className="label text-fg">{title}</h2>
      <span className="ml-auto text-[0.6875rem] text-fg-faint">{titleJa}</span>
    </div>
  );
}
