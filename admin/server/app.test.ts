import { createServer, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createApp, type AppDeps } from "./app.ts";
import { GitHubConflictError } from "./github.ts";

const VALID = {
  profile: { name: "AyLabs", avatar: "/aylabs.jpg" },
  socials: [],
  links: [{ title: "Doc", url: "https://docs.aylabs.fr" }],
};

let server: Server | undefined;
afterEach(() => server?.close());

async function start(overrides: Partial<AppDeps> = {}) {
  const github = {
    getFile: vi.fn(async () => ({
      content: JSON.stringify(VALID),
      sha: "blob1",
    })),
    putFile: vi.fn(async () => ({ commit: "commit2", sha: "blob2" })),
    createFile: vi.fn(async () => ({ commit: "img1" })),
    fileExists: vi.fn(async () => true),
    workflowRun: vi.fn(async () => null),
  };
  const githubFor = vi.fn((token: string) => {
    void token;
    return github;
  });
  const publisher = { state: null, track: vi.fn(async () => undefined) };
  const auth = {
    startFlow: vi.fn(async () => ({
      flowId: "f1",
      userCode: "ABCD-1234",
      verificationUri: "https://github.com/login/device",
      interval: 5,
      expiresIn: 900,
    })),
    pollFlow: vi.fn(async () => ({
      status: "ok" as const,
      sessionId: "sid",
      login: "aymeric",
    })),
    session: vi.fn((id: string | undefined) =>
      id === "sid"
        ? { token: "gho_user", login: "aymeric", expiresAt: Infinity }
        : undefined,
    ),
    logout: vi.fn(),
  };
  const app = createApp({
    githubFor,
    auth,
    publisher,
    info: { repo: "o/r", branch: "main", deploys: false },
    workflowFile: "release.yml",
    staticDir: "dist-admin",
    ...overrides,
  });
  server = createServer((req, res) => void app(req, res));
  await new Promise<void>((resolve) => server!.listen(0, resolve));
  const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  return { github, githubFor, publisher, auth, base };
}

const logged = { Cookie: "linktree_admin=sid" };
const put = (
  base: string,
  body: unknown,
  headers: Record<string, string> = logged,
) =>
  fetch(`${base}/api/links`, {
    method: "PUT",
    headers: { "Content-Type": "application/json", ...headers },
    body: JSON.stringify(body),
  });

describe("admin app", () => {
  it("refuse l'API sans session", async () => {
    const { base, github } = await start();
    expect((await fetch(`${base}/api/links`)).status).toBe(401);
    expect((await put(base, { data: VALID, sha: "x" }, {})).status).toBe(401);
    expect(github.getFile).not.toHaveBeenCalled();
  });

  it("pose le cookie de session à la connexion", async () => {
    const { base } = await start();
    const res = await fetch(`${base}/api/auth/poll`, {
      method: "POST",
      body: JSON.stringify({ flowId: "f1" }),
    });
    expect(await res.json()).toEqual({ status: "ok", login: "aymeric" });
    const cookie = res.headers.get("set-cookie") ?? "";
    expect(cookie).toContain("linktree_admin=sid");
    expect(cookie).toContain("HttpOnly");
  });

  it("ne crée pas de session si le compte n'a pas le droit d'écriture", async () => {
    const { base, auth } = await start();
    auth.pollFlow.mockResolvedValue({
      status: "forbidden",
      login: "intrus",
    } as never);
    const res = await fetch(`${base}/api/auth/poll`, {
      method: "POST",
      body: JSON.stringify({ flowId: "f1" }),
    });
    expect(res.headers.get("set-cookie")).toBeNull();
    expect(await res.json()).toEqual({ status: "forbidden", login: "intrus" });
  });

  it("agit avec le jeton de l'utilisateur et renvoie links.json", async () => {
    const { base, githubFor } = await start();
    const res = await fetch(`${base}/api/links`, { headers: logged });
    expect(await res.json()).toEqual({ data: VALID, sha: "blob1" });
    expect(githubFor).toHaveBeenCalledWith("gho_user");
  });

  it("commit un contenu valide et lance le suivi", async () => {
    const { base, github, publisher } = await start();
    const res = await put(base, { data: VALID, sha: "blob1" });
    expect(res.status).toBe(200);
    expect(github.putFile).toHaveBeenCalledWith(
      "links.json",
      `${JSON.stringify(VALID, null, 2)}\n`,
      "blob1",
      "content: links (admin, aymeric)",
    );
    expect(publisher.track).toHaveBeenCalledWith(
      "commit2",
      expect.any(Function),
    );
  });

  it("refuse un contenu invalide sans rien commiter", async () => {
    const { base, github } = await start();
    const res = await put(base, {
      data: { ...VALID, links: [{ title: "", url: "nope" }] },
      sha: "blob1",
    });
    expect(res.status).toBe(422);
    expect(
      ((await res.json()) as { errors: string[] }).errors.length,
    ).toBeGreaterThan(0);
    expect(github.putFile).not.toHaveBeenCalled();
  });

  it("refuse une image locale absente du dépôt", async () => {
    const { base, github } = await start();
    github.fileExists.mockResolvedValue(false);
    const res = await put(base, { data: VALID, sha: "blob1" });
    expect(res.status).toBe(422);
    expect(github.fileExists).toHaveBeenCalledWith("public/aylabs.jpg");
  });

  it("signale une modification concurrente (409)", async () => {
    const { base, github } = await start();
    github.putFile.mockRejectedValue(new GitHubConflictError());
    expect((await put(base, { data: VALID, sha: "old" })).status).toBe(409);
  });

  const upload = (base: string, name: string, data = "aGVsbG8=") =>
    fetch(`${base}/api/upload`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...logged },
      body: JSON.stringify({ name, data }),
    });

  it("téléverse une image dans public/links avec un nom nettoyé", async () => {
    const { base, github } = await start();
    github.fileExists.mockResolvedValue(false);
    const res = await upload(base, "Ma Photo é!.WEBP");
    expect(await res.json()).toEqual({ path: "/links/ma-photo-e.webp" });
    expect(github.createFile).toHaveBeenCalledWith(
      "public/links/ma-photo-e.webp",
      "aGVsbG8=",
      expect.stringContaining("aymeric"),
    );
  });

  it("ne remplace jamais une image existante", async () => {
    const { base, github } = await start();
    github.fileExists.mockResolvedValueOnce(true).mockResolvedValue(false);
    const res = await upload(base, "logo.png");
    expect(await res.json()).toEqual({ path: "/links/logo-2.png" });
  });

  it("refuse un format non image", async () => {
    const { base, github } = await start();
    expect((await upload(base, "evil.html")).status).toBe(422);
    expect((await upload(base, "noext")).status).toBe(422);
    expect(github.createFile).not.toHaveBeenCalled();
  });

  it("exige une session pour téléverser", async () => {
    const { base } = await start();
    const res = await fetch(`${base}/api/upload`, {
      method: "POST",
      body: JSON.stringify({ name: "a.png", data: "aGk=" }),
    });
    expect(res.status).toBe(401);
  });
});
