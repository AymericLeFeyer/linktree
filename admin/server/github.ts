export interface GitHubSettings {
  token: string;
  repo: string;
  branch: string;
}

export interface RepoFile {
  content: string;
  /** SHA du blob : à renvoyer à l'écriture pour détecter une modification concurrente. */
  sha: string;
}

export interface WorkflowRun {
  id: number;
  status: string;
  conclusion: string | null;
  url: string;
}

export class GitHubError extends Error {
  readonly status: number;
  constructor(status: number, message: string) {
    super(message);
    this.name = "GitHubError";
    this.status = status;
  }
}

/** Le fichier a changé sur GitHub depuis qu'on l'a lu. */
export class GitHubConflictError extends GitHubError {
  constructor() {
    super(
      409,
      "links.json a été modifié sur GitHub depuis le chargement de la page.",
    );
    this.name = "GitHubConflictError";
  }
}

type FetchFn = typeof fetch;

/** Client minimal de l'API GitHub : lire/écrire un fichier, suivre un workflow. */
export class GitHubClient {
  private readonly settings: GitHubSettings;
  private readonly fetchFn: FetchFn;

  constructor(settings: GitHubSettings, fetchFn: FetchFn = fetch) {
    this.settings = settings;
    this.fetchFn = fetchFn;
  }

  async getFile(path: string): Promise<RepoFile> {
    const res = await this.call(
      `/contents/${encodePath(path)}?ref=${encodeURIComponent(this.settings.branch)}`,
    );
    const data = (await res.json()) as { content?: string; sha?: string };
    if (typeof data.content !== "string" || typeof data.sha !== "string") {
      throw new GitHubError(502, `Réponse GitHub inattendue pour ${path}.`);
    }
    return {
      content: Buffer.from(data.content, "base64").toString("utf8"),
      sha: data.sha,
    };
  }

  async fileExists(path: string): Promise<boolean> {
    try {
      await this.call(
        `/contents/${encodePath(path)}?ref=${encodeURIComponent(this.settings.branch)}`,
      );
      return true;
    } catch (error) {
      if (error instanceof GitHubError && error.status === 404) return false;
      throw error;
    }
  }

  /** Commit directement sur la branche ; renvoie le SHA du commit et du blob. */
  async putFile(
    path: string,
    content: string,
    sha: string,
    message: string,
  ): Promise<{ commit: string; sha: string }> {
    const res = await this.call(`/contents/${encodePath(path)}`, {
      method: "PUT",
      body: JSON.stringify({
        message,
        content: Buffer.from(content, "utf8").toString("base64"),
        sha,
        branch: this.settings.branch,
      }),
    });
    const data = (await res.json()) as {
      commit?: { sha?: string };
      content?: { sha?: string };
    };
    if (!data.commit?.sha || !data.content?.sha) {
      throw new GitHubError(502, "Réponse GitHub inattendue après le commit.");
    }
    return { commit: data.commit.sha, sha: data.content.sha };
  }

  /** Crée un fichier binaire (contenu en base64) ; échoue s'il existe déjà. */
  async createFile(
    path: string,
    base64: string,
    message: string,
  ): Promise<{ commit: string }> {
    try {
      const res = await this.call(`/contents/${encodePath(path)}`, {
        method: "PUT",
        body: JSON.stringify({
          message,
          content: base64,
          branch: this.settings.branch,
        }),
      });
      const data = (await res.json()) as { commit?: { sha?: string } };
      if (!data.commit?.sha) {
        throw new GitHubError(
          502,
          "Réponse GitHub inattendue après le commit.",
        );
      }
      return { commit: data.commit.sha };
    } catch (error) {
      if (error instanceof GitHubConflictError) {
        throw new GitHubError(409, "Un fichier du même nom existe déjà.");
      }
      throw error;
    }
  }

  /** Dernier run du workflow pour ce commit, `null` tant qu'il n'a pas démarré. */
  async workflowRun(
    workflowFile: string,
    commit: string,
  ): Promise<WorkflowRun | null> {
    const res = await this.call(
      `/actions/workflows/${encodeURIComponent(workflowFile)}/runs?head_sha=${encodeURIComponent(commit)}&per_page=5`,
    );
    const data = (await res.json()) as {
      workflow_runs?: {
        id: number;
        status: string;
        conclusion: string | null;
        html_url: string;
      }[];
    };
    const run = data.workflow_runs?.[0];
    return run
      ? {
          id: run.id,
          status: run.status,
          conclusion: run.conclusion,
          url: run.html_url,
        }
      : null;
  }

  private async call(path: string, init: RequestInit = {}): Promise<Response> {
    const res = await this.fetchFn(
      `https://api.github.com/repos/${this.settings.repo}${path}`,
      {
        ...init,
        headers: {
          Authorization: `Bearer ${this.settings.token}`,
          Accept: "application/vnd.github+json",
          "X-GitHub-Api-Version": "2022-11-28",
          "User-Agent": "linktree-admin",
          ...(init.body ? { "Content-Type": "application/json" } : {}),
        },
        signal: AbortSignal.timeout(20_000),
      },
    );
    if (res.ok) return res;
    if (init.method === "PUT" && (res.status === 409 || res.status === 422)) {
      throw new GitHubConflictError();
    }
    const detail = await res.text().catch(() => "");
    const hint =
      res.status === 401 || res.status === 403
        ? " Le compte connecté a-t-il toujours accès au dépôt ?"
        : "";
    throw new GitHubError(
      res.status,
      `GitHub ${res.status} sur ${path.split("?")[0]}.${hint} ${detail.slice(0, 200)}`.trim(),
    );
  }
}

function encodePath(path: string): string {
  return path.split("/").map(encodeURIComponent).join("/");
}
