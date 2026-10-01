import Link from "next/link";
import { SignUpForm } from "@/components/auth/signup-form";

export const metadata = { title: "Criar conta" };

export default async function SignUpPage({ searchParams }: { searchParams: Promise<{ tipo?: string }> }) {
  const { tipo } = await searchParams;
  return (
    <>
      <h1 className="text-3xl font-extrabold tracking-tight">Crie sua conta</h1>
      <p className="mt-1 text-ink-500">Leva menos de um minuto.</p>
      <div className="mt-8">
        <SignUpForm defaultType={tipo === "restaurante" ? "restaurant" : "client"} />
      </div>
      <p className="mt-6 text-center text-sm text-ink-600">
        Já tem conta?{" "}
        <Link href="/login" className="font-bold text-brand-600 hover:underline">
          Entrar
        </Link>
      </p>
    </>
  );
}
