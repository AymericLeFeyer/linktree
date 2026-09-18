export const SOCIAL_PLATFORMS = [
  "youtube",
  "instagram",
  "tiktok",
  "discord",
  "x",
  "twitch",
  "github",
  "linkedin",
  "email",
  "website",
] as const;

export type SocialPlatform = (typeof SOCIAL_PLATFORMS)[number];

export interface Profile {
  name: string;
  tagline?: string;
  description?: string;
  /** Chemin dans `public/` (`/logo-blue.png`) ou URL absolue. */
  avatar: string;
}

export interface Social {
  platform: SocialPlatform;
  url: string;
  /** Libellé accessible ; par défaut, le nom de la plateforme. */
  label?: string;
}

export interface Link {
  /** Position dans `links.json` : stable tant qu'on ne réordonne pas. */
  id: string;
  title: string;
  description?: string;
  url: string;
  image?: string;
  featured: boolean;
  /** Instant (epoch ms) à partir duquel le lien disparaît ; `null` = permanent. */
  expiresAt: number | null;
}

export interface Linktree {
  siteUrl?: string;
  profile: Profile;
  socials: Social[];
  links: Link[];
}
