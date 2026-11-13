import type { ReactNode } from "react";

const INPUT =
  "w-full rounded-lg border border-ink-line bg-ink px-3 py-2 text-sm text-white placeholder:text-white/30 focus:border-brand-bright focus:outline-none";

export function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: ReactNode;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-white/60">
        {label}
      </span>
      {children}
      {hint && <span className="mt-1 block text-xs text-white/40">{hint}</span>}
    </label>
  );
}

export function TextInput({
  label,
  hint,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  hint?: ReactNode;
  value: string | undefined;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  return (
    <Field label={label} hint={hint}>
      <input
        className={INPUT}
        value={value ?? ""}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
      />
    </Field>
  );
}

export function Card({
  title,
  action,
  children,
}: {
  title: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-ink-line bg-ink-soft p-5">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

export function Button({
  variant = "ghost",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "ghost" | "danger";
}) {
  const styles = {
    primary: "bg-brand text-white hover:bg-brand-deep disabled:opacity-40",
    ghost:
      "border border-ink-line text-white/80 hover:border-brand hover:text-white disabled:opacity-30",
    danger:
      "border border-ink-line text-red-300 hover:border-red-400 hover:text-red-200",
  }[variant];
  return (
    <button
      type="button"
      {...props}
      className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors disabled:cursor-not-allowed ${styles} ${props.className ?? ""}`}
    />
  );
}
