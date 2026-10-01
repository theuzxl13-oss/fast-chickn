import { requireRole, getPartnerRestaurant } from "@/lib/auth";
import { PanelShell, type PanelNavItem } from "@/components/layout/panel-shell";
import { Badge } from "@/components/ui/misc";
import { RESTAURANT_STATUS_LABEL } from "@/lib/constants";

export const metadata = { title: { default: "Portal do parceiro", template: "%s · Parceiro FAST CHICKN" } };

const NAV: PanelNavItem[] = [
  { href: "/parceiro", label: "Dashboard", icon: "LayoutDashboard" },
  { href: "/parceiro/pedidos", label: "Pedidos", icon: "ReceiptText" },
  { href: "/parceiro/cardapio", label: "Cardápio", icon: "UtensilsCrossed" },
  { href: "/parceiro/categorias", label: "Categorias", icon: "FolderTree" },
  { href: "/parceiro/promocoes", label: "Promoções", icon: "Flame" },
  { href: "/parceiro/cupons", label: "Cupons", icon: "TicketPercent" },
  { href: "/parceiro/financeiro", label: "Financeiro", icon: "Wallet" },
  { href: "/parceiro/relatorios", label: "Relatórios", icon: "ChartColumn" },
  { href: "/parceiro/avaliacoes", label: "Avaliações", icon: "Star" },
  { href: "/parceiro/configuracoes", label: "Configurações", icon: "Settings" },
];

export default async function PartnerLayout({ children }: { children: React.ReactNode }) {
  await requireRole(["restaurant"], "/parceiro");
  const restaurant = await getPartnerRestaurant();

  if (!restaurant) {
    // Ainda sem loja: apenas a tela de cadastro (renderizada sem menu)
    return <div className="min-h-dvh bg-ink-50 px-4 py-8">{children}</div>;
  }

  const tone = restaurant.status === "active" ? "success" : restaurant.status === "pending" ? "warning" : "danger";

  return (
    <PanelShell
      title={restaurant.name}
      subtitle="Portal do parceiro"
      root="/parceiro"
      nav={NAV}
      badge={<Badge tone={tone}>{RESTAURANT_STATUS_LABEL[restaurant.status]}</Badge>}
    >
      {children}
    </PanelShell>
  );
}
