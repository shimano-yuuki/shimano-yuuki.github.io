import Image from "next/image";

type CoverPlateProps = {
  src?: string;
  alt: string;
  /** 画像がないときに版面へ刷る文字。 */
  label: string;
  index?: string;
  className?: string;
  priority?: boolean;
  sizes?: string;
};

/**
 * 作品・記事のカバー。
 * 画像がまだ無いものは、色面と文字だけの「刷り見本」を出しておく。
 * public/images/... に画像を置いて frontmatter の cover に書けば差し替わる。
 */
export function CoverPlate({
  src,
  alt,
  label,
  index,
  className = "",
  priority = false,
  sizes = "(min-width: 1024px) 50vw, 100vw",
}: CoverPlateProps) {
  return (
    <div
      className={`relative overflow-hidden border border-rule bg-paper-tint ${className}`}
    >
      {src ? (
        <Image
          src={src}
          alt={alt}
          fill
          sizes={sizes}
          priority={priority}
          className="object-cover"
        />
      ) : (
        <div
          className="absolute inset-0 flex flex-col justify-between p-4 sm:p-6"
          aria-hidden="true"
        >
          {/* 版面の見当マーク */}
          <div className="flex items-start justify-between">
            <span className="label text-ink-faint">{index ?? "—"}</span>
            <span className="block h-4 w-4 border-t border-r border-ink-faint" />
          </div>

          <p className="display max-w-[85%] text-[clamp(1.5rem,4vw,2.75rem)] text-ink/70">
            {label}
          </p>

          <div className="flex items-end justify-between">
            <span className="block h-4 w-4 border-b border-l border-ink-faint" />
            <span className="label text-ink-faint">No Image</span>
          </div>
        </div>
      )}
    </div>
  );
}
