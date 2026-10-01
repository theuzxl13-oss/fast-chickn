"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { setUserBlockedAction, setUserRoleAction } from "@/app/actions/admin";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import type { UserRole } from "@/types";

export function UserActions({ id, role, blocked, self }: { id: string; role: UserRole; blocked: boolean; self: boolean }) {
  const [pending, start] = useTransition();
  const router = useRouter();
  const toast = useToast();

  const run = (fn: () => ReturnType<typeof setUserBlockedAction>) =>
    start(async () => {
      const res = await fn();
      toast(res.ok ? res.message! : res.error, res.ok ? "success" : "error");
      router.refresh();
    });

  if (self) return <span className="text-xs text-ink-400">Você</span>;

  return (
    <div className="flex items-center justify-end gap-2">
      <select
        defaultValue={role}
        disabled={pending}
        aria-label="Papel do usuário"
        onChange={(e) => {
          const next = e.target.value as UserRole;
          if (next === "admin" && !confirm("Conceder acesso de ADMINISTRADOR a este usuário?")) {
            e.target.value = role;
            return;
          }
          run(() => setUserRoleAction(id, next));
        }}
        className="h-9 rounded-xl border border-ink-200 bg-white px-2 text-xs font-semibold"
      >
        <option value="client">Cliente</option>
        <option value="restaurant">Restaurante</option>
        <option value="admin">Admin</option>
      </select>
      <Button
        size="sm"
        variant={blocked ? "success" : "outline"}
        disabled={pending}
        onClick={() => run(() => setUserBlockedAction(id, !blocked))}
      >
        {blocked ? "Liberar" : "Bloquear"}
      </Button>
    </div>
  );
}
