import Image from "next/image";

type WorkPlateProps = {
  src?: string;
  title: string;
  /** 通し番号。代替表示のときだけ出る。 */
  index?: string;
  className?: string;
  sizes?: string;
  priority?: boolean;
};

/**
 * 作品の面。
 * 画像があれば敷き詰め、無ければ一段明るい黒面に作品名を大きく置く。
 * 画像はモノクロームに寄せて、ページ全体の明度設計を崩さないようにしている。
 * ホバーの反応は親の group から受ける。
 */
export function WorkPlate({
  src,
  title,
  index,
  className = "",
  sizes = "(min-width: 768px) 55vw, 100vw",
  priority = false,
}: WorkPlateProps) {
  return (
    <div
      className={`relative overflow-hidden bg-surface-raised ${className}`}
      data-plate={src ? "image" : "empty"}
    >
      {src ? (
        <Image
          src={src}
          alt={title}
          fill
          sizes={sizes}
          priority={priority}
          className="scale-100 object-cover grayscale brightness-90 transition-all duration-700 ease-[var(--ease-out-expo)] group-hover:scale-[1.04] group-hover:brightness-110"
        />
      ) : (
        <div
          className="absolute inset-0 flex flex-col justify-between p-5 sm:p-8"
          aria-hidden="true"
        >
          <span className="label text-fg-faint">{index ?? "—"}</span>

          <p className="display max-w-full break-words text-[clamp(1.75rem,5.5vw,3.75rem)] text-fg/45 transition-all duration-700 ease-[var(--ease-out-expo)] group-hover:translate-x-1 group-hover:text-fg/65">
            {title}
          </p>

          <span className="label text-fg-faint">No Image</span>
        </div>
      )}
    </div>
  );
}
