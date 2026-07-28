import rehypeAutolinkHeadings, {
  type Options as AutolinkOptions,
} from "rehype-autolink-headings";
import rehypePrettyCode from "rehype-pretty-code";
import rehypeRaw from "rehype-raw";
import rehypeSlug from "rehype-slug";
import rehypeStringify from "rehype-stringify";
import remarkGfm from "remark-gfm";
import remarkParse from "remark-parse";
import remarkRehype from "remark-rehype";
import { unified } from "unified";

export type Heading = { id: string; text: string; depth: 2 | 3 };

/** 見出しの右に小さな「§」を置き、hover で見えるようにする。 */
const autolinkOptions: AutolinkOptions = {
  behavior: "append",
  properties: {
    className: ["heading-anchor"],
    ariaHidden: "true",
    tabIndex: -1,
  },
  content: {
    type: "element",
    tagName: "span",
    properties: {},
    children: [{ type: "text", value: "§" }],
  },
};

const processor = unified()
  .use(remarkParse)
  .use(remarkGfm)
  .use(remarkRehype, { allowDangerousHtml: true })
  .use(rehypeRaw)
  .use(rehypeSlug)
  .use(rehypeAutolinkHeadings, autolinkOptions)
  .use(rehypePrettyCode, {
    theme: "github-light",
    keepBackground: false,
  })
  .use(rehypeStringify, { allowDangerousHtml: true });

/** Markdown 本文を HTML 文字列に変換する。ビルド時にだけ走る。 */
export async function renderMarkdown(source: string): Promise<string> {
  const file = await processor.process(source);
  return String(file);
}

/**
 * 目次用に h2 / h3 を拾う。
 * HTML を組み立てたあとに正規表現で拾うより、素の Markdown を見たほうが崩れにくい。
 */
export function extractHeadings(source: string): Heading[] {
  const headings: Heading[] = [];
  let insideFence = false;

  for (const line of source.split("\n")) {
    if (/^\s*(```|~~~)/.test(line)) {
      insideFence = !insideFence;
      continue;
    }
    if (insideFence) continue;

    const match = /^(#{2,3})\s+(.+?)\s*#*\s*$/.exec(line);
    if (!match) continue;

    const text = match[2]
      .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1") // リンクは表示文字だけ残す
      .replace(/[*_`]/g, "")
      .trim();

    headings.push({ id: slugify(text), text, depth: match[1].length as 2 | 3 });
  }

  return headings;
}

/** rehype-slug (github-slugger) と同じ結果になるようにしている。 */
function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[\s\t\n]+/g, "-")
    .replace(/[!-/:-@[-`{-~]/g, "")
    .replace(/^-+|-+$/g, "");
}
