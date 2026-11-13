import { SOCIAL_PLATFORMS } from "../../src/domain/link/entities/Linktree.ts";

export { SOCIAL_PLATFORMS };

/** Forme brute de links.json, telle qu'éditée (dates en texte, champs facultatifs). */
export interface RawSocial {
  platform: string;
  url: string;
  label?: string;
}

export interface RawLink {
  title: string;
  description?: string;
  url: string;
  image?: string;
  featured?: boolean;
  expiresAt?: string | null;
}

export interface RawLinktree {
  $schema?: string;
  siteUrl?: string;
  profile: {
    name: string;
    tagline?: string;
    description?: string;
    avatar: string;
  };
  socials: RawSocial[];
  links: RawLink[];
}

/** Retire les champs facultatifs vides pour que le fichier reste propre (et valide). */
export function cleanForSave(data: RawLinktree): RawLinktree {
  const strip = <T extends object>(value: T): T =>
    Object.fromEntries(
      Object.entries(value).filter(
        ([, v]) => v !== undefined && v !== null && v !== "" && v !== false,
      ),
    ) as T;
  return {
    ...data,
    profile: strip(data.profile),
    socials: data.socials.map(strip),
    links: data.links.map(strip),
  };
}

export function move<T>(list: T[], from: number, to: number): T[] {
  if (to < 0 || to >= list.length) return list;
  const next = [...list];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
}
