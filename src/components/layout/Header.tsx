import Link from "next/link";
import { site } from "@/lib/site";

/**
 * ヘッダーは1行だけ。名前と、日本語の素朴なナビ。
 * メニューのオーバーレイもハンバーガーも持たない。
 */
export function Header() {
  return (
    // relative z-10: トップでは固定背景の canvas の上に重なる
    <header className="measure relative z-10 flex items-baseline justify-between gap-6 pt-6 pb-4">
      <Link href="/" className="display text-base tracking-wide sm:text-lg">
        {site.fullName.toUpperCase()}
      </Link>

      <nav className="flex gap-5 text-sm sm:gap-7">
        <Link href="/blog" className="link-sweep transition-colors hover:text-accent">
          記録
        </Link>
        <Link href="/about" className="link-sweep transition-colors hover:text-accent">
          自己紹介
        </Link>
      </nav>
    </header>
  );
}
