import { Logo } from "@/components/brand/logo";
import { LinkButton } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main className="grid min-h-dvh place-items-center p-6 text-center">
      <div>
        <Logo />
        <p className="mt-10 text-7xl" aria-hidden>🍗</p>
        <h1 className="mt-4 text-2xl font-extrabold">Página não encontrada</h1>
        <p className="mt-1 text-ink-500">Esse link pode ter mudado ou não existe mais.</p>
        <LinkButton href="/" className="mt-6">Voltar ao início</LinkButton>
      </div>
    </main>
  );
}
