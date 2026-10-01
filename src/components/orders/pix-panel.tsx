"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import QRCode from "qrcode";
import { CheckCircle2, Copy, QrCode, RefreshCw } from "lucide-react";
import { createPixChargeAction, simulatePixPaymentAction } from "@/app/actions/orders";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/misc";
import { useToast } from "@/components/ui/toast";
import type { Payment } from "@/types";
import { formatCurrency, formatTime } from "@/utils/format";

export function PixPanel({ orderId, payment: initial, total }: { orderId: string; payment: Payment; total: number }) {
  const [payment, setPayment] = useState(initial);
  const [qr, setQr] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const router = useRouter();
  const toast = useToast();

  useEffect(() => setPayment(initial), [initial]);

  const generate = useCallback(() => {
    start(async () => {
      const res = await createPixChargeAction(orderId);
      if (res.ok && res.data) {
        setPayment(res.data);
        setError(null);
      } else if (!res.ok) setError(res.error);
    });
  }, [orderId]);

  // Gera a cobrança automaticamente ao abrir a página
  useEffect(() => {
    if (payment.status === "pending" && (!payment.pix_copy_paste || (payment.pix_expires_at && new Date(payment.pix_expires_at) < new Date()))) {
      generate();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!payment.pix_copy_paste) return;
    QRCode.toDataURL(payment.pix_copy_paste, { margin: 1, width: 240, color: { dark: "#17130F", light: "#FFFFFF" } })
      .then(setQr)
      .catch(() => setQr(null));
  }, [payment.pix_copy_paste]);

  if (payment.status === "paid") {
    return (
      <Card className="mt-4 flex items-center gap-3 border-emerald-200 bg-emerald-50 p-5">
        <CheckCircle2 className="h-8 w-8 text-emerald-600" aria-hidden />
        <div>
          <p className="font-bold text-emerald-800">Pagamento PIX aprovado</p>
          <p className="text-sm text-emerald-700">{formatCurrency(payment.amount)} recebidos com sucesso.</p>
        </div>
      </Card>
    );
  }

  if (payment.status !== "pending") return null;

  const isDemo = payment.provider === "demo";

  return (
    <Card className="mt-4 p-5">
      <div className="flex items-center gap-2">
        <QrCode className="h-5 w-5 text-brand-500" aria-hidden />
        <h2 className="font-bold">Pague com PIX · {formatCurrency(total)}</h2>
      </div>
      {isDemo && (
        <p className="mt-2 rounded-2xl bg-sky-50 px-3 py-2 text-xs text-sky-800">
          <strong>Ambiente de demonstração:</strong> este QR Code é fictício e não realiza cobranças. A integração com
          um gateway real está preparada em <code>src/services/payments</code>.
        </p>
      )}
      {error && <p className="mt-3 text-sm font-medium text-red-600">{error}</p>}

      {payment.pix_copy_paste ? (
        <div className="mt-4 grid gap-4 md:grid-cols-[240px_1fr] md:items-center">
          <div className="mx-auto grid h-60 w-60 place-items-center rounded-3xl border border-ink-100 bg-white p-2">
            {qr ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={qr} alt="QR Code PIX" className="h-full w-full" />
            ) : (
              <span className="text-sm text-ink-400">Gerando QR Code…</span>
            )}
          </div>
          <div className="space-y-3">
            <div>
              <p className="mb-1 text-sm font-semibold">PIX copia e cola</p>
              <p className="break-all rounded-2xl bg-ink-50 p-3 font-mono text-[11px] text-ink-600">{payment.pix_copy_paste}</p>
            </div>
            {payment.pix_expires_at && (
              <p className="text-xs text-ink-500">Válido até {formatTime(payment.pix_expires_at)}</p>
            )}
            <div className="flex flex-wrap gap-2">
              <Button
                variant="dark"
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(payment.pix_copy_paste!);
                    toast("Código PIX copiado!");
                  } catch {
                    toast("Não foi possível copiar.", "error");
                  }
                }}
              >
                <Copy className="h-4 w-4" aria-hidden /> Copiar código
              </Button>
              <Button variant="outline" onClick={() => router.refresh()}>
                <RefreshCw className="h-4 w-4" aria-hidden /> Verificar pagamento
              </Button>
            </div>
            {isDemo && (
              <Button
                variant="success"
                className="w-full"
                loading={pending}
                onClick={() =>
                  start(async () => {
                    const res = await simulatePixPaymentAction(orderId);
                    if (res.ok && res.data) {
                      setPayment(res.data);
                      toast("Pagamento aprovado (demonstração)");
                      router.refresh();
                    } else if (!res.ok) toast(res.error, "error");
                  })
                }
              >
                Simular pagamento aprovado (demo)
              </Button>
            )}
          </div>
        </div>
      ) : (
        <Button className="mt-4" loading={pending} onClick={generate}>
          Gerar QR Code PIX
        </Button>
      )}
    </Card>
  );
}
