import Link from "next/link";
import { navigation } from "@/lib/site";

/**
 * 404 — 静かに一行で伝えて、戻り道を添えるだけ。
 */

/** 戻り先。About 自身は出さず、主要な 3 つだけに絞る。 */
const routes = navigation.filter((item) => item.href !== "/about");

export default function NotFound() {
  return (
    <div className="measure flex min-h-[70svh] flex-col justify-center py-24 sm:py-32">
      <h1 className="text-2xl font-bold text-fg">
        404 — ページが見つかりません
      </h1>

      <p className="mt-6 max-w-[40rem] text-sm leading-loose text-fg-muted">
        お探しのページは移動したか、削除された可能性があります。
        下のリンクから入り直してください。
      </p>

      <nav className="mt-12">
        <ul className="flex flex-wrap gap-x-8 gap-y-3">
          {routes.map((route) => (
            <li key={route.href}>
              <Link
                href={route.href}
                className="text-sm text-fg underline decoration-cyan underline-offset-4 transition-colors hover:text-cyan"
              >
                {route.labelJa}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
}
