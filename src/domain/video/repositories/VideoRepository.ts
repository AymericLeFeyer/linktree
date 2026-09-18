import type { Video } from "../entities/Video";

/** Vidéos récentes de la chaîne, dans un ordre quelconque. */
export interface VideoRepository {
  listRecent(): Promise<Video[]>;
}
