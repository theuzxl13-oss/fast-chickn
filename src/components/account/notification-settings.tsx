"use client";

import { useEffect, useState, useTransition } from "react";
import { updatePreferencesAction } from "@/app/actions/account";
import { Toggle } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";

export function NotificationSettings({ enabled }: { enabled: boolean }) {
  const [on, setOn] = useState(enabled);
  const [permission, setPermission] = useState<NotificationPermission | "unsupported">("default");
  const [, start] = useTransition();
  const toast = useToast();

  useEffect(() => {
    setPermission(typeof Notification === "undefined" ? "unsupported" : Notification.permission);
  }, []);

  return (
    <div className="space-y-3">
      <Toggle
        label="Atualizações dos pedidos"
        description="“Seu pedido foi confirmado”, “saiu para entrega”, “chegou!”…"
        checked={on}
        onChange={(value) => {
          setOn(value);
          start(async () => {
            const res = await updatePreferencesAction({ notifications_enabled: value });
            if (!res.ok) {
              setOn(!value);
              toast(res.error, "error");
            }
          });
        }}
      />
      <div className="rounded-2xl border border-ink-100 bg-white p-4 text-sm">
        <p className="font-semibold">Notificações do navegador</p>
        <p className="mt-1 text-ink-500">
          {permission === "granted" && "Ativadas neste dispositivo."}
          {permission === "denied" && "Bloqueadas. Libere nas configurações do navegador."}
          {permission === "default" && "Receba avisos mesmo com a aba em segundo plano."}
          {permission === "unsupported" && "Seu navegador não suporta notificações."}
        </p>
        {permission === "default" && (
          <Button
            size="sm"
            variant="soft"
            className="mt-3"
            onClick={async () => setPermission(await Notification.requestPermission())}
          >
            Permitir notificações
          </Button>
        )}
        <p className="mt-3 text-xs text-ink-400">
          Notificações push com o app fechado (Web Push/VAPID) são uma integração futura — o service worker já está preparado.
        </p>
      </div>
    </div>
  );
}
