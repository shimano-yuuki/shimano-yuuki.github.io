type TagRowProps = {
  tags: string[];
  className?: string;
};

/**
 * 記事のタグ。索引の見出し語のように並べるだけで、絞り込みは持たせていない。
 */
export function TagRow({ tags, className = "" }: TagRowProps) {
  if (tags.length === 0) return null;

  return (
    <ul className={`flex flex-wrap items-baseline gap-x-4 gap-y-1 ${className}`}>
      {tags.map((tag) => (
        <li key={tag} className="label text-ink-faint">
          {tag}
        </li>
      ))}
    </ul>
  );
}
