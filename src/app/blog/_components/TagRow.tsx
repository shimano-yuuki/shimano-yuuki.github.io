type TagRowProps = {
  tags: string[];
  className?: string;
  /** 明るさだけで前後関係をつける。扉では muted、行の中では faint。 */
  tone?: "muted" | "faint";
};

/**
 * 記事のタグ。囲みも背景も持たせず、小さな欧文ラベルの並びとして置くだけにする。
 */
export function TagRow({ tags, className = "", tone = "muted" }: TagRowProps) {
  if (tags.length === 0) return null;

  return (
    <ul className={`flex flex-wrap items-center gap-x-4 gap-y-1 ${className}`}>
      {tags.map((tag, index) => (
        <li
          key={tag}
          className={`label flex items-center gap-4 ${
            tone === "muted" ? "text-fg-muted" : "text-fg-faint"
          }`}
        >
          {tag}
          {index < tags.length - 1 ? (
            <span
              aria-hidden="true"
              className="h-px w-3 bg-current opacity-40"
            />
          ) : null}
        </li>
      ))}
    </ul>
  );
}
