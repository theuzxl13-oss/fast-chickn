import { requireRole } from "@/lib/auth";
import { PanelShell, type PanelNavItem } from "@/components/layout/panel-shell";

export const metadata = { title: { default: "Administração", template: "%s · Admin FAST CHICKN" } };

const NAV: PanelNavItem[] = [
  { href: "/admin", label: "Dashboard", icon: "LayoutDashboard" },
  { href: "/admin/restaurantes", label: "Restaurantes", icon: "Store" },
  { href: "/admin/clientes", label: "Clientes", icon: "Users" },
  { href: "/admin/pedidos", label: "Pedidos", icon: "ReceiptText" },
  { href: "/admin/categorias", label: "Categorias", icon: "Tags" },
  { href: "/admin/cupons", label: "Cupons", icon: "TicketPercent" },
  { href: "/admin/banners", label: "Banners", icon: "ImageIcon" },
  { href: "/admin/financeiro", label: "Financeiro", icon: "Landmark" },
  { href: "/admin/relatorios", label: "Relatórios", icon: "ChartColumn" },
  { href: "/admin/configuracoes", label: "Configurações", icon: "Settings" },
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const { profile } = await requireRole(["admin"], "/admin");
  return (
    <PanelShell title="Administração" subtitle={profile.full_name} root="/admin" nav={NAV}>
      {children}
    </PanelShell>
  );
}
