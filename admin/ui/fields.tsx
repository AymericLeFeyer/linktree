import { useState, type ReactNode } from "react";

const INPUT =
  "w-full rounded-lg border border-ink-line bg-ink px-3 py-2 text-sm text-fg placeholder:text-fg/30 focus:border-brand-bright focus:outline-none";

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
      <span className="text-fg/60 mb-1 block text-xs font-medium">{label}</span>
      {children}
      {hint && <span className="text-fg/40 mt-1 block text-xs">{hint}</span>}
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
  summary,
  action,
  collapsible = false,
  children,
}: {
  title: string;
  /** Résumé affiché à côté du titre quand la section est repliée. */
  summary?: ReactNode;
  action?: ReactNode;
  /** Section repliable, repliée au départ. */
  collapsible?: boolean;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(!collapsible);
  return (
    <section className="rounded-2xl border border-ink-line bg-ink-soft p-5">
      <div
        className={`flex items-center justify-between gap-3 ${open ? "mb-4" : ""}`}
      >
        {collapsible ? (
          <button
            type="button"
            aria-expanded={open}
            onClick={() => setOpen(!open)}
            className="flex min-w-0 flex-1 items-center gap-2 text-left"
          >
            <span
              aria-hidden
              className={`text-fg/50 transition-transform ${open ? "rotate-90" : ""}`}
            >
              ▸
            </span>
            <h2 className="text-lg font-semibold">{title}</h2>
            {!open && summary && (
              <span className="text-fg/50 truncate text-sm">{summary}</span>
            )}
          </button>
        ) : (
          <h2 className="text-lg font-semibold">{title}</h2>
        )}
        {(open || !collapsible) && action}
      </div>
      {open && children}
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
      "border border-ink-line text-fg/80 hover:border-brand hover:text-fg disabled:opacity-30",
    danger: "border border-ink-line text-danger hover:border-danger",
  }[variant];
  return (
    <button
      type="button"
      {...props}
      className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors disabled:cursor-not-allowed ${styles} ${props.className ?? ""}`}
    />
  );
}
