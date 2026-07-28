import Link from "next/link";
import { Rule } from "@/components/ui/Rule";
import { site } from "@/lib/site";

/**
 * 404 — 落丁・乱丁ページ。
 * 誌面の事故を刷ってしまったときの断り書き、というつもりで組んでいる。
 */

const routes = [
  { label: "Index", labelJa: "トップ", href: "/" },
  { label: "Works", labelJa: "作品", href: "/works" },
  { label: "Journal", labelJa: "記録", href: "/blog" },
];

export default function NotFound() {
  return (
    <div className="spread py-24 sm:py-36">
      <div className="max-w-3xl">
        <p className="label text-vermilion">Error — Not Found</p>

        <p className="display mt-6 text-[clamp(5rem,26vw,14rem)] leading-none">
          404
        </p>

        <Rule weight="double" className="mt-8" animated={false} />

        <h1 className="jp-serif mt-8 text-[clamp(1.25rem,5vw,1.875rem)] leading-relaxed">
          このページは落丁のようです。
        </h1>

        <p className="mt-5 max-w-lg text-sm leading-loose text-ink-muted">
          お探しの頁は綴じられていないか、刷り直しの際に差し替えられました。
          お手数ですが、下の目次から入り直してください。
        </p>

        <nav className="mt-12 border-t border-rule">
          <ul>
            {routes.map((route, index) => (
              <li key={route.href} className="border-b border-rule-faint">
                <Link
                  href={route.href}
                  className="group flex flex-wrap items-baseline gap-x-5 gap-y-1 py-5"
                >
                  <span className="label w-8 shrink-0 text-vermilion">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <span className="display text-[clamp(1.75rem,8vw,3rem)] leading-none transition-colors group-hover:text-vermilion">
                    {route.label}
                  </span>
                  <span className="jp-serif ml-auto text-xs text-ink-muted">
                    {route.labelJa}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <p className="label mt-12 text-ink-faint">
          {site.name} — Est. {site.established}
        </p>
      </div>
    </div>
  );
}
