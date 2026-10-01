"use client";

import { useEffect } from "react";
import { Button, LinkButton } from "@/components/ui/button";

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  const notConfigured = error.message?.includes("Supabase não configurado");

  return (
    <main className="grid min-h-[70dvh] place-items-center p-6 text-center">
      <div className="max-w-md">
        <p className="text-6xl" aria-hidden>😵</p>
        <h1 className="mt-4 text-2xl font-extrabold">Algo deu errado</h1>
        <p className="mt-1 text-ink-500">
          {notConfigured
            ? "O Supabase ainda não foi configurado. Copie .env.example para .env.local e preencha as chaves."
            : "Não foi possível carregar esta página. Tente novamente em instantes."}
        </p>
        {error.digest && <p className="mt-2 text-xs text-ink-400">Código: {error.digest}</p>}
        <div className="mt-6 flex justify-center gap-2">
          <Button onClick={reset}>Tentar novamente</Button>
          <LinkButton href="/" variant="outline">Início</LinkButton>
        </div>
      </div>
    </main>
  );
}
