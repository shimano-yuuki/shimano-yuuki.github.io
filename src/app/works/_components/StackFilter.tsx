"use client";

type StackFilterProps = {
  tags: string[];
  active: string | null;
  onChange: (tag: string | null) => void;
  /** 絞り込み結果の件数表示。 */
  shown: number;
  total: number;
};

/**
 * 技術タグの絞り込み。枠を持たせず、選択中だけ白面に反転させる。
 */
export function StackFilter({
  tags,
  active,
  onChange,
  shown,
  total,
}: StackFilterProps) {
  if (tags.length === 0) return null;

  return (
    <div className="flex flex-col gap-6 md:flex-row md:items-baseline md:gap-12">
      <h2 className="label pt-2 text-fg-faint md:w-24">Filter</h2>

      <div className="min-w-0 flex-1">
        <ul className="-mx-2.5 flex flex-wrap">
          <li>
            <FilterButton
              label="All"
              active={active === null}
              onClick={() => onChange(null)}
            />
          </li>
          {tags.map((tag) => (
            <li key={tag}>
              <FilterButton
                label={tag}
                active={active === tag}
                onClick={() => onChange(active === tag ? null : tag)}
              />
            </li>
          ))}
        </ul>

        <p className="label mt-6 text-fg-faint" aria-live="polite">
          {String(shown).padStart(2, "0")} / {String(total).padStart(2, "0")}{" "}
          Works
        </p>
      </div>
    </div>
  );
}

function FilterButton({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`label px-2.5 py-2 transition-all duration-500 ease-[var(--ease-out-expo)] ${
        active
          ? "bg-fg text-void"
          : "text-fg-faint hover:bg-surface-raised hover:text-fg"
      }`}
    >
      {label}
    </button>
  );
}
