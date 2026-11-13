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
    fileExists: vi.fn(async () => true),
  };
  const publisher = { state: null, track: vi.fn(async () => undefined) };
  const app = createApp({
    github,
    publisher,
    info: { repo: "o/r", branch: "main", deploys: true },
    staticDir: "dist-admin",
    ...overrides,
  });
  server = createServer((req, res) => void app(req, res));
  await new Promise<void>((resolve) => server!.listen(0, resolve));
  const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  return { github, publisher, base };
}

const put = (
  base: string,
  body: unknown,
  headers: Record<string, string> = {},
) =>
  fetch(`${base}/api/links`, {
    method: "PUT",
    headers: { "Content-Type": "application/json", ...headers },
    body: JSON.stringify(body),
  });

describe("admin app", () => {
  it("renvoie links.json et son sha", async () => {
    const { base } = await start();
    const res = await fetch(`${base}/api/links`);
    expect(await res.json()).toEqual({ data: VALID, sha: "blob1" });
  });

  it("commit un contenu valide et lance le suivi", async () => {
    const { base, github, publisher } = await start();
    const res = await put(base, { data: VALID, sha: "blob1" });
    expect(res.status).toBe(200);
    expect(github.putFile).toHaveBeenCalledWith(
      "links.json",
      `${JSON.stringify(VALID, null, 2)}\n`,
      "blob1",
      expect.any(String),
    );
    expect(publisher.track).toHaveBeenCalledWith("commit2");
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
    const res = await put(base, { data: VALID, sha: "old" });
    expect(res.status).toBe(409);
  });

  it("exige le mot de passe quand il est défini", async () => {
    const { base } = await start({ password: "secret" });
    expect((await fetch(`${base}/api/info`)).status).toBe(401);
    const auth = `Basic ${Buffer.from("x:secret").toString("base64")}`;
    const ok = await fetch(`${base}/api/info`, {
      headers: { Authorization: auth },
    });
    expect(ok.status).toBe(200);
    const bad = await fetch(`${base}/api/info`, {
      headers: {
        Authorization: `Basic ${Buffer.from("x:nope").toString("base64")}`,
      },
    });
    expect(bad.status).toBe(401);
  });
});
