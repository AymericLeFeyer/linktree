import type { WorkflowRun } from "./github.ts";

export type PublishStep = "pipeline" | "deploy" | "done" | "error";

export interface PublishState {
  commit: string;
  step: PublishStep;
  message: string;
  runUrl?: string;
  updatedAt: number;
}

export interface PublisherDeps {
  workflowRun: (commit: string) => Promise<WorkflowRun | null>;
  /** Absent = Dockhand non configuré. */
  deploy?: () => Promise<void>;
  sleep?: (ms: number) => Promise<void>;
  now?: () => number;
  pollMs?: number;
  /** Au-delà, on abandonne l'attente de la pipeline. */
  timeoutMs?: number;
}

/**
 * Suit un commit jusqu'en production : attend la pipeline GitHub, puis demande
 * à Dockhand de redéployer. Un seul suivi à la fois — un nouveau commit
 * remplace le précédent (la pipeline GitHub annule d'ailleurs l'ancien run).
 */
export class Publisher {
  private current: PublishState | null = null;
  private generation = 0;
  private readonly deps: Required<Omit<PublisherDeps, "deploy">> &
    Pick<PublisherDeps, "deploy">;

  constructor(deps: PublisherDeps) {
    this.deps = {
      sleep: (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
      now: () => Date.now(),
      pollMs: 10_000,
      timeoutMs: 30 * 60_000,
      ...deps,
    };
  }

  get state(): PublishState | null {
    return this.current;
  }

  /** Lance le suivi ; la promesse se résout quand il est terminé (ou remplacé). */
  track(commit: string): Promise<void> {
    const generation = ++this.generation;
    this.set(generation, {
      commit,
      step: "pipeline",
      message: "Commit poussé, en attente de la pipeline GitHub…",
    });
    return this.run(generation, commit);
  }

  private async run(generation: number, commit: string): Promise<void> {
    const { sleep, now, pollMs, timeoutMs } = this.deps;
    const deadline = now() + timeoutMs;
    try {
      for (;;) {
        if (generation !== this.generation) return;
        if (now() > deadline) {
          return this.set(generation, {
            commit,
            step: "error",
            message: "Pipeline trop longue : suivi abandonné.",
          });
        }
        const run = await this.deps.workflowRun(commit);
        if (run) {
          if (run.status === "completed") {
            if (run.conclusion === "success") break;
            if (run.conclusion === "cancelled") {
              return this.set(generation, {
                commit,
                step: "error",
                message: "Pipeline annulée.",
                runUrl: run.url,
              });
            }
            return this.set(generation, {
              commit,
              step: "error",
              message: `Pipeline en échec (${run.conclusion}). Les liens ne sont pas en ligne.`,
              runUrl: run.url,
            });
          }
          this.set(generation, {
            commit,
            step: "pipeline",
            message: "Pipeline GitHub en cours (tests, build, image)…",
            runUrl: run.url,
          });
        }
        await sleep(pollMs);
      }

      if (!this.deps.deploy) {
        return this.set(generation, {
          commit,
          step: "done",
          message:
            "Image publiée sur GHCR. Redéploiement Dockhand non configuré : à lancer à la main.",
        });
      }
      this.set(generation, {
        commit,
        step: "deploy",
        message: "Image publiée, redéploiement Dockhand en cours…",
      });
      await this.deps.deploy();
      this.set(generation, {
        commit,
        step: "done",
        message: "En ligne : le linktree a été redéployé.",
      });
    } catch (error) {
      this.set(generation, {
        commit,
        step: "error",
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }

  private set(
    generation: number,
    state: Omit<PublishState, "updatedAt">,
  ): void {
    if (generation !== this.generation) return;
    this.current = { ...state, updatedAt: this.deps.now() };
  }
}
