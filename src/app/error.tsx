"use client";

import { useEffect } from "react";
import { Button, LinkButton } from "@/components/ui/button";
import { supabaseEnvProblems } from "@/lib/env";

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  // Em produção o Next.js oculta a mensagem de erros do servidor; por isso o
  // diagnóstico de configuração vem do próprio bundle (variáveis públicas).
  const configProblems = supabaseEnvProblems();

  return (
    <main className="grid min-h-[70dvh] place-items-center p-6 text-center">
      <div className="max-w-md">
        <p className="text-6xl" aria-hidden>😵</p>
        <h1 className="mt-4 text-2xl font-extrabold">Algo deu errado</h1>
        {configProblems.length ? (
          <div className="mt-2 rounded-2xl bg-red-50 p-4 text-left text-sm text-red-800">
            <p className="font-bold">Configuração do Supabase incompleta:</p>
            <ul className="mt-1 list-disc pl-5">
              {configProblems.map((p) => (
                <li key={p}>{p}</li>
              ))}
            </ul>
            <p className="mt-2 text-xs">Corrija as variáveis de ambiente na hospedagem e faça um novo deploy.</p>
          </div>
        ) : (
          <p className="mt-1 text-ink-500">Não foi possível carregar esta página. Tente novamente em instantes.</p>
        )}
        {error.digest && <p className="mt-2 text-xs text-ink-400">Código: {error.digest}</p>}
        <div className="mt-6 flex justify-center gap-2">
          <Button onClick={reset}>Tentar novamente</Button>
          <LinkButton href="/" variant="outline">Início</LinkButton>
        </div>
      </div>
    </main>
  );
}
