import { Reveal } from "@/components/motion/Reveal";
import { site } from "@/lib/site";

export function Contact() {
  return (
    <section className="measure py-28 sm:py-36">
      <Reveal>
        <h2 className="label border-b border-line pb-5 text-fg-faint">
          Contact
        </h2>

        <ul>
          {site.links.map((link) => (
            <li key={link.label} className="border-b border-line">
              <a
                href={link.href}
                target={link.href.startsWith("http") ? "_blank" : undefined}
                rel="noreferrer"
                className="group flex items-center justify-between gap-6 py-8 transition-transform duration-700 ease-[var(--ease-out-expo)] hover:translate-x-2"
              >
                <span className="display text-[clamp(2.5rem,9vw,7rem)] text-fg-muted transition-colors duration-500 group-hover:text-fg">
                  {link.label}
                </span>
                <span className="label text-fg-faint transition-transform duration-500 ease-[var(--ease-out-expo)] group-hover:-translate-y-1 group-hover:translate-x-1">
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
