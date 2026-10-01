import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { BackHeader } from "@/components/layout/back-header";
import { AddressManager } from "@/components/account/address-manager";
import { safeRedirect } from "@/utils/sanitize";
import type { Address } from "@/types";

export const metadata = { title: "Meus endereços" };

export default async function AddressesPage({ searchParams }: { searchParams: Promise<{ novo?: string; next?: string }> }) {
  const { novo, next } = await searchParams;
  const { user } = await requireUser("/conta/enderecos");
  const supabase = await createClient();
  const { data } = await supabase
    .from("addresses")
    .select("*")
    .eq("user_id", user.id)
    .order("is_default", { ascending: false })
    .order("created_at");

  const addresses = (data ?? []) as Address[];

  return (
    <div className="mx-auto max-w-lg animate-fade-up">
      <BackHeader href="/conta" title="Meus endereços" description="Onde você quer receber seus pedidos?" />
      <AddressManager
        addresses={addresses}
        startOpen={novo === "1" || addresses.length === 0}
        next={next ? safeRedirect(next, "") || null : null}
      />
    </div>
  );
}
