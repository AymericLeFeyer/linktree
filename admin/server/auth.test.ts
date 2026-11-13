import { describe, expect, it } from "vitest";
import { AuthService } from "./auth.ts";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status });

function service(
  handler: (url: string) => Response,
  now: () => number = () => 0,
) {
  return new AuthService({
    clientId: "cid",
    repo: "o/r",
    now,
    fetchFn: async (url) => handler(String(url)),
  });
}

const DEVICE = {
  device_code: "dc",
  user_code: "ABCD-1234",
  verification_uri: "https://github.com/login/device",
  interval: 5,
  expires_in: 900,
};

describe("AuthService", () => {
  it("connecte un compte avec droit d'écriture", async () => {
    const auth = service((url) => {
      if (url.endsWith("/device/code")) return json(DEVICE);
      if (url.endsWith("/access_token")) return json({ access_token: "tok" });
      if (url.endsWith("/user")) return json({ login: "aymeric" });
      return json({ permissions: { push: true } });
    });
    const flow = await auth.startFlow();
    expect(flow.userCode).toBe("ABCD-1234");
    const result = await auth.pollFlow(flow.flowId);
    expect(result).toMatchObject({ status: "ok", login: "aymeric" });
    if (result.status !== "ok") throw new Error();
    expect(auth.session(result.sessionId)?.token).toBe("tok");
    auth.logout(result.sessionId);
    expect(auth.session(result.sessionId)).toBeUndefined();
  });

  it("refuse un compte sans droit d'écriture", async () => {
    const auth = service((url) => {
      if (url.endsWith("/device/code")) return json(DEVICE);
      if (url.endsWith("/access_token")) return json({ access_token: "tok" });
      if (url.endsWith("/user")) return json({ login: "intrus" });
      return json({ permissions: { push: false } });
    });
    const flow = await auth.startFlow();
    expect(await auth.pollFlow(flow.flowId)).toEqual({
      status: "forbidden",
      login: "intrus",
    });
  });

  it("reste en attente tant que l'utilisateur n'a pas validé", async () => {
    const auth = service((url) =>
      url.endsWith("/device/code")
        ? json(DEVICE)
        : json({ error: "authorization_pending" }),
    );
    const flow = await auth.startFlow();
    expect(await auth.pollFlow(flow.flowId)).toEqual({ status: "pending" });
  });

  it("expire une session après 12 h", async () => {
    let t = 0;
    const auth = service(
      (url) => {
        if (url.endsWith("/device/code")) return json(DEVICE);
        if (url.endsWith("/access_token")) return json({ access_token: "tok" });
        if (url.endsWith("/user")) return json({ login: "a" });
        return json({ permissions: { push: true } });
      },
      () => t,
    );
    const flow = await auth.startFlow();
    const result = await auth.pollFlow(flow.flowId);
    if (result.status !== "ok") throw new Error();
    t = 13 * 3600_000;
    expect(auth.session(result.sessionId)).toBeUndefined();
  });
});
