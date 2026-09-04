// The one contract: paths come from the generated route manifest and every
// request/response *type* is inferred from the xanots query defs. Change a def
// and the frontend follows — no hand-typed URL, no hand-mirrored response shape.
//
// routes.gen.ts imports nothing, and the def imports below are `import type`
// (erased at build), so the SDK runtime never enters the browser bundle.

import { routePath } from "../../../xano/routes.gen.js";
import type { InferInput, InferResponse } from "@xanots/sdk";

import type { seedQuery } from "../../../xano/api/seed.js";
import type { loginQuery } from "../../../xano/api/login.js";
import type { seasonsQuery } from "../../../xano/api/seasons.js";
import type { playersQuery } from "../../../xano/api/players.js";
import type { rankQuery } from "../../../xano/api/rank.js";
import type { reportQuery } from "../../../xano/api/report.js";
import type { overrideQuery } from "../../../xano/api/override.js";
import type { auditQuery } from "../../../xano/api/audit.js";

/**
 * The deployed backend URL, injected as `window.XANO_HOST` by
 * `xanots deploy --static`, or read from `VITE_XANO_HOST` in local dev.
 */
export const XANO_HOST: string =
  (typeof window !== "undefined" && (window as { XANO_HOST?: string }).XANO_HOST) ||
  import.meta.env.VITE_XANO_HOST ||
  "";

// ── Types derived from the backend (the one contract) ────────────────────────
export type LoginInput = InferInput<typeof loginQuery>;
export type LoginResponse = InferResponse<typeof loginQuery>;
export type SeedResponse = InferResponse<typeof seedQuery>;
export type Season = InferResponse<typeof seasonsQuery>[number];
export type RosterRow = InferResponse<typeof playersQuery>[number];
export type RankResponse = InferResponse<typeof rankQuery>;
export type ReportInput = InferInput<typeof reportQuery>;
export type ReportResponse = InferResponse<typeof reportQuery>;
export type OverrideInput = InferInput<typeof overrideQuery>;
export type AuditRow = InferResponse<typeof auditQuery>[number];

// ── Auth token (set after login) ─────────────────────────────────────────────
let authToken: string | null = null;
export function setToken(token: string | null): void {
  authToken = token;
}

/** A failed request, carrying the HTTP status so the UI can show 401/403 vs 400. */
export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
    this.name = "ApiError";
  }
}

async function call<T>(
  path: string,
  opts: { method: string; body?: unknown; auth?: boolean } = { method: "GET" },
): Promise<T> {
  const headers: Record<string, string> = {};
  if (opts.body !== undefined) headers["content-type"] = "application/json";
  if (opts.auth && authToken) headers["authorization"] = `Bearer ${authToken}`;

  const res = await fetch(XANO_HOST + path, {
    method: opts.method,
    headers,
    body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
  });

  if (!res.ok) {
    const raw = await res.text();
    let message = raw;
    try {
      const parsed = JSON.parse(raw);
      message = parsed?.message || parsed?.error || raw;
    } catch {
      /* keep raw text */
    }
    throw new ApiError(res.status, message || `Request failed (${res.status}).`);
  }
  return (await res.json()) as T;
}

// ── Endpoint wrappers ────────────────────────────────────────────────────────
export const api = {
  seed: (): Promise<SeedResponse> => call(routePath("POST seed"), { method: "POST" }),

  login: (body: LoginInput): Promise<LoginResponse> =>
    call(routePath("POST login"), { method: "POST", body }),

  seasons: (): Promise<Season[]> => call(routePath("GET seasons"), { method: "GET" }),

  players: (seasonId: number): Promise<RosterRow[]> =>
    call(`${routePath("GET players")}?season_id=${seasonId}`, { method: "GET" }),

  rank: (playerId: number, seasonId: number): Promise<RankResponse> =>
    call(`${routePath("GET rank/{player_id}", { player_id: playerId })}?season_id=${seasonId}`, {
      method: "GET",
    }),

  report: (body: ReportInput): Promise<ReportResponse> =>
    call(routePath("POST report"), { method: "POST", body, auth: true }),

  advance: (seasonId: number): Promise<{ season: unknown }> =>
    call(routePath("POST advance"), { method: "POST", body: { season_id: seasonId }, auth: true }),

  close: (seasonId: number): Promise<{ season: unknown }> =>
    call(routePath("POST close"), { method: "POST", body: { season_id: seasonId }, auth: true }),

  override: (body: OverrideInput): Promise<ReportResponse> =>
    call(routePath("POST override"), { method: "POST", body, auth: true }),

  audit: (): Promise<AuditRow[]> => call(routePath("GET audit"), { method: "GET", auth: true }),
};
