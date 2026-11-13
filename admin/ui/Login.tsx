import { useEffect, useState } from "react";
import { api, type DeviceFlow } from "./api.ts";
import { Button } from "./fields.tsx";

type Phase =
  | { step: "idle" }
  | { step: "waiting"; flow: DeviceFlow }
  | { step: "failed"; message: string };

/** Connexion GitHub « device flow » : on recopie un code sur github.com/login/device. */
export function Login({ onLoggedIn }: { onLoggedIn: () => void }) {
  const [phase, setPhase] = useState<Phase>({ step: "idle" });

  async function start() {
    try {
      setPhase({ step: "waiting", flow: await api.startLogin() });
    } catch (error) {
      setPhase({
        step: "failed",
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }

  const flow = phase.step === "waiting" ? phase.flow : null;
  useEffect(() => {
    if (!flow) return;
    let stopped = false;
    const timer = setInterval(
      () => {
        api
          .pollLogin(flow.flowId)
          .then((result) => {
            if (stopped || result.status === "pending") return;
            stopped = true;
            if (result.status === "ok") return onLoggedIn();
            setPhase({
              step: "failed",
              message:
                result.status === "forbidden"
                  ? `Le compte ${result.login} n'a pas le droit d'écriture sur le dépôt.`
                  : result.status === "denied"
                    ? "Connexion refusée sur GitHub."
                    : "Le code a expiré, recommence.",
            });
          })
          .catch(() => undefined);
      },
      Math.max(flow.interval, 5) * 1000 + 500,
    );
    return () => {
      stopped = true;
      clearInterval(timer);
    };
  }, [flow, onLoggedIn]);

  return (
    <section className="rounded-2xl border border-ink-line bg-ink-soft p-6">
      <h2 className="text-lg font-semibold">Connexion</h2>
      <p className="mt-1 text-sm text-white/60">
        Seuls les comptes GitHub avec accès en écriture au dépôt peuvent
        modifier les liens.
      </p>

      {phase.step === "waiting" ? (
        <div className="mt-5 space-y-3 text-sm">
          <p>
            1. Ouvre{" "}
            <a
              className="text-brand-bright underline"
              href={phase.flow.verificationUri}
              target="_blank"
              rel="noopener noreferrer"
            >
              {phase.flow.verificationUri}
            </a>
          </p>
          <p>2. Saisis ce code :</p>
          <p className="font-mono text-3xl font-bold tracking-widest text-brand-bright">
            {phase.flow.userCode}
          </p>
          <p className="text-white/40">En attente de la validation…</p>
        </div>
      ) : (
        <div className="mt-5">
          {phase.step === "failed" && (
            <p className="mb-3 text-sm text-red-300">{phase.message}</p>
          )}
          <Button variant="primary" onClick={() => void start()}>
            Se connecter avec GitHub
          </Button>
        </div>
      )}
    </section>
  );
}
