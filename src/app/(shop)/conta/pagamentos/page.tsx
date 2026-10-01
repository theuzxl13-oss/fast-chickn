import { requireUser } from "@/lib/auth";
import { BackHeader } from "@/components/layout/back-header";
import { PaymentPreferences } from "@/components/account/payment-preferences";

export const metadata = { title: "Formas de pagamento" };

export default async function PaymentsPage() {
  const { profile } = await requireUser("/conta/pagamentos");
  return (
    <div className="mx-auto max-w-lg animate-fade-up">
      <BackHeader href="/conta" title="Formas de pagamento" description="Escolha sua forma preferida — ela vem selecionada no checkout." />
      <PaymentPreferences current={profile.preferred_payment_method} />
      <div className="mt-6 rounded-3xl border border-dashed border-ink-200 bg-white p-4 text-sm text-ink-600">
        <p className="font-bold text-ink-800">Cartões salvos — integração futura</p>
        <p className="mt-1">
          O pagamento online com cartão e o salvamento seguro de cartões dependem de um gateway de pagamento
          (tokenização PCI). A arquitetura está preparada em <code>src/services/payments</code>; até lá, cartões são
          aceitos na maquininha no momento da entrega.
        </p>
      </div>
    </div>
  );
}
