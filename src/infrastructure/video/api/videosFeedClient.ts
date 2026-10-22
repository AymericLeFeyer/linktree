/**
 * Client de `videos-feed.json` d'aylabs.fr (vidéos des fiches du site, voir
 * `vite/videosFeedPlugin.ts` dans ../aylabs). aylabs.fr ne renvoie pas
 * d'en-tête CORS : l'URL par défaut est donc relative, relayée par nginx en
 * production (`docker/nginx.conf.template`) et par Vite en dev.
 */
export class VideosFeedClient {
  constructor(private readonly url: string) {}

  async fetch(): Promise<unknown> {
    const response = await fetch(this.url, {
      headers: { Accept: "application/json" },
    });
    if (!response.ok) {
      throw new Error(`${this.url} : HTTP ${response.status}`);
    }
    return response.json();
  }
}
