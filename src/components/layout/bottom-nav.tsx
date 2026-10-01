"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Heart, Home, ReceiptText, Search, User } from "lucide-react";
import { cn } from "@/utils/cn";

const ITEMS = [
  { href: "/", label: "Início", icon: Home },
  { href: "/busca", label: "Buscar", icon: Search },
  { href: "/pedidos", label: "Pedidos", icon: ReceiptText },
  { href: "/favoritos", label: "Favoritos", icon: Heart },
  { href: "/conta", label: "Perfil", icon: User },
];

/** Navegação inferior — apenas no celular. */
export function BottomNav() {
  const pathname = usePathname();
  return (
    <nav
      aria-label="Navegação inferior"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-ink-100 bg-white/95 pb-safe backdrop-blur-md md:hidden"
    >
      <ul className="mx-auto grid max-w-md grid-cols-5">
        {ITEMS.map(({ href, label, icon: Icon }) => {
          const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex flex-col items-center gap-1 pt-2.5 text-[11px] font-semibold transition",
                  active ? "text-brand-600" : "text-ink-500",
                )}
              >
                <Icon className={cn("h-6 w-6", active && "fill-brand-100")} strokeWidth={active ? 2.4 : 2} aria-hidden />
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
