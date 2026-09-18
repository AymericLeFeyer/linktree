export interface Video {
  /** Identifiant YouTube (`5nVj0SXp9_w`). */
  id: string;
  title: string;
  url: string;
  /** Meilleure miniature disponible ; `null` si le flux n'en donne aucune. */
  thumbnail: string | null;
  /** Instant de publication (epoch ms). */
  publishedAt: number;
  /** Durée en secondes ; `null` si absente ou illisible. */
  durationSeconds: number | null;
}
