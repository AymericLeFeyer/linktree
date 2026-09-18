import type { Video } from "../entities/Video";

// Du plus net au plus flou : `maxres` manque sur les vieilles vidéos.
const THUMBNAIL_SIZES = ["maxres", "standard", "high", "medium", "default"];

/**
 * Lit `videos` de `youtube-stats.json` (écrit par n8n). Chaque entrée est
 * enveloppée dans `{ json, pairedItem }` ; la forme plate est aussi acceptée
 * pour ne pas dépendre de la version du workflow. Tolérant : une entrée
 * illisible est ignorée, jamais d'exception.
 */
export function parseVideoFeed(raw: unknown): Video[] {
  const list = isRecord(raw) ? raw.videos : undefined;
  if (!Array.isArray(list)) return [];
  return list.flatMap((item) => {
    const video = parseVideo(
      isRecord(item) && "json" in item ? item.json : item,
    );
    return video ? [video] : [];
  });
}

function parseVideo(raw: unknown): Video | null {
  if (!isRecord(raw)) return null;
  const { id, title, publishedAt, duration } = raw;
  if (typeof id !== "string" || id === "") return null;
  if (typeof title !== "string" || title.trim() === "") return null;
  // Horodatage ISO avec `Z` fourni par l'API YouTube : pas d'ambiguïté de fuseau.
  const published =
    typeof publishedAt === "string" ? Date.parse(publishedAt) : NaN;
  if (Number.isNaN(published)) return null;

  return {
    id,
    title: title.trim(),
    url: `https://www.youtube.com/watch?v=${encodeURIComponent(id)}`,
    thumbnail: bestThumbnail(raw.thumbnails),
    publishedAt: published,
    durationSeconds:
      typeof duration === "string" ? parseIsoDuration(duration) : null,
  };
}

function bestThumbnail(raw: unknown): string | null {
  if (!isRecord(raw)) return null;
  for (const size of THUMBNAIL_SIZES) {
    const entry = raw[size];
    // n8n donne `{ url, width, height }`, aylabs.fr aplatit parfois en chaîne.
    const url = isRecord(entry) ? entry.url : entry;
    if (typeof url === "string" && /^https:\/\//.test(url)) return url;
  }
  return null;
}

/** Durée ISO 8601 de l'API YouTube (`PT1H2M3S`, `P1DT2H`) → secondes. */
export function parseIsoDuration(value: string): number | null {
  const match = /^P(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?)?$/.exec(
    value,
  );
  if (!match || value === "P" || value.endsWith("T")) return null;
  const [days, hours, minutes, seconds] = match
    .slice(1)
    .map((part) => Number(part ?? 0));
  return ((days * 24 + hours) * 60 + minutes) * 60 + seconds;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
