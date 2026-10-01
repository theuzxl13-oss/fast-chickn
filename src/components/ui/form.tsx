import { forwardRef, type InputHTMLAttributes, type SelectHTMLAttributes, type TextareaHTMLAttributes } from "react";
import { cn } from "@/utils/cn";

const fieldBase =
  "w-full rounded-2xl border border-ink-200 bg-white px-4 text-sm text-ink-900 placeholder:text-ink-400 " +
  "transition focus:border-brand-400 focus:outline-none focus:ring-4 focus:ring-brand-100 disabled:bg-ink-50 " +
  "aria-[invalid=true]:border-red-400 aria-[invalid=true]:ring-red-100";

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(function Input(
  { className, ...props },
  ref,
) {
  return <input ref={ref} className={cn(fieldBase, "h-12", className)} {...props} />;
});

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(function Textarea(
  { className, ...props },
  ref,
) {
  return <textarea ref={ref} className={cn(fieldBase, "min-h-[96px] py-3", className)} {...props} />;
});

export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(function Select(
  { className, children, ...props },
  ref,
) {
  return (
    <select ref={ref} className={cn(fieldBase, "h-12 appearance-none bg-[length:16px] pr-10", className)} {...props}>
      {children}
    </select>
  );
});

export function Field({
  label,
  htmlFor,
  error,
  hint,
  className,
  children,
}: {
  label: string;
  htmlFor?: string;
  error?: string;
  hint?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <label htmlFor={htmlFor} className="block text-sm font-semibold text-ink-800">
        {label}
      </label>
      {children}
      {error ? (
        <p className="text-xs font-medium text-red-600" role="alert">
          {error}
        </p>
      ) : hint ? (
        <p className="text-xs text-ink-500">{hint}</p>
      ) : null}
    </div>
  );
}

export function Toggle({
  name,
  defaultChecked,
  checked,
  onChange,
  label,
  description,
}: {
  name?: string;
  defaultChecked?: boolean;
  checked?: boolean;
  onChange?: (value: boolean) => void;
  label: string;
  description?: string;
}) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-4 rounded-2xl border border-ink-100 bg-white p-4">
      <span>
        <span className="block text-sm font-semibold text-ink-900">{label}</span>
        {description && <span className="block text-xs text-ink-500">{description}</span>}
      </span>
      <span className="relative inline-flex">
        <input
          type="checkbox"
          name={name}
          className="peer sr-only"
          defaultChecked={defaultChecked}
          checked={checked}
          onChange={onChange ? (e) => onChange(e.target.checked) : undefined}
        />
        <span className="h-7 w-12 rounded-full bg-ink-200 transition peer-checked:bg-brand-500 peer-focus-visible:ring-4 peer-focus-visible:ring-brand-100" />
        <span className="absolute left-1 top-1 h-5 w-5 rounded-full bg-white shadow transition peer-checked:translate-x-5" />
      </span>
    </label>
  );
}

export function FormMessage({ error, success }: { error?: string | null; success?: string | null }) {
  if (!error && !success) return null;
  return (
    <div
      role={error ? "alert" : "status"}
      className={cn(
        "rounded-2xl px-4 py-3 text-sm font-medium",
        error ? "bg-red-50 text-red-700" : "bg-emerald-50 text-emerald-700",
      )}
    >
      {error ?? success}
    </div>
  );
}
