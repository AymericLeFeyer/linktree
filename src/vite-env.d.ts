/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Source des vidéos ; par défaut `/youtube-stats.json`, relayé vers aylabs.fr. */
  readonly VITE_YOUTUBE_STATS_URL?: string;
  /** URL du collector Aynalytics. Facultative : `/_ay` (proxy nginx du site) par défaut. */
  readonly VITE_AYNALYTICS_URL?: string;
  /** Clé publique du site dans Aynalytics (ay_pk_...). Absente = Aynalytics inactif. */
  readonly VITE_AYNALYTICS_SITE_KEY?: string;
}

declare module "virtual:linktree" {
  const linktree: import("./domain/link/entities/Linktree").Linktree;
  export default linktree;
}
