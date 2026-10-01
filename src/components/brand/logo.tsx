import Link from "next/link";
import { cn } from "@/utils/cn";

/**
 * Logo textual temporária da FAST CHICKN.
 * Para usar a logo oficial, defina NEXT_PUBLIC_BRAND_LOGO_URL (ex.: /brand/logo.svg
 * dentro de /public) — o componente passa a exibir a imagem automaticamente.
 */
const LOGO_URL = process.env.NEXT_PUBLIC_BRAND_LOGO_URL;

export function LogoMark({ className, inverted = false }: { className?: string; inverted?: boolean }) {
  // Invertida: fundo branco para funcionar sobre superfícies laranja ou escuras
  const bg = inverted ? "#FFFFFF" : "#FF5A1F";
  const fg = inverted ? "#FF5A1F" : "#FFFFFF";
  const lines = inverted ? "#F9A307" : "#FFC529";
  return (
    <svg viewBox="0 0 48 48" className={cn("h-9 w-9", className)} aria-hidden>
      <rect width="48" height="48" rx="14" fill={bg} />
      {/* linhas de velocidade */}
      <path d="M7 19h9M5 25h10M8 31h7" stroke={lines} strokeWidth="3" strokeLinecap="round" />
      {/* coxinha de frango estilizada */}
      <path d="M21 15c5-5 14-3 17 3 3 6 0 13-7 14l-5 6a3 3 0 1 1-4.5-3.8L26 30c-5-3-8.5-10-5-15Z" fill={fg} />
      <circle cx="30" cy="21" r="2.4" fill={bg} />
    </svg>
  );
}

export function Logo({ href = "/", className, compact = false, inverted = false }: {
  href?: string;
  className?: string;
  compact?: boolean;
  inverted?: boolean;
}) {
  return (
    <Link href={href} className={cn("inline-flex items-center gap-2", className)} aria-label="FAST CHICKN — início">
      {LOGO_URL ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={LOGO_URL} alt="FAST CHICKN" className="h-9 w-auto" />
      ) : (
        <>
          <LogoMark inverted={inverted} />
          {!compact && (
            <span className="whitespace-nowrap text-xl font-black italic leading-none tracking-tight">
              <span className={inverted ? "text-white" : "text-ink-900"}>FAST</span>{" "}
              <span className={inverted ? "text-accent-300" : "text-brand-500"}>CHICKN</span>
            </span>
          )}
        </>
      )}
    </Link>
  );
}
