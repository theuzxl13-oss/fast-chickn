"use client";

import { useEffect, useRef } from "react";
import { X } from "lucide-react";
import { cn } from "@/utils/cn";

/** Modal acessível: bottom sheet no celular, diálogo centralizado no desktop. */
export function Modal({
  open,
  onClose,
  title,
  children,
  footer,
  className,
}: {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
}) {
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    panelRef.current?.focus();
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center md:items-center md:p-6" role="presentation">
      <div className="absolute inset-0 bg-ink-900/50 backdrop-blur-[2px] animate-fade-up" onClick={onClose} aria-hidden />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        className={cn(
          "relative flex max-h-[92dvh] w-full flex-col overflow-hidden rounded-t-4xl bg-white shadow-lift outline-none",
          "animate-slide-up md:max-w-lg md:rounded-4xl md:animate-fade-up",
          className,
        )}
      >
        {title && (
          <div className="flex items-center justify-between gap-4 border-b border-ink-100 px-5 py-4">
            <h2 className="text-base font-bold text-ink-900">{title}</h2>
            <button
              type="button"
              onClick={onClose}
              className="grid h-9 w-9 place-items-center rounded-full bg-ink-50 text-ink-700 hover:bg-ink-100"
              aria-label="Fechar"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        )}
        <div className="flex-1 overflow-y-auto overscroll-contain">{children}</div>
        {footer && <div className="border-t border-ink-100 bg-white p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">{footer}</div>}
      </div>
    </div>
  );
}
