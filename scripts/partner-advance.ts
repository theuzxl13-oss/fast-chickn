/**
 * Script de teste: entra como parceiro (sessão real, sujeita ao RLS) e avança
 * o status de um pedido. Útil para testar o acompanhamento em tempo real.
 *
 * Uso: npx tsx scripts/partner-advance.ts <codigo-do-pedido> <status> [email-do-parceiro]
 * Ex.: npx tsx scripts/partner-advance.ts FC000050 confirmed
 */
import { config } from "dotenv";
import { createClient } from "@supabase/supabase-js";

config({ path: ".env.local" });

const [code, status, email = "parceiro1@fastchickn.dev"] = process.argv.slice(2);
if (!code || !status) {
  console.error("Uso: npx tsx scripts/partner-advance.ts <codigo> <status> [email]");
  process.exit(1);
}

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
  auth: { persistSession: false },
});

async function main() {
  const { error: authError } = await supabase.auth.signInWithPassword({ email, password: process.env.SEED_DEMO_PASSWORD! });
  if (authError) throw new Error(`login: ${authError.message}`);

  const { data: order } = await supabase.from("orders").select("id, code, status").eq("code", code).maybeSingle();
  if (!order) throw new Error(`Pedido ${code} não encontrado (ou não pertence a este restaurante — RLS).`);

  const { data, error } = await supabase.rpc("update_order_status", { p_order_id: order.id, p_status: status, p_note: null });
  if (error) throw new Error(error.message);
  console.log(`✔ ${code}: ${order.status} → ${data.status}`);
}

main().catch((e) => {
  console.error("✖", e.message);
  process.exit(1);
});
