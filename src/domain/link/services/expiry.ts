import type { Link } from "../entities/Linktree.ts";

/**
 * Fuseau des dates saisies dans `links.json`. Sans lui, une date serait lue
 * dans le fuseau de la machine : UTC sur le runner GitHub, heure locale chez
 * le visiteur — et le lien ne disparaîtrait pas au même moment partout.
 */
export const EXPIRY_TIME_ZONE = "Europe/Paris";

export const EXPIRY_FORMATS = [
  '"2026-10-31" (disparaît le 1er novembre à 00:00, heure de Paris)',
  '"2026-10-31T18:00" (heure de Paris)',
  '"2026-10-31T18:00:00+02:00" ou "…Z" (fuseau explicite)',
];

const DATE_ONLY = /^(\d{4})-(\d{2})-(\d{2})$/;
const LOCAL_DATE_TIME = /^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})$/;
const ZONED_DATE_TIME =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:\d{2})$/;

/**
 * Convertit la valeur `expiresAt` du JSON en instant (epoch ms).
 * Renvoie `null` si la valeur est illisible ou désigne une date inexistante
 * (`2026-02-30`, `25:00`).
 */
export function parseExpiry(value: string): number | null {
  const trimmed = value.trim();

  if (ZONED_DATE_TIME.test(trimmed)) {
    const instant = Date.parse(trimmed);
    return Number.isNaN(instant) ? null : instant;
  }

  const dateOnly = DATE_ONLY.exec(trimmed);
  if (dateOnly) {
    const [year, month, day] = dateOnly.slice(1).map(Number);
    if (!isRealDate(year, month, day, 0, 0)) return null;
    // Le lien reste visible toute la journée indiquée.
    const nextDay = new Date(Date.UTC(year, month - 1, day + 1));
    return wallTimeToInstant(
      nextDay.getUTCFullYear(),
      nextDay.getUTCMonth() + 1,
      nextDay.getUTCDate(),
      0,
      0,
    );
  }

  const local = LOCAL_DATE_TIME.exec(trimmed);
  if (local) {
    const [year, month, day, hour, minute] = local.slice(1).map(Number);
    if (!isRealDate(year, month, day, hour, minute)) return null;
    return wallTimeToInstant(year, month, day, hour, minute);
  }

  return null;
}

export function isExpired(link: Link, now: Date): boolean {
  return link.expiresAt !== null && now.getTime() >= link.expiresAt;
}

/** Prochain instant où un des liens va disparaître, ou `null`. */
export function nextExpiry(links: Link[], now: Date): number | null {
  const upcoming = links
    .map((link) => link.expiresAt)
    .filter((instant): instant is number => instant !== null)
    .filter((instant) => instant > now.getTime());
  return upcoming.length > 0 ? Math.min(...upcoming) : null;
}

function isRealDate(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
): boolean {
  const date = new Date(Date.UTC(year, month - 1, day, hour, minute));
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day &&
    date.getUTCHours() === hour &&
    date.getUTCMinutes() === minute
  );
}

/** Heure murale à Paris → instant UTC, changements d'heure compris. */
function wallTimeToInstant(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
): number {
  const asUtc = Date.UTC(year, month - 1, day, hour, minute);
  const firstGuess = asUtc - zoneOffset(asUtc);
  // Si l'instant deviné tombe de l'autre côté d'un changement d'heure,
  // le décalage à appliquer est celui de cet instant-là.
  return asUtc - zoneOffset(firstGuess);
}

const offsetFormatter = new Intl.DateTimeFormat("en-US", {
  timeZone: EXPIRY_TIME_ZONE,
  hourCycle: "h23",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
});

/** Décalage (ms) entre l'heure de Paris et UTC à un instant donné. */
function zoneOffset(instant: number): number {
  const parts = Object.fromEntries(
    offsetFormatter
      .formatToParts(new Date(instant))
      .map((part) => [part.type, Number(part.value)]),
  );
  const wallClock = Date.UTC(
    parts.year,
    parts.month - 1,
    parts.day,
    parts.hour,
    parts.minute,
    parts.second,
  );
  return wallClock - Math.floor(instant / 1000) * 1000;
}
