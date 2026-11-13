import { readFile } from "node:fs/promises";
import type { IncomingMessage, ServerResponse } from "node:http";
import { extname, join, normalize, sep } from "node:path";
import { parseLinktree } from "../../src/domain/link/services/parseLinktree.ts";
import {
  GitHubConflictError,
  GitHubError,
  type GitHubClient,
} from "./github.ts";
import type { AuthService } from "./auth.ts";
import type { Publisher } from "./publisher.ts";

export const LINKS_FILE = "links.json";
const MAX_BODY_BYTES = 1_000_000;
const MAX_LOCAL_ASSETS = 60;

type Repo = Pick<
  GitHubClient,
  "getFile" | "putFile" | "fileExists" | "workflowRun"
>;

export interface AppDeps {
  /** Client GitHub agissant au nom de l'utilisateur connecté (son jeton OAuth). */
  githubFor: (token: string) => Repo;
  auth: Pick<AuthService, "startFlow" | "pollFlow" | "session" | "logout">;
  publisher: Pick<Publisher, "state" | "track">;
  info: { repo: string; branch: string; deploys: boolean };
  workflowFile: string;
  staticDir: string;
}

const COOKIE = "linktree_admin";

const MIME: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".ico": "image/x-icon",
  ".json": "application/json; charset=utf-8",
};

/** Gestionnaire HTTP de l'admin : API JSON + fichiers statiques de l'interface. */
export function createApp(deps: AppDeps) {
  return async (req: IncomingMessage, res: ServerResponse): Promise<void> => {
    try {
      const url = new URL(req.url ?? "/", "http://admin");
      const route = `${req.method} ${url.pathname}`;
      const sessionId = readCookie(req, COOKIE);

      switch (route) {
        case "GET /api/info":
          return sendJson(res, 200, deps.info);
        case "POST /api/auth/device":
          return sendJson(res, 200, await deps.auth.startFlow());
        case "POST /api/auth/poll": {
          const body = JSON.parse(await readBody(req)) as { flowId?: unknown };
          const result = await deps.auth.pollFlow(String(body.flowId ?? ""));
          if (result.status === "ok") {
            res.setHeader(
              "Set-Cookie",
              `${COOKIE}=${result.sessionId}; HttpOnly; SameSite=Strict; Path=/; Max-Age=43200`,
            );
            return sendJson(res, 200, { status: "ok", login: result.login });
          }
          return sendJson(res, 200, result);
        }
        case "POST /api/auth/logout":
          deps.auth.logout(sessionId);
          res.setHeader(
            "Set-Cookie",
            `${COOKIE}=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0`,
          );
          return sendJson(res, 200, {});
      }

      if (url.pathname.startsWith("/api/")) {
        const session = deps.auth.session(sessionId);
        if (!session) {
          return sendJson(res, 401, { error: "Connexion GitHub requise." });
        }
        const github = deps.githubFor(session.token);
        switch (route) {
          case "GET /api/session":
            return sendJson(res, 200, { login: session.login });
          case "GET /api/links": {
            const file = await github.getFile(LINKS_FILE);
            return sendJson(res, 200, {
              data: JSON.parse(file.content),
              sha: file.sha,
            });
          }
          case "PUT /api/links":
            return await saveLinks(req, res, deps, github, session.login);
          case "GET /api/publish":
            return sendJson(res, 200, { state: deps.publisher.state });
        }
      }
      if (url.pathname.startsWith("/api/")) {
        return sendJson(res, 404, { error: "Route inconnue." });
      }
      if (req.method !== "GET" && req.method !== "HEAD") {
        return sendJson(res, 405, { error: "Méthode non autorisée." });
      }
      return await serveStatic(res, deps.staticDir, url.pathname);
    } catch (error) {
      handleError(res, error);
    }
  };
}

