import Link from "next/link";
import { navigation, site } from "@/lib/site";

/**
 * 誌面の奥付。奥付らしく、細かい情報を小さく詰める。
 */
export function Footer() {
  return (
    <footer className="mt-24 bg-ink text-paper">
      <div className="spread py-14">
        <div className="grid gap-10 md:grid-cols-[1.2fr_1fr_1fr]">
          <div>
            <p className="display text-4xl leading-none">{site.name}</p>
            <p className="jp-serif mt-3 text-sm text-paper/70">
              {site.nameJa} — {site.role}
            </p>
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-paper/60">
              {site.tagline}
            </p>
          </div>

          <nav>
            <p className="label mb-3 text-paper/40">Contents</p>
            <ul className="space-y-1.5">
              {navigation.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className="text-sm text-paper/80 transition-colors hover:text-vermilion"
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <div>
            <p className="label mb-3 text-paper/40">Elsewhere</p>
            <ul className="space-y-1.5">
              {site.links.map((link) => (
                <li key={link.label}>
                  <a
                    href={link.href}
                    target={link.href.startsWith("http") ? "_blank" : undefined}
                    rel="noreferrer"
                    className="text-sm text-paper/80 transition-colors hover:text-vermilion"
                  >
                    {link.label} ↗
                  </a>
                </li>
              ))}
              <li>
                <Link
                  href="/feed.xml"
                  className="text-sm text-paper/80 transition-colors hover:text-vermilion"
                >
                  RSS
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-12 flex flex-wrap items-center justify-between gap-3 border-t border-paper/20 pt-5">
          <p className="label text-paper/40">
            © {site.established}— {site.fullName}
          </p>
          <p className="label text-paper/40">Printed on the web</p>
        </div>
      </div>
    </footer>
  );
}
