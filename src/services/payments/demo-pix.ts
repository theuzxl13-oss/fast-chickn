import type { SupabaseClient } from "@supabase/supabase-js";
import type { Payment } from "@/types";
import type { PixGateway } from "./types";

/**
 * Gateway PIX de DEMONSTRAÇÃO. Nenhuma cobrança real é feita.
 * Usa as funções SQL `demo_pix_charge` e `demo_confirm_pix`, que só funcionam
 * quando `app_settings.demo_payments = true` (configurável pelo admin).
 */
export class DemoPixGateway implements PixGateway {
  readonly id = "demo";
  readonly isDemo = true;

  constructor(private readonly supabase: SupabaseClient) {}

  async createCharge(orderId: string): Promise<Payment> {
    const { data, error } = await this.supabase.rpc("demo_pix_charge", { p_order_id: orderId });
    if (error) throw new Error(error.message);
    return data as Payment;
  }

  async checkStatus(orderId: string): Promise<Payment> {
    const { data, error } = await this.supabase.from("payments").select("*").eq("order_id", orderId).single();
    if (error) throw new Error(error.message);
    return data as Payment;
  }

  /** Simula a confirmação que, em produção, viria do webhook do banco. */
  async simulatePayment(orderId: string): Promise<Payment> {
    const { data, error } = await this.supabase.rpc("demo_confirm_pix", { p_order_id: orderId });
    if (error) throw new Error(error.message);
    return data as Payment;
  }
}
