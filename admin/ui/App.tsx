import { useCallback, useEffect, useMemo, useState } from "react";
import { parseLinktree } from "../../src/domain/link/services/parseLinktree.ts";
import { api, ApiError, type Info, type PublishState } from "./api.ts";
import { LinksEditor, ProfileEditor, SocialsEditor } from "./Editors.tsx";
import { Button } from "./fields.tsx";
import { Login } from "./Login.tsx";
import { cleanForSave, type RawLinktree } from "./model.ts";
import { applyPref, nextPref, readPref, type ThemePref } from "./theme.ts";

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
  const [login, setLogin] = useState<string | null>(null);
  const [needsLogin, setNeedsLogin] = useState(false);

  const load = useCallback(async () => {
    try {
      const loadedInfo = await api.info();
      setInfo(loadedInfo);
      const session = await api.session();
      const [file, state] = await Promise.all([api.load(), api.publish()]);
      setLogin(session.login);
      setNeedsLogin(false);
      setSaved(file);
      setDraft(file.data);
      setPublish(state);
      setLoadError(null);
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        setNeedsLogin(true);
      } else {
        setLoadError(error instanceof Error ? error.message : String(error));
      }
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
      if (error instanceof ApiError && error.status === 401) {
        setNeedsLogin(true);
      } else if (error instanceof ApiError) {
        setSaveErrors(error.errors.length > 0 ? error.errors : [error.message]);
      } else {
        setSaveErrors([String(error)]);
      }
    } finally {
      setSaving(false);
    }
  }

  if (needsLogin) {
    return (
      <Shell>
        <Login onLoggedIn={() => void load()} />
      </Shell>
    );
  }
  if (loadError) {
    return (
      <Shell>
        <p className="border-danger/40 bg-danger/10 text-danger rounded-xl border p-4 text-sm">
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
        <p className="text-fg/50 text-sm">Chargement…</p>
      </Shell>
    );
  }

  const shown = [...errors, ...saveErrors];
  return (
    <Shell
      info={info}
      login={login}
      onLogout={() => {
        void api.logout().then(() => {
          setDraft(null);
          setSaved(null);
          setNeedsLogin(true);
        });
      }}
    >
      <PublishBanner state={publish} />
      <div className="space-y-6 pb-32">
        <ProfileEditor data={draft} onChange={setDraft} />
        <SocialsEditor data={draft} onChange={setDraft} />
        <LinksEditor data={draft} onChange={setDraft} />
      </div>

      <div className="fixed inset-x-0 bottom-0 border-t border-ink-line bg-ink/95 backdrop-blur">
        <div className="mx-auto max-w-3xl px-4 py-3">
          {shown.length > 0 && (
            <ul className="text-danger mb-3 max-h-32 list-disc space-y-0.5 overflow-auto pl-5 text-xs">
              {shown.map((message) => (
                <li key={message}>{message}</li>
              ))}
            </ul>
          )}
          <div className="flex items-center justify-between gap-3">
            <span className="text-fg/50 text-sm">
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

function Shell({
  info,
  login,
  onLogout,
  children,
}: {
  info?: Info;
  login?: string | null;
  onLogout?: () => void;
  children: React.ReactNode;
}) {
  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <header className="mb-6">
        <div className="flex items-center justify-between gap-3">
          <h1 className="flex items-center gap-3 text-2xl font-bold">
            <img src="/linktree.svg" alt="" className="h-9 w-9" />
            <span>
              Linktree <span className="text-brand-bright">admin</span>
            </span>
          </h1>
          <div className="text-fg/60 flex items-center gap-3 text-sm">
            <ThemeToggle />
            {login && onLogout && (
              <>
                {login}
                <Button onClick={onLogout}>Déconnexion</Button>
              </>
            )}
          </div>
        </div>
        {info && (
          <p className="text-fg/50 mt-1 text-sm">
            Les modifications sont commitées sur{" "}
            <code className="text-fg/70">
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
      ? "border-danger/40 bg-danger/10 text-danger"
      : state.step === "done"
        ? "border-ok/40 bg-ok/10 text-ok"
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

const THEME_LABELS: Record<ThemePref, string> = {
  system: "Thème : système",
  light: "Thème : clair",
  dark: "Thème : sombre",
};

function ThemeToggle() {
  const [pref, setPref] = useState(readPref);
  return (
    <Button
      onClick={() => {
        const next = nextPref(pref);
        applyPref(next);
        setPref(next);
      }}
    >
      {THEME_LABELS[pref]}
    </Button>
  );
}
