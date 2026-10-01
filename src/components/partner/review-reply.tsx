"use client";

import { useState, useTransition } from "react";
import { replyReviewAction } from "@/app/actions/partner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/form";
import { useToast } from "@/components/ui/toast";

export function ReviewReply({ reviewId, reply }: { reviewId: string; reply: string | null }) {
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(reply ?? "");
  const [saved, setSaved] = useState(reply);
  const [pending, start] = useTransition();
  const toast = useToast();

  if (!editing) {
    return saved ? (
      <div className="mt-3 rounded-2xl bg-ink-50 p-3 text-sm">
        <p className="text-xs font-semibold text-ink-500">Sua resposta</p>
        <p className="text-ink-700">{saved}</p>
        <button type="button" onClick={() => setEditing(true)} className="mt-1 text-xs font-semibold text-brand-600">Editar</button>
      </div>
    ) : (
      <Button size="sm" variant="soft" className="mt-3" onClick={() => setEditing(true)}>
        Responder
      </Button>
    );
  }

  return (
    <div className="mt-3 space-y-2">
      <Textarea value={text} onChange={(e) => setText(e.target.value)} maxLength={1000} placeholder="Agradeça e responda com cordialidade" aria-label="Resposta" />
      <div className="flex gap-2">
        <Button size="sm" variant="ghost" onClick={() => setEditing(false)}>Cancelar</Button>
        <Button
          size="sm"
          loading={pending}
          onClick={() =>
            start(async () => {
              const res = await replyReviewAction(reviewId, text);
              toast(res.ok ? res.message! : res.error, res.ok ? "success" : "error");
              if (res.ok) {
                setSaved(text.trim() || null);
                setEditing(false);
              }
            })
          }
        >
          Publicar resposta
        </Button>
      </div>
    </div>
  );
}
