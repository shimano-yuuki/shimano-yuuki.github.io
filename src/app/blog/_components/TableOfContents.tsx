import type { Heading } from "@/lib/markdown";

type TableOfContentsProps = {
  headings: Heading[];
  className?: string;
};

/**
 * 本文の h2 / h3 から起こす目次。
 * 広い画面では本文の右に添えて sticky に、狭い画面では本文の前に置く。
 */
export function TableOfContents({
  headings,
  className = "",
}: TableOfContentsProps) {
  return (
    <nav aria-labelledby="toc-heading" className={className}>
      <h2 id="toc-heading" className="label text-ink-faint">
        Contents
      </h2>
      <ol className="mt-3">
        {headings.map((heading, index) => (
          <li
            key={`${heading.id}-${index}`}
            className={`mt-1.5 ${heading.depth === 3 ? "pl-4" : ""}`}
          >
            <a
              href={`#${heading.id}`}
              className="jp-serif block text-sm leading-relaxed break-words text-ink-muted transition-colors hover:text-vermilion"
            >
              {heading.text}
            </a>
          </li>
        ))}
      </ol>
    </nav>
  );
}
