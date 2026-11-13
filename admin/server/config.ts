export interface AdminConfig {
  port: number;
  /** Client ID de l'OAuth App GitHub (Device Flow activé) : sert à la connexion. */
  githubClientId: string;
  /** `owner/nom` du dépôt qui porte links.json. */
  repo: string;
  branch: string;
  /** Workflow dont on attend la fin avant de redéployer. */
  workflowFile: string;
  /** Dockhand : absent = on s'arrête une fois l'image publiée. */
  dockhand?: { url: string; stack: string; env: string };
  staticDir: string;
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): AdminConfig {
  const githubClientId = env.GITHUB_CLIENT_ID?.trim();
  if (!githubClientId) {
    throw new Error(
      "GITHUB_CLIENT_ID manquant (OAuth App GitHub avec « Enable Device Flow » coché).",
    );
  }
  const dockhandUrl = env.DOCKHAND_URL?.trim().replace(/\/+$/, "");
  return {
    port: Number(env.PORT) || 8083,
    githubClientId,
    repo: env.GITHUB_REPO?.trim() || "AymericLeFeyer/linktree",
    branch: env.GITHUB_BRANCH?.trim() || "main",
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
