import type { Video } from "../entities/Video";

/**
 * Au-delà, ce n'est plus un Short. YouTube accepte des Shorts jusqu'à 3 min ;
 * les formats longs de la chaîne dépassent tous largement ce seuil.
 */
export const SHORT_MAX_SECONDS = 180;

export function isShort(video: Video): boolean {
  return (
    video.durationSeconds !== null && video.durationSeconds <= SHORT_MAX_SECONDS
  );
}

/**
 * Dernière vidéo publiée, Shorts exclus : ils sont verticaux et reprennent
 * souvent un extrait de la vidéo longue. Une date future (première programmée)
 * est ignorée.
 */
export function latestVideo(videos: Video[], now: Date): Video | null {
  let latest: Video | null = null;
  for (const video of videos) {
    if (isShort(video) || video.publishedAt > now.getTime()) continue;
    if (!latest || video.publishedAt > latest.publishedAt) latest = video;
  }
  return latest;
}
