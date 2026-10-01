import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { DemoPixGateway } from "./demo-pix";
import { PaymentIntegrationPendingError, type PixGateway } from "./types";

export function getPixGateway(supabase: SupabaseClient): PixGateway {
  const provider = process.env.PAYMENT_PROVIDER || "demo";
  switch (provider) {
    case "demo":
      return new DemoPixGateway(supabase);
    default:
      // Integração futura: instanciar aqui o gateway real.
      throw new PaymentIntegrationPendingError(provider);
  }
}

export { DemoPixGateway };
export type { PixGateway };
