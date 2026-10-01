"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Bell } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { formatDateTime } from "@/utils/format";
import { useToast } from "@/components/ui/toast";
import type { AppNotification } from "@/types";
import { cn } from "@/utils/cn";

/** Sino de notificações com atualização em tempo real (Supabase Realtime). */
export function NotificationBell({ userId }: { userId: string }) {
  const [items, setItems] = useState<AppNotification[]>([]);
  const [open, setOpen] = useState(false);
  const toast = useToast();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase
      .from("notifications")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(15)
      .then(({ data }) => setItems((data ?? []) as AppNotification[]));

    const channel = supabase
      .channel(`notifications:${userId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${userId}` },
        (payload) => {
          const n = payload.new as AppNotification;
          setItems((prev) => [n, ...prev].slice(0, 15));
          toast(n.body, "info");
          // Notificação do sistema quando o usuário autorizou (app aberto/PWA)
          if (typeof Notification !== "undefined" && Notification.permission === "granted" && document.hidden) {
            new Notification(n.title, { body: n.body, icon: "/icon.svg" });
          }
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, toast]);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  const unread = items.filter((n) => !n.read_at).length;

  async function markAllRead() {
    const supabase = createClient();
    const now = new Date().toISOString();
    await supabase.from("notifications").update({ read_at: now }).eq("user_id", userId).is("read_at", null);
    setItems((prev) => prev.map((n) => ({ ...n, read_at: n.read_at ?? now })));
  }

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="relative grid h-10 w-10 place-items-center rounded-full hover:bg-ink-50"
        aria-label={`Notificações${unread ? ` (${unread} novas)` : ""}`}
        aria-expanded={open}
      >
        <Bell className="h-5 w-5" />
        {unread > 0 && (
          <span className="absolute right-1.5 top-1.5 h-2.5 w-2.5 rounded-full bg-brand-500 ring-2 ring-white" />
        )}
      </button>
      {open && (
        <div className="absolute right-0 top-12 z-50 w-[min(22rem,calc(100vw-2rem))] overflow-hidden rounded-3xl border border-ink-100 bg-white shadow-lift animate-fade-up">
          <div className="flex items-center justify-between border-b border-ink-100 px-4 py-3">
            <p className="text-sm font-bold">Notificações</p>
            {unread > 0 && (
              <button onClick={markAllRead} className="text-xs font-semibold text-brand-600 hover:underline">
                Marcar todas como lidas
              </button>
            )}
          </div>
          <ul className="max-h-96 overflow-y-auto">
            {items.length === 0 && <li className="px-4 py-8 text-center text-sm text-ink-500">Nada por aqui ainda.</li>}
            {items.map((n) => (
              <li key={n.id}>
                <Link
                  href={n.link ?? "/pedidos"}
                  onClick={() => setOpen(false)}
                  className={cn("block px-4 py-3 hover:bg-ink-50", !n.read_at && "bg-brand-50/60")}
                >
                  <p className="text-sm font-semibold text-ink-900">{n.title}</p>
                  <p className="text-sm text-ink-600">{n.body}</p>
                  <p className="mt-0.5 text-[11px] text-ink-400">{formatDateTime(n.created_at)}</p>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
