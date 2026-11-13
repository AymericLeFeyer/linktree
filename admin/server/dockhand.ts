export interface DockhandSettings {
  url: string;
  stack: string;
  env: string;
}

/** Pull de l'image et recréation des conteneurs de la stack (équivaut à « redéployer »). */
export async function deployStack(
  settings: DockhandSettings,
  fetchFn: typeof fetch = fetch,
): Promise<void> {
  const res = await fetchFn(
    `${settings.url}/api/stacks/${encodeURIComponent(settings.stack)}/deploy?env=${encodeURIComponent(settings.env)}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({ pull: true, forceRecreate: true }),
      signal: AbortSignal.timeout(600_000),
    },
  );
  const text = await res.text();
  let body: { success?: boolean; error?: string } = {};
  try {
    body = JSON.parse(text);
  } catch {
    // réponse non JSON : on se fie au code HTTP
  }
  if (!res.ok || body.success === false) {
    throw new Error(
      `Dockhand a refusé le déploiement (${res.status}) : ${body.error ?? text.slice(0, 200)}`,
    );
  }
}
