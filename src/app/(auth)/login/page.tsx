import Link from "next/link";
import { LoginForm } from "@/components/auth/login-form";
import { safeRedirect } from "@/utils/sanitize";

export const metadata = { title: "Entrar" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string; erro?: string }> }) {
  const { next, erro } = await searchParams;
  return (
    <>
      <h1 className="text-3xl font-extrabold tracking-tight">Que bom te ver!</h1>
      <p className="mt-1 text-ink-500">Entre para pedir e acompanhar suas entregas.</p>
      {erro && (
        <p className="mt-4 rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700">
          Não foi possível validar o link. Tente entrar novamente.
        </p>
      )}
      <div className="mt-8">
        <LoginForm next={next ? safeRedirect(next, "/") : ""} />
      </div>
      <p className="mt-6 text-center text-sm text-ink-600">
        Ainda não tem conta?{" "}
        <Link href={`/cadastro${next ? `?next=${encodeURIComponent(next)}` : ""}`} className="font-bold text-brand-600 hover:underline">
          Criar conta
        </Link>
      </p>
      <p className="mt-2 text-center text-sm">
        <Link href="/" className="text-ink-500 hover:text-ink-900">
          Continuar sem entrar
        </Link>
      </p>
    </>
  );
}
