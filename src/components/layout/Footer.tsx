import { site } from "@/lib/site";

/**
 * フッターは連絡先と署名だけ。
 */
export function Footer() {
  return (
    <footer className="measure mt-28 border-t border-line pt-6 pb-10">
      <div className="flex flex-wrap items-baseline justify-between gap-x-8 gap-y-3">
        <ul className="flex flex-wrap gap-x-6 gap-y-1 text-sm">
          {site.links.map((link) => (
            <li key={link.label}>
              <a
                href={link.href}
                target={link.href.startsWith("http") ? "_blank" : undefined}
                rel="noreferrer"
                className="underline decoration-cyan underline-offset-4 transition-colors hover:text-cyan"
              >
                {link.label}
              </a>
            </li>
          ))}
          <li>
            {/* feed.xml はページではなく静的ファイルなので <a> で書く */}
            <a
              href="/feed.xml"
              className="underline decoration-cyan underline-offset-4 transition-colors hover:text-cyan"
            >
              RSS
            </a>
          </li>
        </ul>

        <p className="label text-fg-faint">
          © {site.established} {site.fullName}
        </p>
      </div>
    </footer>
  );
}
