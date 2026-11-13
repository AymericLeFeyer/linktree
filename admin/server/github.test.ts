import { describe, expect, it } from "vitest";
import { GitHubClient, GitHubConflictError, GitHubError } from "./github.ts";

const settings = { token: "t", repo: "o/r", branch: "main" };
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status });

describe("GitHubClient", () => {
  it("décode le contenu base64", async () => {
    const client = new GitHubClient(settings, async () =>
      json({ content: Buffer.from("héllo").toString("base64"), sha: "s" }),
    );
    expect(await client.getFile("links.json")).toEqual({
      content: "héllo",
      sha: "s",
    });
  });

  it("envoie token, branche et sha à l'écriture", async () => {
    let seen: { url: string; init: RequestInit } | undefined;
    const client = new GitHubClient(settings, async (url, init) => {
      seen = { url: String(url), init: init! };
      return json({ commit: { sha: "c" }, content: { sha: "b" } });
    });
    const result = await client.putFile("links.json", "x", "old", "msg");
    expect(result).toEqual({ commit: "c", sha: "b" });
    expect(seen?.url).toBe(
      "https://api.github.com/repos/o/r/contents/links.json",
    );
    expect((seen?.init.headers as Record<string, string>).Authorization).toBe(
      "Bearer t",
    );
    expect(JSON.parse(String(seen?.init.body))).toMatchObject({
      sha: "old",
      branch: "main",
      message: "msg",
    });
  });

  it("transforme 409 et 422 en conflit", async () => {
    for (const status of [409, 422]) {
      const client = new GitHubClient(settings, async () => json({}, status));
      await expect(client.putFile("a", "b", "c", "d")).rejects.toBeInstanceOf(
        GitHubConflictError,
      );
    }
  });

  it("fileExists : 404 = absent, autre erreur remontée", async () => {
    const missing = new GitHubClient(settings, async () => json({}, 404));
    expect(await missing.fileExists("public/x.png")).toBe(false);
    const broken = new GitHubClient(settings, async () => json({}, 500));
    await expect(broken.fileExists("public/x.png")).rejects.toBeInstanceOf(
      GitHubError,
    );
  });

  it("workflowRun : null sans run, sinon le plus récent", async () => {
    const none = new GitHubClient(settings, async () =>
      json({ workflow_runs: [] }),
    );
    expect(await none.workflowRun("release.yml", "abc")).toBeNull();
    const some = new GitHubClient(settings, async () =>
      json({
        workflow_runs: [
          { id: 7, status: "completed", conclusion: "success", html_url: "u" },
        ],
      }),
    );
    expect(await some.workflowRun("release.yml", "abc")).toEqual({
      id: 7,
      status: "completed",
      conclusion: "success",
      url: "u",
    });
  });
});
