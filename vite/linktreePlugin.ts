import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import type { Plugin, ResolvedConfig } from "vite";
import type { Linktree } from "../src/domain/link/entities/Linktree.ts";
import { isExpired } from "../src/domain/link/services/expiry.ts";
import { parseLinktree } from "../src/domain/link/services/parseLinktree.ts";

const VIRTUAL_ID = "virtual:linktree";
const RESOLVED_ID = `\0${VIRTUAL_ID}`;

/**
 * Lit `links.json` **au build uniquement** et l'expose comme module
 * `virtual:linktree`. Le build échoue si le fichier est invalide : une erreur
 * de saisie ne peut donc jamais partir en production.
 *
 * Les liens déjà expirés sont retirés du bundle ; ceux qui expirent plus tard
 * sont filtrés à l'affichage par `GetVisibleLinktree`.
 */
export function linktreePlugin(file = "links.json"): Plugin {
  let config: ResolvedConfig;
  let sourcePath: string;

  const load = (): Linktree => {
    let raw: unknown;
    try {
      raw = JSON.parse(readFileSync(sourcePath, "utf8"));
    } catch (error) {
      throw new Error(`${file} : JSON invalide — ${(error as Error).message}`, {
        cause: error,
      });
    }

    const result = parseLinktree(raw, {
      assetExists: (asset) =>
        existsSync(path.join(config.publicDir, decodeURI(asset))),
    });
    if (!result.ok) {
      throw new Error(
        `${file} contient ${result.errors.length} erreur(s) :\n` +
          result.errors.map((error) => `  • ${error}`).join("\n"),
      );
    }
    return result.value;
  };

  return {
    name: "aylabs-linktree",

    configResolved(resolved) {
      config = resolved;
      sourcePath = path.resolve(resolved.root, file);
    },

    resolveId(id) {
      return id === VIRTUAL_ID ? RESOLVED_ID : undefined;
    },

    load(id) {
      if (id !== RESOLVED_ID) return;
      this.addWatchFile(sourcePath);

      const linktree = load();
      const now = new Date();
      const links = linktree.links.filter((link) => !isExpired(link, now));
      const dropped = linktree.links.length - links.length;
      if (dropped > 0 && config.command === "build") {
        config.logger.info(
          `[linktree] ${dropped} lien(s) expiré(s) retiré(s) du build.`,
        );
      }
      return `export default ${JSON.stringify({ ...linktree, links })};`;
    },

    // Titre, description et aperçus de partage tirés du profil.
    transformIndexHtml(html) {
      const { profile, siteUrl } = load();
      const title = profile.tagline
        ? `${profile.name} — ${profile.tagline}`
        : profile.name;
      const description =
        profile.description ??
        profile.tagline ??
        `Les liens de ${profile.name}`;
      const avatar =
        siteUrl && profile.avatar.startsWith("/")
          ? `${siteUrl}${profile.avatar}`
          : profile.avatar;

      const tags = [
        `<title>${escapeHtml(title)}</title>`,
        meta("name", "description", description),
        meta("property", "og:type", "website"),
        meta("property", "og:title", title),
        meta("property", "og:description", description),
        meta("name", "twitter:card", "summary"),
        meta("name", "twitter:title", title),
        meta("name", "twitter:description", description),
      ];
      if (siteUrl) {
        tags.push(
          `<link rel="canonical" href="${escapeHtml(siteUrl)}/" />`,
          meta("property", "og:url", `${siteUrl}/`),
        );
      }
      if (/^https?:\/\//.test(avatar)) {
        tags.push(
          meta("property", "og:image", avatar),
          meta("name", "twitter:image", avatar),
        );
      }
      return html.replace("<!-- linktree:head -->", tags.join("\n    "));
    },

    configureServer(server) {
      // En dev, modifier links.json recharge la page avec le nouveau contenu.
      server.watcher.add(sourcePath);
      server.watcher.on("change", (changed) => {
        if (path.resolve(changed) !== sourcePath) return;
        const module = server.moduleGraph.getModuleById(RESOLVED_ID);
        if (module) server.moduleGraph.invalidateModule(module);
        server.ws.send({ type: "full-reload" });
      });
    },
  };
}

function meta(attribute: "name" | "property", key: string, content: string) {
  return `<meta ${attribute}="${key}" content="${escapeHtml(content)}" />`;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
