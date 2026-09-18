import {
  SOCIAL_PLATFORMS,
  type Link,
  type Linktree,
  type Profile,
  type Social,
  type SocialPlatform,
} from "../entities/Linktree.ts";
import { EXPIRY_FORMATS, parseExpiry } from "./expiry.ts";

export type ParseResult =
  { ok: true; value: Linktree } | { ok: false; errors: string[] };

export interface ParseOptions {
  /** Vérifie qu'un chemin local (`/links/x.webp`) existe dans `public/`. */
  assetExists?: (path: string) => boolean;
}

const LINK_PROTOCOLS = ["http:", "https:", "mailto:", "tel:"];

/**
 * Valide le contenu brut de `links.json`. Toutes les erreurs sont collectées
 * d'un coup pour qu'une seule relance du build suffise à tout corriger.
 *
 * Les clés inconnues sont refusées : une faute de frappe sur `expiresAt`
 * ferait sinon d'un lien temporaire un lien permanent, sans aucun signal.
 */
export function parseLinktree(
  raw: unknown,
  options: ParseOptions = {},
): ParseResult {
  const errors: string[] = [];
  const ctx = { errors, assetExists: options.assetExists };

  if (!isRecord(raw)) {
    return { ok: false, errors: ["La racine doit être un objet JSON."] };
  }
  checkKeys(ctx, raw, "", [
    "$schema",
    "siteUrl",
    "profile",
    "socials",
    "links",
  ]);

  const siteUrl = optionalUrl(ctx, raw.siteUrl, "siteUrl", ["http:", "https:"]);
  const profile = readProfile(ctx, raw.profile);
  const socials = readList(ctx, raw.socials, "socials", readSocial, false);
  const links = readList(ctx, raw.links, "links", readLink, true);

  if (errors.length > 0 || !profile) return { ok: false, errors };
  return {
    ok: true,
    value: {
      ...(siteUrl && { siteUrl: siteUrl.replace(/\/+$/, "") }),
      profile,
      socials,
      links,
    },
  };
}

interface Context {
  errors: string[];
  assetExists?: (path: string) => boolean;
}

function readProfile(ctx: Context, value: unknown): Profile | null {
  if (!isRecord(value)) {
    ctx.errors.push("profile : objet obligatoire.");
    return null;
  }
  checkKeys(ctx, value, "profile", [
    "name",
    "tagline",
    "description",
    "avatar",
  ]);
  const name = requiredString(ctx, value.name, "profile.name");
  const avatar = requiredImage(ctx, value.avatar, "profile.avatar");
  const tagline = optionalString(ctx, value.tagline, "profile.tagline");
  const description = optionalString(
    ctx,
    value.description,
    "profile.description",
  );
  if (name === null || avatar === null) return null;
  return {
    name,
    avatar,
    ...(tagline && { tagline }),
    ...(description && { description }),
  };
}

function readSocial(ctx: Context, value: unknown, path: string): Social | null {
  if (!isRecord(value)) {
    ctx.errors.push(`${path} : objet attendu.`);
    return null;
  }
  checkKeys(ctx, value, path, ["platform", "url", "label"]);

  let platform: SocialPlatform | null = null;
  if (SOCIAL_PLATFORMS.includes(value.platform as SocialPlatform)) {
    platform = value.platform as SocialPlatform;
  } else {
    ctx.errors.push(
      `${path}.platform : ${JSON.stringify(value.platform)} inconnu (valeurs possibles : ${SOCIAL_PLATFORMS.join(", ")}).`,
    );
  }
  const url = requiredUrl(ctx, value.url, `${path}.url`);
  const label = optionalString(ctx, value.label, `${path}.label`);
  if (platform === null || url === null) return null;
  return { platform, url, ...(label && { label }) };
}

