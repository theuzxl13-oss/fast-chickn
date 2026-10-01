import type { Payment } from "@/types";

/**
 * Contrato de um gateway PIX.
 *
 * O ambiente atual usa `DemoPixGateway` (sem cobrança real). Para integrar um
 * provedor real (ex.: Mercado Pago, Pagar.me, Efí, Asaas), implemente esta
 * interface em um arquivo novo, registre-o em `services/payments/index.ts` e
 * configure `PAYMENT_PROVIDER`, `PAYMENT_GATEWAY_API_KEY` e
 * `PAYMENT_WEBHOOK_SECRET`. A confirmação do pagamento deve chegar pelo
 * webhook em `src/app/api/payments/pix/webhook/route.ts`, que atualiza a
 * tabela `payments` com a service role no servidor.
 */
export interface PixGateway {
  readonly id: string;
  readonly isDemo: boolean;
  /** Gera (ou reaproveita) a cobrança PIX do pedido: QR Code e copia e cola. */
  createCharge(orderId: string): Promise<Payment>;
  /** Consulta o status atual da cobrança. */
  checkStatus(orderId: string): Promise<Payment>;
}

export class PaymentIntegrationPendingError extends Error {
  constructor(provider: string) {
    super(
      `Integração com o gateway "${provider}" ainda não foi implementada. Configure PAYMENT_PROVIDER=demo ou implemente a interface PixGateway.`,
    );
    this.name = "PaymentIntegrationPendingError";
  }
}
