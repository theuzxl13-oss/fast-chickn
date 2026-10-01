import { createClient } from "@/lib/supabase/server";
import { SettingsForm } from "@/components/admin/settings-form";
import { Card, PageHeader } from "@/components/ui/misc";
import type { AppSettings } from "@/types";

export const metadata = { title: "Configurações" };

export default async function AdminSettingsPage() {
  const supabase = await createClient();
  const { data } = await supabase.from("app_settings").select("*").eq("id", 1).single<AppSettings>();
  return (
    <div className="max-w-2xl animate-fade-up">
      <PageHeader title="Configurações da plataforma" />
      <Card className="p-5">
        <SettingsForm settings={data!} />
      </Card>
      <Card className="mt-4 space-y-2 p-5 text-sm text-ink-600">
        <h2 className="font-bold text-ink-900">Integrações futuras</h2>
        <p><strong>Gateway PIX/cartão:</strong> implemente <code>PixGateway</code> em <code>src/services/payments</code> e configure <code>PAYMENT_PROVIDER</code>. O webhook já tem rota reservada em <code>/api/payments/pix/webhook</code>.</p>
        <p><strong>Web Push:</strong> configure as chaves VAPID; o service worker (<code>public/sw.js</code>) já trata eventos <code>push</code>.</p>
      </Card>
    </div>
  );
}
