"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { navigation, site } from "@/lib/site";

/**
 * 誌面のマストヘッド。上部に固定し、二重罫で本文と切る。
 * ナビはオーバーレイに逃がして、常時見えるのは誌名とノンブルだけにしている。
 */
export function Header() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const close = () => setOpen(false);

  // オーバーレイ表示中は背面をスクロールさせない
  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <>
      <header className="sticky top-0 z-50 bg-paper/92 backdrop-blur-[2px]">
        <div className="spread">
          <div className="flex items-center justify-between py-3">
            <Link
              href="/"
              className="display text-xl leading-none tracking-[0.06em] sm:text-2xl"
            >
              {site.name}
            </Link>

            <span className="label hidden text-ink-faint sm:block">
              Est. {site.established} — {site.role}
            </span>

            <button
              type="button"
              onClick={() => setOpen((value) => !value)}
              aria-expanded={open}
              aria-controls="site-menu"
              className="label flex items-center gap-2 transition-colors hover:text-vermilion"
            >
              <span className="relative flex h-3 w-4 flex-col justify-between">
                <span
                  className={`h-px w-full bg-current transition-transform duration-300 ease-[var(--ease-paper)] ${open ? "translate-y-[5.5px] rotate-45" : ""}`}
                />
                <span
                  className={`h-px w-full bg-current transition-opacity duration-200 ${open ? "opacity-0" : ""}`}
                />
                <span
                  className={`h-px w-full bg-current transition-transform duration-300 ease-[var(--ease-paper)] ${open ? "-translate-y-[5.5px] -rotate-45" : ""}`}
                />
              </span>
              {open ? "Close" : "Menu"}
            </button>
          </div>
        </div>
        <div className="h-[3px] bg-rule" />
        <div className="mt-[3px] h-px bg-rule" />
      </header>

      {/* オーバーレイ目次 */}
      <div
        id="site-menu"
        inert={!open}
        className={`fixed inset-0 z-40 bg-paper transition-opacity duration-300 ease-[var(--ease-paper)] ${
          open ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
      >
        <div className="spread flex h-full flex-col justify-center pt-20 pb-12">
          <p className="label mb-8 text-ink-faint">Contents</p>
          <nav>
            <ul>
              {navigation.map((item, index) => {
                const active =
                  item.href === "/"
                    ? pathname === "/"
                    : pathname.startsWith(item.href);

                return (
                  <li key={item.href} className="border-t border-rule-faint">
                    <Link
                      href={item.href}
                      onClick={close}
                      className="group flex items-baseline gap-4 py-4 sm:gap-8 sm:py-6"
                    >
                      <span className="label w-8 shrink-0 text-vermilion">
                        {String(index + 1).padStart(2, "0")}
                      </span>
                      <span
                        className={`display text-[clamp(2.25rem,9vw,5rem)] transition-colors ${
                          active
                            ? "text-vermilion"
                            : "group-hover:text-vermilion"
                        }`}
                      >
                        {item.label}
                      </span>
                      <span className="jp-serif ml-auto hidden text-xs text-ink-muted sm:block">
                        {item.labelJa}
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>

          <ul className="mt-10 flex flex-wrap gap-x-6 gap-y-2 border-t border-rule-faint pt-6">
            {site.links.map((link) => (
              <li key={link.label}>
                <a
                  href={link.href}
                  target={link.href.startsWith("http") ? "_blank" : undefined}
                  rel="noreferrer"
                  className="label text-ink-muted transition-colors hover:text-vermilion"
                >
                  {link.label} ↗
                </a>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </>
  );
}
