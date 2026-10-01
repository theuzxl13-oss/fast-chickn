import Link from "next/link";
import { getSession } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { UserActions } from "@/components/admin/user-actions";
import { Badge, Card, PageHeader } from "@/components/ui/misc";
import type { Profile, UserRole } from "@/types";
import { formatDate, formatPhone } from "@/utils/format";
import { escapeLike } from "@/utils/sanitize";
import { cn } from "@/utils/cn";

export const metadata = { title: "Clientes" };

const ROLES: (UserRole | "all")[] = ["all", "client", "restaurant", "admin"];
const ROLE_LABEL = { all: "Todos", client: "Clientes", restaurant: "Parceiros", admin: "Admins" };

export default async function AdminUsersPage({ searchParams }: { searchParams: Promise<{ papel?: string; q?: string }> }) {
  const sp = await searchParams;
  const role = ROLES.includes(sp.papel as UserRole) ? (sp.papel as UserRole | "all") : "client";
  const q = escapeLike(sp.q ?? "").slice(0, 60);
  const { user } = await getSession();

  const supabase = await createClient();
  let query = supabase.from("profiles").select("*").order("created_at", { ascending: false }).limit(300);
  if (role !== "all") query = query.eq("role", role);
  if (q) query = query.or(`full_name.ilike.%${q}%,email.ilike.%${q}%`);
  const { data } = await query;
  const users = (data ?? []) as Profile[];

  const ids = users.map((u) => u.id);
  const { data: orderRows } = ids.length
    ? await supabase.from("orders").select("user_id, total, status").in("user_id", ids)
    : { data: [] };
  const stats = new Map<string, { count: number; total: number }>();
  (orderRows ?? []).forEach((o) => {
    if (o.status === "cancelled" || o.status === "rejected") return;
    const cur = stats.get(o.user_id) ?? { count: 0, total: 0 };
    stats.set(o.user_id, { count: cur.count + 1, total: cur.total + Number(o.total) });
  });

  return (
    <div className="animate-fade-up">
      <PageHeader title="Usuários" description="Gerencie clientes, parceiros e administradores." />
      <div className="mb-4 flex flex-wrap items-center gap-2">
        {ROLES.map((r) => (
          <Link
            key={r}
            href={`/admin/clientes?papel=${r}`}
            className={cn("rounded-full px-4 py-2 text-sm font-semibold", role === r ? "bg-ink-900 text-white" : "bg-white text-ink-600 shadow-soft")}
          >
            {ROLE_LABEL[r]}
          </Link>
        ))}
        <form className="ml-auto">
          <input type="hidden" name="papel" value={role} />
          <input name="q" defaultValue={q} placeholder="Nome ou e-mail" className="h-10 rounded-2xl border border-ink-200 bg-white px-4 text-sm" aria-label="Buscar usuário" />
        </form>
      </div>
      <Card className="overflow-x-auto">
        <table className="w-full min-w-[760px] text-sm">
          <thead className="bg-ink-50 text-left text-xs uppercase tracking-wide text-ink-500">
            <tr>
              <th className="px-4 py-3">Usuário</th>
              <th className="px-4 py-3">Telefone</th>
              <th className="px-4 py-3">Pedidos</th>
              <th className="px-4 py-3">Cadastro</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-ink-100">
            {users.map((u) => {
              const st = stats.get(u.id);
              return (
                <tr key={u.id} className={u.is_blocked ? "bg-red-50/50" : undefined}>
                  <td className="px-4 py-3">
                    <p className="flex items-center gap-2 font-semibold">
                      {u.full_name || "—"} {u.is_blocked && <Badge tone="danger">Bloqueado</Badge>}
                    </p>
                    <p className="text-xs text-ink-500">{u.email}</p>
                  </td>
                  <td className="px-4 py-3">{formatPhone(u.phone) || "—"}</td>
                  <td className="px-4 py-3">{st ? `${st.count} · ${st.total.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}` : "0"}</td>
                  <td className="px-4 py-3">{formatDate(u.created_at)}</td>
                  <td className="px-4 py-3">
                    <UserActions id={u.id} role={u.role} blocked={u.is_blocked} self={u.id === user?.id} />
                  </td>
                </tr>
              );
            })}
            {users.length === 0 && (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-ink-500">Nenhum usuário encontrado.</td></tr>
            )}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
