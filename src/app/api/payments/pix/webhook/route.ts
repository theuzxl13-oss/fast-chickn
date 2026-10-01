import { NextResponse, type NextRequest } from "next/server";

/**
 * INTEGRAÇÃO FUTURA — Webhook do gateway PIX.
 *
 * Quando um gateway real for configurado (PAYMENT_PROVIDER != "demo"), este
 * endpoint deverá:
 *   1. validar a assinatura usando PAYMENT_WEBHOOK_SECRET;
 *   2. localizar o pagamento por `provider_reference`;
 *   3. atualizar `payments.status = 'paid'` e `paid_at` usando um cliente com
 *      SUPABASE_SERVICE_ROLE_KEY (somente no servidor);
 *   4. o Realtime já notifica a tela de acompanhamento do cliente.
 *
 * Enquanto não houver gateway, responde 501 para deixar explícito que a
 * confirmação automática ainda não está ativa.
 */
export async function POST(request: NextRequest) {
  const provider = process.env.PAYMENT_PROVIDER || "demo";
  if (provider === "demo" || !process.env.PAYMENT_WEBHOOK_SECRET) {
    return NextResponse.json(
      { error: "Webhook PIX não configurado (ambiente de demonstração)." },
      { status: 501 },
    );
  }
  // Leitura do corpo bruto necessária para validação de assinatura.
  await request.text();
  return NextResponse.json({ error: `Gateway "${provider}" ainda não implementado.` }, { status: 501 });
}
