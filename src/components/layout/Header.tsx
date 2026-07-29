"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { navigation, site } from "@/lib/site";

/**
 * 最小限のナビ。常時見えるのは名前とトグルだけで、目次は全画面に開く。
 */
export function Header() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const close = () => setOpen(false);

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
      <header className="fixed inset-x-0 top-0 z-50 mix-blend-difference">
        <div className="measure flex items-center justify-between py-5">
          <Link
            href="/"
            className="display text-sm tracking-[0.24em] text-white uppercase"
          >
            {site.name}
          </Link>

          <button
            type="button"
            onClick={() => setOpen((value) => !value)}
            aria-expanded={open}
            aria-controls="site-menu"
            className="label flex items-center gap-2.5 text-white"
          >
            <span className="relative flex h-[9px] w-4 flex-col justify-between">
              <span
                className={`h-px w-full bg-current transition-transform duration-500 ease-[var(--ease-out-expo)] ${open ? "translate-y-[4px] rotate-45" : ""}`}
              />
              <span
                className={`h-px w-full bg-current transition-transform duration-500 ease-[var(--ease-out-expo)] ${open ? "-translate-y-[4px] -rotate-45" : ""}`}
              />
            </span>
            {open ? "Close" : "Menu"}
          </button>
        </div>
      </header>

      <div
        id="site-menu"
        inert={!open}
        className={`fixed inset-0 z-40 bg-void transition-opacity duration-500 ease-[var(--ease-out-expo)] ${
          open ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
      >
        <div className="measure flex h-full flex-col justify-center pt-24 pb-14">
          <nav>
            <ul>
              {navigation.map((item, index) => {
                const active =
                  item.href === "/"
                    ? pathname === "/"
                    : pathname.startsWith(item.href);

                return (
                  <li key={item.href} className="border-t border-line">
                    <Link
                      href={item.href}
                      onClick={close}
                      className="group flex items-center gap-5 py-4 sm:gap-10 sm:py-6"
                    >
                      <span className="label w-7 shrink-0 text-fg-faint">
                        {String(index + 1).padStart(2, "0")}
                      </span>
                      <span
                        className={`display text-[clamp(2.5rem,10vw,6.5rem)] transition-all duration-500 ease-[var(--ease-out-expo)] group-hover:translate-x-3 ${
                          active ? "text-fg" : "text-fg-muted group-hover:text-fg"
                        }`}
                      >
                        {item.label}
                      </span>
                      <span className="ml-auto hidden text-xs text-fg-faint sm:block">
                        {item.labelJa}
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>

          <ul className="mt-10 flex flex-wrap gap-x-8 gap-y-2 border-t border-line pt-6">
            {site.links.map((link) => (
              <li key={link.label}>
                <a
                  href={link.href}
                  target={link.href.startsWith("http") ? "_blank" : undefined}
                  rel="noreferrer"
                  className="label underline-sweep text-fg-muted transition-colors hover:text-fg"
                >
                  {link.label}
                </a>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </>
  );
}
