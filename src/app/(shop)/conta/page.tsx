import Link from "next/link";
import { ChevronRight, CircleHelp, CreditCard, Heart, LogOut, MapPin, ReceiptText, Settings, Store, TicketPercent, User } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { signOutAction } from "@/app/actions/auth";
import { Card } from "@/components/ui/misc";
import { initials } from "@/utils/format";

export const metadata = { title: "Minha conta" };

const ITEMS = [
  { href: "/conta/perfil", label: "Meu perfil", icon: User },
  { href: "/conta/enderecos", label: "Meus endereços", icon: MapPin },
  { href: "/pedidos", label: "Meus pedidos", icon: ReceiptText },
  { href: "/favoritos", label: "Favoritos", icon: Heart },
  { href: "/conta/cupons", label: "Cupons", icon: TicketPercent },
  { href: "/conta/pagamentos", label: "Formas de pagamento", icon: CreditCard },
  { href: "/conta/ajuda", label: "Ajuda", icon: CircleHelp },
  { href: "/conta/configuracoes", label: "Configurações", icon: Settings },
];

export default async function AccountPage() {
  const { profile } = await requireUser("/conta");

  return (
    <div className="mx-auto max-w-lg animate-fade-up">
      <div className="mb-6 flex items-center gap-4">
        <div className="grid h-16 w-16 place-items-center rounded-full bg-brand-500 text-xl font-black text-white shadow-glow">
          {initials(profile.full_name) || "🙂"}
        </div>
        <div>
          <h1 className="text-xl font-extrabold">{profile.full_name}</h1>
          <p className="text-sm text-ink-500">{profile.email}</p>
        </div>
      </div>

      {profile.role !== "client" && (
        <Link
          href={profile.role === "admin" ? "/admin" : "/parceiro"}
          className="mb-4 flex items-center gap-3 rounded-3xl bg-ink-900 p-4 text-white"
        >
          <Store className="h-5 w-5 text-accent-400" aria-hidden />
          <span className="flex-1 font-semibold">{profile.role === "admin" ? "Painel administrativo" : "Portal do parceiro"}</span>
          <ChevronRight className="h-5 w-5" aria-hidden />
        </Link>
      )}

      <Card className="overflow-hidden">
        <ul className="divide-y divide-ink-100">
          {ITEMS.map(({ href, label, icon: Icon }) => (
            <li key={href}>
              <Link href={href} className="flex items-center gap-3 px-5 py-4 hover:bg-ink-50">
                <Icon className="h-5 w-5 text-brand-500" aria-hidden />
                <span className="flex-1 font-semibold">{label}</span>
                <ChevronRight className="h-5 w-5 text-ink-300" aria-hidden />
              </Link>
            </li>
          ))}
          <li>
            <form action={signOutAction}>
              <button type="submit" className="flex w-full items-center gap-3 px-5 py-4 text-left text-red-600 hover:bg-red-50">
                <LogOut className="h-5 w-5" aria-hidden />
                <span className="flex-1 font-semibold">Sair</span>
              </button>
            </form>
          </li>
        </ul>
      </Card>
    </div>
  );
}
