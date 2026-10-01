import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { CheckoutForm } from "@/components/checkout/checkout-form";
import type { Address } from "@/types";

export const metadata = { title: "Finalizar pedido" };

export default async function CheckoutPage() {
  const { user, profile } = await requireUser("/checkout");
  const supabase = await createClient();
  const [{ data: addresses }, { data: settings }] = await Promise.all([
    supabase.from("addresses").select("*").eq("user_id", user.id).order("is_default", { ascending: false }),
    supabase.from("app_settings").select("demo_payments").eq("id", 1).maybeSingle<{ demo_payments: boolean }>(),
  ]);

  return (
    <CheckoutForm
      addresses={(addresses ?? []) as Address[]}
      preferredPayment={profile.preferred_payment_method}
      demoPayments={settings?.demo_payments ?? true}
    />
  );
}
