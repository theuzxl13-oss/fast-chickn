import { requireUser } from "@/lib/auth";
import { signOutAction } from "@/app/actions/auth";
import { BackHeader } from "@/components/layout/back-header";
import { NotificationSettings } from "@/components/account/notification-settings";
import { Button } from "@/components/ui/button";

export const metadata = { title: "Configurações" };

export default async function SettingsPage() {
  const { profile } = await requireUser("/conta/configuracoes");
  return (
    <div className="mx-auto max-w-lg space-y-4 animate-fade-up">
      <BackHeader href="/conta" title="Configurações" />
      <NotificationSettings enabled={profile.notifications_enabled} />
      <form action={signOutAction}>
        <Button type="submit" variant="outline" className="w-full text-red-600">
          Sair da conta
        </Button>
      </form>
    </div>
  );
}
