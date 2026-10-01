"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  ChartColumn,
  ExternalLink,
  Flame,
  FolderTree,
  Image as ImageIcon,
  Landmark,
  LayoutDashboard,
  LogOut,
  Menu,
  ReceiptText,
  Settings,
  Star,
  Store,
  Tags,
  TicketPercent,
  Users,
  UtensilsCrossed,
  Wallet,
  X,
} from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { signOutAction } from "@/app/actions/auth";
import { cn } from "@/utils/cn";

const Icons = {
  ChartColumn,
  ExternalLink,
  Flame,
  FolderTree,
  ImageIcon,
  Landmark,
  LayoutDashboard,
  LogOut,
  ReceiptText,
  Settings,
  Star,
  Store,
  Tags,
  TicketPercent,
  Users,
  UtensilsCrossed,
  Wallet,
};

export interface PanelNavItem {
  href: string;
  label: string;
  icon: keyof typeof Icons;
}

/** Layout compartilhado pelos painéis do parceiro e do administrador. */
export function PanelShell({
  title,
  subtitle,
  nav,
  root,
  badge,
  children,
}: {
  title: string;
  subtitle?: string;
  nav: PanelNavItem[];
  root: string;
  badge?: React.ReactNode;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const isActive = (href: string) => (href === root ? pathname === root : pathname.startsWith(href));

  const navList = (
    <ul className="space-y-1">
      {nav.map((item) => {
        const Icon = Icons[item.icon] as React.ComponentType<{ className?: string }>;
        const active = isActive(item.href);
        return (
          <li key={item.href}>
            <Link
              href={item.href}
              onClick={() => setOpen(false)}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-semibold transition",
                active ? "bg-brand-500 text-white shadow-glow" : "text-ink-300 hover:bg-white/5 hover:text-white",
              )}
            >
              <Icon className="h-5 w-5" />
              {item.label}
            </Link>
          </li>
        );
      })}
    </ul>
  );

  const sidebar = (
    <div className="flex h-full flex-col gap-6 p-4">
      <div className="px-2 pt-2">
        <Logo inverted href={root} />
        <p className="mt-3 truncate text-sm font-bold text-white">{title}</p>
        {subtitle && <p className="truncate text-xs text-ink-400">{subtitle}</p>}
        {badge && <div className="mt-2">{badge}</div>}
      </div>
      <nav className="flex-1 overflow-y-auto" aria-label="Menu do painel">
        {navList}
      </nav>
      <div className="space-y-1 border-t border-white/10 pt-4">
        <Link href="/" className="flex items-center gap-3 rounded-2xl px-3 py-2 text-sm font-semibold text-ink-300 hover:text-white">
          <Icons.ExternalLink className="h-4 w-4" /> Ver app do cliente
        </Link>
        <form action={signOutAction}>
          <button type="submit" className="flex w-full items-center gap-3 rounded-2xl px-3 py-2 text-sm font-semibold text-ink-300 hover:text-white">
            <Icons.LogOut className="h-4 w-4" /> Sair
          </button>
        </form>
      </div>
    </div>
  );

  return (
    <div className="min-h-dvh bg-ink-50 lg:grid lg:grid-cols-[260px_1fr]">
      <aside className="sticky top-0 hidden h-dvh bg-ink-900 lg:block">{sidebar}</aside>

      <header className="sticky top-0 z-40 flex items-center justify-between bg-ink-900 px-4 py-3 lg:hidden">
        <Logo inverted href={root} />
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="grid h-10 w-10 place-items-center rounded-full text-white hover:bg-white/10"
          aria-label="Abrir menu"
        >
          <Menu className="h-6 w-6" />
        </button>
      </header>

      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-ink-900/60" onClick={() => setOpen(false)} aria-hidden />
          <div className="absolute inset-y-0 left-0 w-72 bg-ink-900 animate-fade-up">
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="absolute right-3 top-3 grid h-9 w-9 place-items-center rounded-full text-white hover:bg-white/10"
              aria-label="Fechar menu"
            >
              <X className="h-5 w-5" />
            </button>
            {sidebar}
          </div>
        </div>
      )}

      <main className="min-w-0 px-4 py-6 md:px-8 md:py-8">{children}</main>
    </div>
  );
}
