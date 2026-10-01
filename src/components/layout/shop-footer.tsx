import Link from "next/link";
import { Logo } from "@/components/brand/logo";
import { BRAND } from "@/lib/constants";

export function ShopFooter() {
  return (
    <footer className="hidden border-t border-ink-100 bg-white md:block">
      <div className="mx-auto grid max-w-6xl gap-8 px-6 py-10 md:grid-cols-4">
        <div className="md:col-span-2">
          <Logo />
          <p className="mt-3 max-w-xs text-sm text-ink-500">{BRAND.slogan}</p>
        </div>
        <div>
          <h3 className="text-sm font-bold">FAST CHICKN</h3>
          <ul className="mt-3 space-y-2 text-sm text-ink-500">
            <li><Link href="/busca" className="hover:text-ink-900">Restaurantes</Link></li>
            <li><Link href="/conta/cupons" className="hover:text-ink-900">Cupons</Link></li>
            <li><Link href="/conta/ajuda" className="hover:text-ink-900">Ajuda</Link></li>
          </ul>
        </div>
        <div>
          <h3 className="text-sm font-bold">Parceiros</h3>
          <ul className="mt-3 space-y-2 text-sm text-ink-500">
            <li><Link href="/cadastro?tipo=restaurante" className="hover:text-ink-900">Cadastre seu restaurante</Link></li>
            <li><Link href="/parceiro" className="hover:text-ink-900">Portal do parceiro</Link></li>
          </ul>
        </div>
      </div>
      <p className="border-t border-ink-100 py-4 text-center text-xs text-ink-400">
        © {new Date().getFullYear()} FAST CHICKN. Todos os direitos reservados.
      </p>
    </footer>
  );
}
