import { Logo } from "@/components/brand/logo";

export const metadata = { title: "Sem conexão" };

export default function OfflinePage() {
  return (
    <main className="grid min-h-dvh place-items-center p-6 text-center">
      <div>
        <Logo />
        <h1 className="mt-8 text-2xl font-extrabold">Você está sem internet</h1>
        <p className="mt-2 text-ink-500">Verifique sua conexão e tente novamente. Seu carrinho continua salvo.</p>
      </div>
    </main>
  );
}
