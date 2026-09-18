/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Source des vidéos ; par défaut `/youtube-stats.json`, relayé vers aylabs.fr. */
  readonly VITE_YOUTUBE_STATS_URL?: string;
}

declare module "virtual:linktree" {
  const linktree: import("./domain/link/entities/Linktree").Linktree;
  export default linktree;
}
