import Link from "next/link";
import { navigation, site } from "@/lib/site";

/**
 * 404 — 黒地に巨大な数字だけ。
 * 説明は最小限にして、戻り道のリンクを大きく置いている。
 */

/** 戻り先。About 自身は出さず、主要な 3 つだけに絞る。 */
const routes = navigation.filter((item) => item.href !== "/about");

export default function NotFound() {
  return (
    <div className="measure flex min-h-[85svh] flex-col justify-center py-28 sm:py-40">
      <p className="label text-fg-faint">Error — 404</p>

      <p className="display mt-8 text-[clamp(6rem,30vw,20rem)] sm:mt-12">404</p>

      <p className="mt-12 text-base text-fg-muted sm:mt-16">
        ページが見つかりません。
      </p>
      <p className="mt-4 max-w-md text-sm leading-loose text-fg-faint">
        お探しのページは移動したか、削除された可能性があります。
        お手数ですが、下のリンクから入り直してください。
      </p>

      <nav className="mt-20 sm:mt-28">
        <ul>
          {routes.map((route, index) => (
            <li key={route.href} className="border-t border-line last:border-b">
              <Link
                href={route.href}
                className="group flex flex-wrap items-baseline gap-x-6 gap-y-1 py-7 sm:py-8"
              >
                <span className="label w-8 flex-none text-fg-faint transition-colors duration-500 group-hover:text-fg">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <span className="display text-[clamp(1.875rem,8vw,3.5rem)] text-fg-muted transition-[color,transform] duration-700 ease-[var(--ease-out-expo)] group-hover:translate-x-3 group-hover:text-fg">
                  {route.label}
                </span>
                <span className="ml-auto text-[0.6875rem] text-fg-faint">
                  {route.labelJa}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      <p className="label mt-20 text-fg-faint sm:mt-28">
        {site.name} — Est. {site.established}
      </p>
    </div>
  );
}
