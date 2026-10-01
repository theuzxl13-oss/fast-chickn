import { cn } from "@/utils/cn";

const PALETTES = [
  ["#FF7A3D", "#FFC529"],
  ["#EB3F0C", "#FF7A3D"],
  ["#F9A307", "#FFE587"],
  ["#C22E0C", "#FF5A1F"],
  ["#3D3631", "#FF7A3D"],
];

function hash(value: string) {
  let h = 0;
  for (let i = 0; i < value.length; i++) h = (h * 31 + value.charCodeAt(i)) | 0;
  return Math.abs(h);
}

/**
 * Imagem de produto/restaurante. Sem foto cadastrada, exibe um placeholder
 * ilustrado (gradiente da marca + emoji) — nenhuma imagem de terceiros.
 */
export function FoodImage({
  src,
  alt,
  emoji = "🍗",
  seed,
  className,
  rounded = "rounded-2xl",
}: {
  src?: string | null;
  alt: string;
  emoji?: string;
  seed?: string;
  className?: string;
  rounded?: string;
}) {
  if (src) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={src} alt={alt} loading="lazy" className={cn("object-cover", rounded, className)} />
    );
  }
  const [from, to] = PALETTES[hash(seed ?? alt) % PALETTES.length];
  return (
    <div
      role="img"
      aria-label={alt}
      className={cn("relative grid place-items-center overflow-hidden", rounded, className)}
      style={{ background: `linear-gradient(135deg, ${from}, ${to})` }}
    >
      <span className="absolute -right-3 -top-3 h-16 w-16 rounded-full bg-white/15" aria-hidden />
      <span className="absolute -bottom-4 -left-2 h-12 w-12 rounded-full bg-white/10" aria-hidden />
      <span className="relative text-[2.2em] drop-shadow-sm" aria-hidden>
        {emoji}
      </span>
    </div>
  );
}

/** Logo do restaurante: imagem enviada ou monograma com a cor da marca. */
export function RestaurantLogo({
  src,
  name,
  color,
  className,
}: {
  src?: string | null;
  name: string;
  color?: string;
  className?: string;
}) {
  if (src) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={src} alt={`Logo ${name}`} className={cn("rounded-2xl object-cover", className)} />;
  }
  const letters = name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join("");
  return (
    <div
      aria-label={`Logo ${name}`}
      role="img"
      className={cn("grid place-items-center rounded-2xl font-black italic text-white", className)}
      style={{ backgroundColor: color ?? "#FF5A1F" }}
    >
      {letters}
    </div>
  );
}
