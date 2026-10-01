import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export function BackHeader({ href, title, description }: { href: string; title: string; description?: string }) {
  return (
    <div className="mb-6 flex items-start gap-3">
      <Link href={href} className="mt-0.5 grid h-10 w-10 shrink-0 place-items-center rounded-full bg-white shadow-soft hover:bg-ink-50" aria-label="Voltar">
        <ArrowLeft className="h-5 w-5" />
      </Link>
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight">{title}</h1>
        {description && <p className="text-sm text-ink-500">{description}</p>}
      </div>
    </div>
  );
}
