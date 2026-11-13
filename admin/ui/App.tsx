import { useCallback, useEffect, useMemo, useState } from "react";
import { parseLinktree } from "../../src/domain/link/services/parseLinktree.ts";
import { api, ApiError, type Info, type PublishState } from "./api.ts";
import { LinksEditor, ProfileEditor, SocialsEditor } from "./Editors.tsx";
import { Button } from "./fields.tsx";
import { cleanForSave, type RawLinktree } from "./model.ts";

interface Loaded {
  data: RawLinktree;
  sha: string;
}

export function App() {
  const [info, setInfo] = useState<Info | null>(null);
  const [saved, setSaved] = useState<Loaded | null>(null);
  const [draft, setDraft] = useState<RawLinktree | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveErrors, setSaveErrors] = useState<string[]>([]);
  const [publish, setPublish] = useState<PublishState | null>(null);

  const load = useCallback(async () => {
    try {
      const [loadedInfo, file, state] = await Promise.all([
        api.info(),
        api.load(),
        api.publish(),
      ]);
      setInfo(loadedInfo);
      setSaved(file);
      setDraft(file.data);
      setPublish(state);
      setLoadError(null);
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : String(error));
    }
  }, []);

  useEffect(() => {
    // Chargement initial : l'état n'est posé qu'une fois la réponse reçue.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  // Suivi de la pipeline puis du déploiement tant qu'ils sont en cours.
  const inProgress = publish?.step === "pipeline" || publish?.step === "deploy";
  useEffect(() => {
    if (!inProgress) return;
    const timer = setInterval(() => {
      api
        .publish()
        .then(setPublish)
        .catch(() => undefined);
    }, 5000);
    return () => clearInterval(timer);
  }, [inProgress]);

  const cleaned = useMemo(() => (draft ? cleanForSave(draft) : null), [draft]);
  const dirty =
    cleaned !== null &&
    saved !== null &&
    JSON.stringify(cleaned) !== JSON.stringify(cleanForSave(saved.data));
  const errors = useMemo(() => {
    if (!cleaned) return [];
    const result = parseLinktree(cleaned);
    return result.ok ? [] : result.errors;
  }, [cleaned]);

  async function save() {
    if (!cleaned || !saved) return;
    setSaving(true);
    setSaveErrors([]);
    try {
      const result = await api.save(cleaned, saved.sha);
      setSaved({ data: cleaned, sha: result.sha });
      setPublish({
        commit: result.commit,
        step: "pipeline",
        message: "Commit poussé, en attente de la pipeline GitHub…",
      });
    } catch (error) {
      if (error instanceof ApiError) {
        setSaveErrors(error.errors.length > 0 ? error.errors : [error.message]);
      } else {
        setSaveErrors([String(error)]);
      }
    } finally {
      setSaving(false);
    }
  }

  if (loadError) {
    return (
      <Shell>
        <p className="rounded-xl border border-red-400/40 bg-red-950/30 p-4 text-sm text-red-200">
          Impossible de charger links.json : {loadError}
        </p>
        <Button className="mt-4" onClick={() => void load()}>
          Réessayer
        </Button>
      </Shell>
    );
  }
  if (!draft || !info) {
    return (
      <Shell>
        <p className="text-sm text-white/50">Chargement…</p>
      </Shell>
    );
  }

  const shown = [...errors, ...saveErrors];
  return (
    <Shell info={info}>
      <PublishBanner state={publish} />
      <div className="space-y-6 pb-32">
        <ProfileEditor data={draft} onChange={setDraft} />
        <SocialsEditor data={draft} onChange={setDraft} />
        <LinksEditor data={draft} onChange={setDraft} />
      </div>

      <div className="fixed inset-x-0 bottom-0 border-t border-ink-line bg-ink/95 backdrop-blur">
        <div className="mx-auto max-w-3xl px-4 py-3">
          {shown.length > 0 && (
            <ul className="mb-3 max-h-32 list-disc space-y-0.5 overflow-auto pl-5 text-xs text-red-300">
              {shown.map((message) => (
                <li key={message}>{message}</li>
              ))}
            </ul>
          )}
          <div className="flex items-center justify-between gap-3">
            <span className="text-sm text-white/50">
              {dirty ? "Modifications non enregistrées" : "Tout est enregistré"}
            </span>
            <div className="flex gap-2">
              <Button
                disabled={!dirty || saving}
                onClick={() => setDraft(saved?.data ?? draft)}
              >
                Annuler
              </Button>
              <Button
                variant="primary"
                disabled={!dirty || errors.length > 0 || saving || inProgress}
                onClick={() => void save()}
              >
                {saving ? "Enregistrement…" : "Enregistrer et publier"}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </Shell>
  );
}

function Shell({ info, children }: { info?: Info; children: React.ReactNode }) {
  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <header className="mb-6">
        <h1 className="text-2xl font-bold">
          Linktree <span className="text-brand-bright">admin</span>
        </h1>
        {info && (
          <p className="mt-1 text-sm text-white/50">
            Les modifications sont commitées sur{" "}
            <code className="text-white/70">
              {info.repo}@{info.branch}
            </code>
            {info.deploys
              ? ", puis le site est redéployé automatiquement."
              : " ; le redéploiement Dockhand n'est pas configuré."}
          </p>
        )}
      </header>
      {children}
    </main>
  );
}

function PublishBanner({ state }: { state: PublishState | null }) {
  if (!state) return null;
  const tone =
    state.step === "error"
      ? "border-red-400/40 bg-red-950/30 text-red-200"
      : state.step === "done"
        ? "border-emerald-400/40 bg-emerald-950/30 text-emerald-200"
        : "border-brand/50 bg-brand/10 text-brand-bright";
  return (
    <div className={`mb-6 rounded-xl border p-4 text-sm ${tone}`} role="status">
      <p>{state.message}</p>
      <p className="mt-1 text-xs opacity-70">
        Commit {state.commit.slice(0, 7)}
        {state.runUrl && (
          <>
            {" · "}
            <a
              className="underline"
              href={state.runUrl}
              target="_blank"
              rel="noopener noreferrer"
            >
              voir la pipeline
            </a>
          </>
        )}
      </p>
    </div>
  );
}
