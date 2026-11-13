import { useRef, useState, type ReactNode } from "react";
import { api, ApiError } from "./api.ts";
import { Button, Field } from "./fields.tsx";
import { prepareImage } from "./image.ts";

/** Champ image : saisie libre (URL, chemin de public/) ou téléversement vers public/links/. */
export function ImageField({
  label,
  hint,
  value,
  onChange,
}: {
  label: string;
  hint?: ReactNode;
  value: string | undefined;
  onChange: (value: string) => void;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function upload(file: File) {
    setBusy(true);
    setError(null);
    try {
      const prepared = await prepareImage(file);
      const { path } = await api.upload(prepared.name, prepared.data);
      onChange(path);
    } catch (e) {
      setError(
        e instanceof ApiError && e.errors.length > 0
          ? e.errors.join(" ")
          : e instanceof Error
            ? e.message
            : String(e),
      );
    } finally {
      setBusy(false);
      if (input.current) input.current.value = "";
    }
  }

  const preview = value && /^https?:\/\//.test(value) ? value : null;
  return (
    <Field
      label={label}
      hint={error ? <span className="text-danger">{error}</span> : hint}
    >
      <div className="flex gap-2">
        {preview && (
          <img
            src={preview}
            alt=""
            className="h-9 w-9 shrink-0 rounded-lg border border-ink-line object-cover"
            onError={(event) => (event.currentTarget.style.display = "none")}
          />
        )}
        <input
          className="text-fg placeholder:text-fg/30 w-full min-w-0 rounded-lg border border-ink-line bg-ink px-3 py-2 text-sm focus:border-brand-bright focus:outline-none"
          value={value ?? ""}
          onChange={(event) => onChange(event.target.value)}
        />
        <Button
          disabled={busy}
          onClick={(event) => {
            event.preventDefault();
            input.current?.click();
          }}
        >
          {busy ? "Envoi…" : "Téléverser"}
        </Button>
        <input
          ref={input}
          type="file"
          accept="image/png,image/jpeg,image/webp,image/gif,image/avif,image/svg+xml"
          hidden
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) void upload(file);
          }}
        />
      </div>
    </Field>
  );
}
