import { Logo } from "@/components/brand/logo";
import { BRAND } from "@/lib/constants";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-dvh md:grid-cols-2">
      <aside className="speed-lines relative hidden overflow-hidden bg-brand-500 p-12 text-white md:flex md:flex-col md:justify-between">
        <Logo inverted />
        <div>
          <p className="text-5xl font-black italic leading-[1.05] tracking-tight">
            Seu pedido.
            <br />
            Rápido. Fácil.
            <br />
            <span className="text-accent-300">Do seu jeito.</span>
          </p>
          <p className="mt-6 max-w-sm text-white/85">
            Os melhores restaurantes da sua região, entrega acompanhada em tempo real e cupons toda semana.
          </p>
        </div>
        <p className="text-sm text-white/70">© {new Date().getFullYear()} {BRAND.name}</p>
        <span className="pointer-events-none absolute -bottom-10 -right-6 text-[14rem] opacity-20" aria-hidden>
          🍗
        </span>
      </aside>
      <main className="flex flex-col items-center justify-center bg-white px-5 py-10">
        <div className="mb-8 md:hidden">
          <Logo />
        </div>
        <div className="w-full max-w-sm animate-fade-up">{children}</div>
      </main>
    </div>
  );
}
