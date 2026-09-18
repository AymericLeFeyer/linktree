/** `1134` → `18:54`, `9177` → `2:32:57`, comme sur YouTube. */
export function formatDuration(totalSeconds: number): string {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const pad = (value: number) => String(value).padStart(2, "0");
  return hours > 0
    ? `${hours}:${pad(minutes)}:${pad(seconds)}`
    : `${minutes}:${pad(seconds)}`;
}

const relative = new Intl.RelativeTimeFormat("fr", { numeric: "auto" });

const UNITS: [Intl.RelativeTimeFormatUnit, number][] = [
  ["year", 365 * 24 * 3600],
  ["month", 30 * 24 * 3600],
  ["week", 7 * 24 * 3600],
  ["day", 24 * 3600],
  ["hour", 3600],
  ["minute", 60],
];

/** « il y a 3 jours », « hier », « il y a 2 heures ». */
export function formatAge(publishedAt: number, now: number): string {
  const elapsed = Math.max(0, (now - publishedAt) / 1000);
  for (const [unit, seconds] of UNITS) {
    if (elapsed >= seconds) {
      return relative.format(-Math.floor(elapsed / seconds), unit);
    }
  }
  return "à l'instant";
}
