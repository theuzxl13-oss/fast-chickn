"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { ChevronDown, MapPin, Search, ShoppingBag, User } from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { useSession } from "@/components/providers/session-provider";
import { useCart } from "@/components/cart/cart-provider";
import { NotificationBell } from "@/components/layout/notification-bell";
import { cn } from "@/utils/cn";

const DESKTOP_LINKS = [
  { href: "/", label: "Início" },
  { href: "/busca", label: "Buscar" },
  { href: "/pedidos", label: "Pedidos" },
  { href: "/favoritos", label: "Favoritos" },
];

function SearchBox({ className }: { className?: string }) {
  const router = useRouter();
  const params = useSearchParams();
  const [q, setQ] = useState(params.get("q") ?? "");
  return (
    <form
      role="search"
      className={cn("relative", className)}
      onSubmit={(e) => {
        e.preventDefault();
        const term = q.trim();
        router.push(term ? `/busca?q=${encodeURIComponent(term)}` : "/busca");
      }}
    >
      <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-ink-400" aria-hidden />
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        type="search"
        maxLength={60}
        placeholder="Busque por restaurante ou comida"
        aria-label="Busque por restaurante ou comida"
        className="h-12 w-full rounded-2xl border border-transparent bg-ink-50 pl-12 pr-4 text-sm outline-none transition placeholder:text-ink-400 focus:border-brand-300 focus:bg-white focus:ring-4 focus:ring-brand-100"
      />
    </form>
  );
}

export function ShopHeader() {
  const { user, defaultAddress } = useSession();
  const { count } = useCart();
  const pathname = usePathname();
  const hideSearchMobile = pathname.startsWith("/restaurante/") || pathname.startsWith("/checkout");

  const addressText = defaultAddress
    ? `${defaultAddress.street}, ${defaultAddress.number}`
    : user
      ? "Cadastre um endereço"
      : "Entre para escolher o endereço";

  return (
    <header className="sticky top-0 z-40 border-b border-ink-100 bg-white/90 backdrop-blur-md">
      <div className="mx-auto flex w-full max-w-6xl items-center gap-4 px-4 py-3 md:px-6">
        <Logo className="shrink-0" />

        <Link
          href={user ? "/conta/enderecos" : "/login?next=/conta/enderecos"}
          className="group flex min-w-0 flex-1 items-center gap-2 rounded-2xl px-2 py-1.5 hover:bg-ink-50 md:max-w-xs md:flex-none"
        >
          <MapPin className="h-5 w-5 shrink-0 text-brand-500" aria-hidden />
          <span className="min-w-0 text-left">
            <span className="block text-[11px] font-medium uppercase tracking-wide text-ink-500">Entregar em</span>
            <span className="block truncate text-sm font-bold text-ink-900">{addressText}</span>
          </span>
          <ChevronDown className="h-4 w-4 shrink-0 text-ink-400 transition group-hover:translate-y-0.5" aria-hidden />
        </Link>

        <Suspense>
          <SearchBox className="hidden flex-1 lg:block" />
        </Suspense>

        <nav className="hidden items-center gap-1 md:flex" aria-label="Navegação principal">
          {DESKTOP_LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={cn(
                "rounded-xl px-3 py-2 text-sm font-semibold text-ink-600 hover:bg-ink-50 hover:text-ink-900",
                (l.href === "/" ? pathname === "/" : pathname.startsWith(l.href)) && "text-brand-600",
              )}
            >
              {l.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-1">
          {user && <NotificationBell userId={user.id} />}
          <Link
            href="/carrinho"
            className="relative hidden h-10 w-10 place-items-center rounded-full hover:bg-ink-50 md:grid"
            aria-label={`Carrinho (${count} itens)`}
          >
            <ShoppingBag className="h-5 w-5" />
            {count > 0 && (
              <span className="absolute -right-0.5 -top-0.5 grid h-5 min-w-5 place-items-center rounded-full bg-brand-500 px-1 text-[11px] font-bold text-white">
                {count}
              </span>
            )}
          </Link>
          <Link
            href={user ? "/conta" : "/login"}
            className="hidden h-10 items-center gap-2 rounded-full px-3 text-sm font-semibold hover:bg-ink-50 md:flex"
          >
            <User className="h-5 w-5" aria-hidden />
            {user ? user.name.split(" ")[0] : "Entrar"}
          </Link>
        </div>
      </div>

      {!hideSearchMobile && (
        <div className="mx-auto max-w-6xl px-4 pb-3 md:px-6 lg:hidden">
          <Suspense>
            <SearchBox />
          </Suspense>
        </div>
      )}
    </header>
  );
}
