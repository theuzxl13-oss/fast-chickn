import { Mail, Phone } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { BackHeader } from "@/components/layout/back-header";
import { Card } from "@/components/ui/misc";
import { formatPhone } from "@/utils/format";

export const metadata = { title: "Ajuda" };

const FAQ = [
  {
    q: "Como acompanho meu pedido?",
    a: "Em “Pedidos”, toque no pedido em andamento. O status é atualizado automaticamente sempre que o restaurante avança uma etapa.",
  },
  {
    q: "Posso cancelar um pedido?",
    a: "Sim, enquanto o restaurante ainda não confirmou. Depois disso, fale diretamente com o restaurante pelo telefone exibido no pedido.",
  },
  {
    q: "Como uso um cupom?",
    a: "No carrinho ou no checkout, digite o código em “Adicionar cupom”. As regras (valor mínimo, validade e restaurantes) são verificadas na hora.",
  },
  {
    q: "Quais formas de pagamento são aceitas?",
    a: "PIX pelo app, além de cartão de crédito, débito, dinheiro ou vale-refeição na entrega.",
  },
  {
    q: "Por que não consigo pedir em um restaurante?",
    a: "O restaurante pode estar fora do horário de funcionamento ou com pedidos pausados. O cardápio continua visível para consulta.",
  },
  {
    q: "Tenho um restaurante. Como me cadastro?",
    a: "Crie uma conta do tipo “Restaurante parceiro”. Após preencher os dados da loja, nossa equipe analisa e aprova o cadastro.",
  },
];

export default async function HelpPage() {
  const supabase = await createClient();
  const { data: settings } = await supabase
    .from("app_settings")
    .select("support_email, support_phone")
    .eq("id", 1)
    .maybeSingle<{ support_email: string | null; support_phone: string | null }>();

  return (
    <div className="mx-auto max-w-lg animate-fade-up">
      <BackHeader href="/conta" title="Ajuda" description="Perguntas frequentes e contato." />
      <div className="space-y-2">
        {FAQ.map((item) => (
          <details key={item.q} className="group rounded-3xl border border-ink-100 bg-white p-4 shadow-soft">
            <summary className="cursor-pointer list-none font-bold marker:hidden">
              <span className="mr-2 inline-block text-brand-500 transition group-open:rotate-90">›</span>
              {item.q}
            </summary>
            <p className="mt-2 text-sm text-ink-600">{item.a}</p>
          </details>
        ))}
      </div>
      {(settings?.support_email || settings?.support_phone) && (
        <Card className="mt-6 space-y-3 p-5">
          <h2 className="font-bold">Fale com a gente</h2>
          {settings.support_email && (
            <a href={`mailto:${settings.support_email}`} className="flex items-center gap-2 text-sm font-semibold text-brand-600">
              <Mail className="h-4 w-4" aria-hidden /> {settings.support_email}
            </a>
          )}
          {settings.support_phone && (
            <a href={`tel:${settings.support_phone}`} className="flex items-center gap-2 text-sm font-semibold text-brand-600">
              <Phone className="h-4 w-4" aria-hidden /> {formatPhone(settings.support_phone)}
            </a>
          )}
        </Card>
      )}
    </div>
  );
}
