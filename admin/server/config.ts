export interface AdminConfig {
  port: number;
  githubToken: string;
  /** `owner/nom` du dépôt qui porte links.json. */
  repo: string;
  branch: string;
  /** Mot de passe HTTP Basic ; absent = pas d'authentification (LAN seulement). */
  password?: string;
  /** Workflow dont on attend la fin avant de redéployer. */
  workflowFile: string;
  /** Dockhand : absent = on s'arrête une fois l'image publiée. */
  dockhand?: { url: string; stack: string; env: string };
  staticDir: string;
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): AdminConfig {
  const githubToken = env.GITHUB_TOKEN?.trim();
  if (!githubToken) {
    throw new Error(
      "GITHUB_TOKEN manquant (jeton fine-grained : Contents en lecture/écriture et Actions en lecture sur le dépôt).",
    );
  }
  const dockhandUrl = env.DOCKHAND_URL?.trim().replace(/\/+$/, "");
  return {
    port: Number(env.PORT) || 8083,
    githubToken,
    repo: env.GITHUB_REPO?.trim() || "AymericLeFeyer/linktree",
    branch: env.GITHUB_BRANCH?.trim() || "main",
    password: env.ADMIN_PASSWORD || undefined,
    workflowFile: env.GITHUB_WORKFLOW?.trim() || "release.yml",
    dockhand: dockhandUrl
      ? {
          url: dockhandUrl,
          stack: env.DOCKHAND_STACK?.trim() || "linktree",
          env: env.DOCKHAND_ENV?.trim() || "1",
        }
      : undefined,
    staticDir: env.STATIC_DIR?.trim() || "dist-admin",
  };
}
