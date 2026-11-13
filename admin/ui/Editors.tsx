import { useState } from "react";
import { parseExpiry } from "../../src/domain/link/services/expiry.ts";
import { Button, Card, Field, TextInput } from "./fields.tsx";
import {
  SOCIAL_PLATFORMS,
  move,
  type RawLink,
  type RawLinktree,
  type RawSocial,
} from "./model.ts";

interface EditorProps {
  data: RawLinktree;
  onChange: (data: RawLinktree) => void;
}

export function ProfileEditor({ data, onChange }: EditorProps) {
  const set = (patch: Partial<RawLinktree["profile"]>) =>
    onChange({ ...data, profile: { ...data.profile, ...patch } });
  return (
    <Card title="Profil">
      <div className="grid gap-4 sm:grid-cols-2">
        <TextInput
          label="Nom"
          value={data.profile.name}
          onChange={(name) => set({ name })}
        />
        <TextInput
          label="Accroche"
          value={data.profile.tagline}
          onChange={(tagline) => set({ tagline })}
        />
        <div className="sm:col-span-2">
          <TextInput
            label="Description"
            value={data.profile.description}
            onChange={(description) => set({ description })}
          />
        </div>
        <div className="sm:col-span-2">
          <TextInput
            label="Avatar"
            hint="Chemin de public/ (/aylabs.jpg) ou URL https."
            value={data.profile.avatar}
            onChange={(avatar) => set({ avatar })}
          />
        </div>
      </div>
    </Card>
  );
}

export function SocialsEditor({ data, onChange }: EditorProps) {
  const set = (socials: RawSocial[]) => onChange({ ...data, socials });
  const update = (index: number, patch: Partial<RawSocial>) =>
    set(data.socials.map((s, i) => (i === index ? { ...s, ...patch } : s)));
  return (
    <Card
      title="Réseaux"
      action={
        <Button
          onClick={() =>
            set([...data.socials, { platform: "website", url: "https://" }])
          }
        >
          + Ajouter
        </Button>
      }
    >
      <ul className="space-y-3">
        {data.socials.map((social, index) => (
          <li
            key={index}
            className="grid items-end gap-2 sm:grid-cols-[9rem_1fr_9rem_auto]"
          >
            <Field label="Plateforme">
              <select
                className="w-full rounded-lg border border-ink-line bg-ink px-3 py-2 text-sm focus:border-brand-bright focus:outline-none"
                value={social.platform}
                onChange={(event) =>
                  update(index, { platform: event.target.value })
                }
              >
                {SOCIAL_PLATFORMS.map((platform) => (
                  <option key={platform}>{platform}</option>
                ))}
              </select>
            </Field>
            <TextInput
              label="URL"
              value={social.url}
              onChange={(url) => update(index, { url })}
            />
            <TextInput
              label="Libellé"
              value={social.label}
              onChange={(label) => update(index, { label })}
            />
            <RowActions
              index={index}
              count={data.socials.length}
              onMove={(to) => set(move(data.socials, index, to))}
              onRemove={() => set(data.socials.filter((_, i) => i !== index))}
            />
          </li>
        ))}
        {data.socials.length === 0 && (
          <li className="text-sm text-white/40">Aucun réseau.</li>
        )}
      </ul>
    </Card>
  );
}

export function LinksEditor({ data, onChange }: EditorProps) {
  const set = (links: RawLink[]) => onChange({ ...data, links });
  const update = (index: number, patch: Partial<RawLink>) =>
    set(data.links.map((l, i) => (i === index ? { ...l, ...patch } : l)));
  return (
    <Card
      title={`Liens (${data.links.length})`}
      action={
        <Button
          variant="primary"
          onClick={() => set([{ title: "", url: "https://" }, ...data.links])}
        >
          + Nouveau lien
        </Button>
      }
    >
      <ul className="space-y-4">
        {data.links.map((link, index) => (
          <li
            key={index}
            className="rounded-xl border border-ink-line bg-ink/40 p-4"
          >
            <div className="grid gap-3 sm:grid-cols-2">
              <TextInput
                label="Titre"
                value={link.title}
                onChange={(title) => update(index, { title })}
              />
              <TextInput
                label="URL"
                value={link.url}
                onChange={(url) => update(index, { url })}
              />
              <div className="sm:col-span-2">
                <TextInput
                  label="Description"
                  value={link.description}
                  onChange={(description) => update(index, { description })}
                />
              </div>
              <TextInput
                label="Image"
                hint="URL https ou chemin de public/ (/links/x.webp)."
                value={link.image}
                onChange={(image) => update(index, { image })}
              />
              <TextInput
                label="Fin d'affichage"
                placeholder="2026-12-31 ou 2026-12-31T18:00"
                hint={<ExpiryHint value={link.expiresAt} />}
                value={link.expiresAt ?? ""}
                onChange={(expiresAt) => update(index, { expiresAt })}
              />
            </div>
            <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
              <label className="flex items-center gap-2 text-sm text-white/70">
                <input
                  type="checkbox"
                  className="accent-brand"
                  checked={link.featured === true}
                  onChange={(event) =>
                    update(index, { featured: event.target.checked })
                  }
                />
                À la une (grande carte)
              </label>
              <RowActions
                index={index}
                count={data.links.length}
                onMove={(to) => set(move(data.links, index, to))}
                onRemove={() => {
                  if (confirm(`Supprimer « ${link.title || "ce lien"} » ?`)) {
                    set(data.links.filter((_, i) => i !== index));
                  }
                }}
              />
            </div>
          </li>
        ))}
      </ul>
    </Card>
  );
}

function RowActions({
  index,
  count,
  onMove,
  onRemove,
}: {
  index: number;
  count: number;
  onMove: (to: number) => void;
  onRemove: () => void;
}) {
  return (
    <div className="flex gap-1.5">
      <Button
        aria-label="Monter"
        disabled={index === 0}
        onClick={() => onMove(index - 1)}
      >
        ↑
      </Button>
      <Button
        aria-label="Descendre"
        disabled={index === count - 1}
        onClick={() => onMove(index + 1)}
      >
        ↓
      </Button>
      <Button variant="danger" aria-label="Supprimer" onClick={onRemove}>
        ✕
      </Button>
    </div>
  );
}

const PARIS_DATE = new Intl.DateTimeFormat("fr-FR", {
  dateStyle: "full",
  timeStyle: "short",
  timeZone: "Europe/Paris",
});

function ExpiryHint({ value }: { value: string | null | undefined }) {
  const [now] = useState(Date.now);
  if (!value?.trim()) return <>Vide = le lien reste affiché.</>;
  const instant = parseExpiry(value);
  if (instant === null) {
    return <span className="text-red-300">Date illisible.</span>;
  }
  const label = `disparaît le ${PARIS_DATE.format(instant)} (Paris)`;
  return instant <= now ? (
    <span className="text-amber-300">Déjà expiré : {label}</span>
  ) : (
    <>{label[0].toUpperCase() + label.slice(1)}</>
  );
}
