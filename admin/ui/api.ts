import type { RawLinktree } from "./model.ts";

export interface PublishState {
  commit: string;
  step: "pipeline" | "deploy" | "done" | "error";
  message: string;
  runUrl?: string;
}

export interface Info {
  repo: string;
  branch: string;
  deploys: boolean;
}

export class ApiError extends Error {
  readonly status: number;
  readonly errors: string[];
  constructor(status: number, message: string, errors: string[] = []) {
    super(message);
    this.status = status;
    this.errors = errors;
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, init);
  const body = (await res.json().catch(() => ({}))) as {
    error?: string;
    errors?: string[];
  };
  if (!res.ok) {
    throw new ApiError(
      res.status,
      body.error ?? "Validation refusée par le serveur.",
      body.errors,
    );
  }
  return body as T;
}

export interface DeviceFlow {
  flowId: string;
  userCode: string;
  verificationUri: string;
  interval: number;
  expiresIn: number;
}

export type PollResult =
  | { status: "pending" | "expired" | "denied" }
  | { status: "forbidden" | "ok"; login: string };

const post = <T>(path: string, body: unknown = {}) =>
  request<T>(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

export const api = {
  info: () => request<Info>("/api/info"),
  session: () => request<{ login: string }>("/api/session"),
  startLogin: () => post<DeviceFlow>("/api/auth/device"),
  pollLogin: (flowId: string) => post<PollResult>("/api/auth/poll", { flowId }),
  logout: () => post("/api/auth/logout"),
  load: () => request<{ data: RawLinktree; sha: string }>("/api/links"),
  save: (data: RawLinktree, sha: string) =>
    request<{ sha: string; commit: string }>("/api/links", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ data, sha }),
    }),
  publish: () =>
    request<{ state: PublishState | null }>("/api/publish").then(
      (r) => r.state,
    ),
};
