import { Reveal } from "@/components/motion/Reveal";
import { SectionHead } from "@/components/ui/SectionHead";
import { site } from "@/lib/site";

/**
 * 最終ページの連絡先。誌面の裏表紙のつもりで、大きく1点だけ置く。
 */
export function Contact() {
  return (
    <section className="spread py-14">
      <SectionHead index="04" title="Contact" titleJa="連絡先" />

      <Reveal className="mt-10">
        <p className="jp-serif text-lg text-ink-muted">
          お仕事のご相談、感想、なんでもどうぞ。
        </p>

        <ul className="mt-6">
          {site.links.map((link) => (
            <li key={link.label} className="border-t border-rule">
              <a
                href={link.href}
                target={link.href.startsWith("http") ? "_blank" : undefined}
                rel="noreferrer"
                className="group flex items-baseline justify-between gap-4 py-5"
              >
                <span className="display text-[clamp(2rem,7vw,4rem)] transition-colors group-hover:text-vermilion">
                  {link.label}
                </span>
                <span className="label text-ink-faint transition-colors group-hover:text-vermilion">
                  ↗
                </span>
              </a>
            </li>
          ))}
        </ul>
      </Reveal>
    </section>
  );
}