function readLink(
  ctx: Context,
  value: unknown,
  path: string,
  index: number,
): Link | null {
  if (!isRecord(value)) {
    ctx.errors.push(`${path} : objet attendu.`);
    return null;
  }
  checkKeys(ctx, value, path, [
    "title",
    "description",
    "url",
    "image",
    "featured",
    "expiresAt",
  ]);

  const title = requiredString(ctx, value.title, `${path}.title`);
  const url = requiredUrl(ctx, value.url, `${path}.url`);
  const description = optionalString(
    ctx,
    value.description,
    `${path}.description`,
  );
  const image =
    value.image === undefined
      ? undefined
      : requiredImage(ctx, value.image, `${path}.image`);

  let featured = false;
  if (value.featured !== undefined) {
    if (typeof value.featured === "boolean") featured = value.featured;
    else ctx.errors.push(`${path}.featured : true ou false attendu.`);
  }

  let expiresAt: number | null = null;
  if (value.expiresAt !== undefined && value.expiresAt !== null) {
    const parsed =
      typeof value.expiresAt === "string" ? parseExpiry(value.expiresAt) : null;
    if (parsed === null) {
      ctx.errors.push(
        `${path}.expiresAt : date illisible ${JSON.stringify(value.expiresAt)}. Formats acceptés : ${EXPIRY_FORMATS.join(" ; ")}.`,
      );
    }
    expiresAt = parsed;
  }

  if (title === null || url === null || image === null) return null;
  return {
    id: `link-${index}`,
    title,
    url,
    featured,
    expiresAt,
    ...(description && { description }),
    ...(image && { image }),
  };
}

function readList<T>(
  ctx: Context,
  value: unknown,
  path: string,
  readItem: (
    ctx: Context,
    item: unknown,
    path: string,
    index: number,
  ) => T | null,
  required: boolean,
): T[] {
  if (value === undefined && !required) return [];
  if (!Array.isArray(value)) {
    ctx.errors.push(
      `${path} : tableau ${required ? "obligatoire" : "attendu"}.`,
    );
    return [];
  }
  return value
    .map((item, index) => readItem(ctx, item, `${path}[${index}]`, index))
    .filter((item): item is T => item !== null);
}

function checkKeys(
  ctx: Context,
  value: Record<string, unknown>,
  path: string,
  allowed: string[],
) {
  for (const key of Object.keys(value)) {
    if (!allowed.includes(key)) {
      ctx.errors.push(
        `${path ? `${path}.` : ""}${key} : champ inconnu (champs possibles : ${allowed.join(", ")}).`,
      );
    }
  }
}

function requiredString(
  ctx: Context,
  value: unknown,
  path: string,
): string | null {
  if (typeof value === "string" && value.trim() !== "") return value.trim();
  ctx.errors.push(`${path} : texte non vide obligatoire.`);
  return null;
}

function optionalString(
  ctx: Context,
  value: unknown,
  path: string,
): string | undefined {
  if (value === undefined) return undefined;
  if (typeof value === "string") return value.trim() || undefined;
  ctx.errors.push(`${path} : texte attendu.`);
  return undefined;
}

function requiredUrl(
  ctx: Context,
  value: unknown,
  path: string,
  protocols = LINK_PROTOCOLS,
): string | null {
  if (typeof value === "string") {
    try {
      if (protocols.includes(new URL(value).protocol)) return value;
    } catch {
      // traité ci-dessous
    }
  }
  ctx.errors.push(
    `${path} : URL complète attendue (${protocols.join(", ")}), reçu ${JSON.stringify(value)}.`,
  );
  return null;
}

function optionalUrl(
  ctx: Context,
  value: unknown,
  path: string,
  protocols: string[],
): string | undefined {
  if (value === undefined) return undefined;
  return requiredUrl(ctx, value, path, protocols) ?? undefined;
}

/** Image : chemin absolu dans `public/` ou URL http(s). */
function requiredImage(
  ctx: Context,
  value: unknown,
  path: string,
): string | null {
  if (
    typeof value === "string" &&
    value.startsWith("/") &&
    !value.startsWith("//")
  ) {
    if (ctx.assetExists && !ctx.assetExists(value)) {
      ctx.errors.push(`${path} : fichier introuvable dans public/ (${value}).`);
      return null;
    }
    return value;
  }
  return requiredUrl(ctx, value, path, ["http:", "https:"]);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