async function saveLinks(
  req: IncomingMessage,
  res: ServerResponse,
  deps: AppDeps,
  github: Repo,
  login: string,
): Promise<void> {
  const body = JSON.parse(await readBody(req)) as {
    data?: unknown;
    sha?: unknown;
  };
  if (typeof body.sha !== "string" || body.data === undefined) {
    return sendJson(res, 400, { error: "Corps attendu : { data, sha }." });
  }

  const existing = await existingAssets(github, body.data);
  const result = parseLinktree(body.data, {
    assetExists: (path) => existing.has(path),
  });
  if (!result.ok) return sendJson(res, 422, { errors: result.errors });

  const saved = await github.putFile(
    LINKS_FILE,
    `${JSON.stringify(body.data, null, 2)}\n`,
    body.sha,
    `content: links (admin, ${login})`,
  );
  void deps.publisher.track(saved.commit, (commit) =>
    github.workflowRun(deps.workflowFile, commit),
  );
  return sendJson(res, 200, { sha: saved.sha, commit: saved.commit });
}

/** Chemins locaux (`/links/x.webp`) cités par le JSON qui existent dans `public/` du dépôt. */
async function existingAssets(
  github: Repo,
  data: unknown,
): Promise<Set<string>> {
  const paths = new Set<string>();
  const add = (value: unknown) => {
    if (
      typeof value === "string" &&
      value.startsWith("/") &&
      !value.startsWith("//")
    ) {
      paths.add(value);
    }
  };
  if (isRecord(data)) {
    if (isRecord(data.profile)) add(data.profile.avatar);
    if (Array.isArray(data.links)) {
      for (const link of data.links) if (isRecord(link)) add(link.image);
    }
  }
  const found = new Set<string>();
  const candidates = [...paths]
    .filter((path) => !path.split("/").includes(".."))
    .slice(0, MAX_LOCAL_ASSETS);
  await Promise.all(
    candidates.map(async (path) => {
      if (await github.fileExists(`public${path}`)) found.add(path);
    }),
  );
  return found;
}

async function serveStatic(
  res: ServerResponse,
  root: string,
  pathname: string,
): Promise<void> {
  const requested = normalize(decodeURIComponent(pathname));
  const target = join(
    root,
    requested === sep || requested === "/" ? "index.html" : requested,
  );
  // Refuse toute sortie du dossier (../).
  if (!target.startsWith(normalize(root))) {
    return sendJson(res, 403, { error: "Interdit." });
  }
  const isAsset = pathname.startsWith("/assets/");
  try {
    const file = await readFile(target);
    res.writeHead(200, {
      "Content-Type": MIME[extname(target)] ?? "application/octet-stream",
      "Cache-Control": isAsset
        ? "public, max-age=31536000, immutable"
        : "no-cache",
    });
    res.end(file);
  } catch {
    if (extname(pathname) !== "") {
      return sendJson(res, 404, { error: "Introuvable." });
    }
    const index = await readFile(join(root, "index.html"));
    res.writeHead(200, {
      "Content-Type": MIME[".html"],
      "Cache-Control": "no-cache",
    });
    res.end(index);
  }
}

function handleError(res: ServerResponse, error: unknown): void {
  if (res.headersSent) {
    res.end();
    return;
  }
  if (error instanceof GitHubConflictError) {
    return sendJson(res, 409, { error: error.message });
  }
  if (error instanceof SyntaxError) {
    return sendJson(res, 400, { error: "JSON invalide." });
  }
  if (error instanceof GitHubError) {
    console.error(error.message);
    return sendJson(res, 502, { error: error.message });
  }
  if (error instanceof PayloadTooLarge) {
    return sendJson(res, 413, { error: "Requête trop volumineuse." });
  }
  console.error(error);
  sendJson(res, 500, { error: "Erreur interne." });
}

class PayloadTooLarge extends Error {}

async function readBody(req: IncomingMessage): Promise<string> {
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of req as AsyncIterable<Buffer>) {
    size += chunk.length;
    if (size > MAX_BODY_BYTES) throw new PayloadTooLarge();
    chunks.push(chunk);
  }
  return Buffer.concat(chunks).toString("utf8");
}

function sendJson(res: ServerResponse, status: number, body: unknown): void {
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
  });
  res.end(JSON.stringify(body));
}

function readCookie(req: IncomingMessage, name: string): string | undefined {
  for (const part of (req.headers.cookie ?? "").split(";")) {
    const [key, ...value] = part.trim().split("=");
    if (key === name) return value.join("=");
  }
  return undefined;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
