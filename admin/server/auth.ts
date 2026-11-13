import { randomBytes } from "node:crypto";

export interface Session {
  /** Jeton OAuth de l'utilisateur : toutes les écritures GitHub se font avec lui. */
  token: string;
  login: string;
  expiresAt: number;
}

export interface DeviceFlow {
  flowId: string;
  userCode: string;
  verificationUri: string;
  interval: number;
  expiresIn: number;
}

export type PollResult =
  | { status: "pending" }
  | { status: "expired" | "denied" }
  | { status: "forbidden"; login: string }
  | { status: "ok"; sessionId: string; login: string };

interface AuthOptions {
  /** Client ID (public) d'une OAuth App GitHub avec « Device Flow » activé. */
  clientId: string;
  /** `owner/nom` : il faut y avoir le droit d'écriture pour se connecter. */
  repo: string;
  fetchFn?: typeof fetch;
  now?: () => number;
}

const SESSION_MS = 12 * 3600_000;
const SCOPE = "repo";

/**
 * Connexion par GitHub « device flow » : pas de secret à stocker ni d'URL de
 * retour à déclarer. L'utilisateur saisit un code sur github.com/login/device ;
 * l'admin n'accepte que les comptes ayant le droit d'écriture sur le dépôt.
 */
export class AuthService {
  private readonly options: Required<AuthOptions>;
  private readonly flows = new Map<
    string,
    { deviceCode: string; expiresAt: number }
  >();
  private readonly sessions = new Map<string, Session>();

  constructor(options: AuthOptions) {
    this.options = { fetchFn: fetch, now: () => Date.now(), ...options };
  }

  async startFlow(): Promise<DeviceFlow> {
    const data = await this.post<{
      device_code: string;
      user_code: string;
      verification_uri: string;
      interval: number;
      expires_in: number;
    }>("https://github.com/login/device/code", { scope: SCOPE });
    const flowId = randomBytes(16).toString("hex");
    this.flows.set(flowId, {
      deviceCode: data.device_code,
      expiresAt: this.options.now() + data.expires_in * 1000,
    });
    return {
      flowId,
      userCode: data.user_code,
      verificationUri: data.verification_uri,
      interval: data.interval,
      expiresIn: data.expires_in,
    };
  }

  async pollFlow(flowId: string): Promise<PollResult> {
    const flow = this.flows.get(flowId);
    if (!flow || flow.expiresAt < this.options.now()) {
      this.flows.delete(flowId);
      return { status: "expired" };
    }
    const data = await this.post<{ access_token?: string; error?: string }>(
      "https://github.com/login/oauth/access_token",
      {
        device_code: flow.deviceCode,
        grant_type: "urn:ietf:params:oauth:grant-type:device_code",
      },
    );
    if (!data.access_token) {
      if (
        data.error === "authorization_pending" ||
        data.error === "slow_down"
      ) {
        return { status: "pending" };
      }
      this.flows.delete(flowId);
      return { status: data.error === "access_denied" ? "denied" : "expired" };
    }
    this.flows.delete(flowId);

    const token = data.access_token;
    const user = await this.api<{ login: string }>(token, "/user");
    const repo = await this.api<{ permissions?: { push?: boolean } }>(
      token,
      `/repos/${this.options.repo}`,
    ).catch(() => null);
    if (!repo?.permissions?.push) {
      return { status: "forbidden", login: user.login };
    }
    const sessionId = randomBytes(32).toString("hex");
    this.sessions.set(sessionId, {
      token,
      login: user.login,
      expiresAt: this.options.now() + SESSION_MS,
    });
    return { status: "ok", sessionId, login: user.login };
  }

  session(sessionId: string | undefined): Session | undefined {
    if (!sessionId) return undefined;
    const session = this.sessions.get(sessionId);
    if (session && session.expiresAt < this.options.now()) {
      this.sessions.delete(sessionId);
      return undefined;
    }
    return session;
  }

  logout(sessionId: string | undefined): void {
    if (sessionId) this.sessions.delete(sessionId);
  }

  private async post<T>(url: string, params: Record<string, string>) {
    const res = await this.options.fetchFn(url, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ client_id: this.options.clientId, ...params }),
      signal: AbortSignal.timeout(15_000),
    });
    if (!res.ok) throw new Error(`GitHub ${res.status} sur ${url}.`);
    return (await res.json()) as T;
  }

  private async api<T>(token: string, path: string): Promise<T> {
    const res = await this.options.fetchFn(`https://api.github.com${path}`, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github+json",
        "User-Agent": "linktree-admin",
      },
      signal: AbortSignal.timeout(15_000),
    });
    if (!res.ok) throw new Error(`GitHub ${res.status} sur ${path}.`);
    return (await res.json()) as T;
  }
}
