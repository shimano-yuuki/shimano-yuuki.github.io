import Link from "next/link";
import { navigation, site } from "@/lib/site";

export function Footer() {
  return (
    // 海の上に乗るので、自前で層と地色を持つ
    <footer className="relative z-10 mt-32 border-t border-line bg-black/55 backdrop-blur-[2px]">
      <div className="measure py-16">
        <div className="grid gap-12 md:grid-cols-[1.4fr_1fr_1fr]">
          <div>
            <p className="display text-[clamp(2.5rem,7vw,4.5rem)] leading-none">
              {site.name}
            </p>
            <p className="mt-4 text-sm text-fg-muted">
              {site.nameJa} — {site.role}
            </p>
          </div>

          <nav>
            <p className="label mb-4 text-fg-faint">Index</p>
            <ul className="space-y-2">
              {navigation.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className="underline-sweep text-sm text-fg-muted transition-colors hover:text-fg"
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <div>
            <p className="label mb-4 text-fg-faint">Elsewhere</p>
            <ul className="space-y-2">
              {site.links.map((link) => (
                <li key={link.label}>
                  <a
                    href={link.href}
                    target={link.href.startsWith("http") ? "_blank" : undefined}
                    rel="noreferrer"
                    className="underline-sweep text-sm text-fg-muted transition-colors hover:text-fg"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
              <li>
                {/* feed.xml はページではなく静的ファイル。Link にすると
                    Next が存在しない RSC ペイロードを先読みして 404 になる。 */}
                <a
                  href="/feed.xml"
                  className="underline-sweep text-sm text-fg-muted transition-colors hover:text-fg"
                >
                  RSS
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-16 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-6">
          <p className="label text-fg-faint">
            © {site.established} {site.fullName}
          </p>
          <p className="label text-fg-faint">Built with WebGL</p>
        </div>
      </div>
    </footer>
  );
}
