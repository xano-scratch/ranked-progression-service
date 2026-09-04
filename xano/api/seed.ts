import { query, s, ref, c } from "@xanots/sdk";
import { ranked } from "./ranked.js";
import { staff } from "../tables/staff.js";
import { players } from "../tables/players.js";
import { seasons } from "../tables/seasons.js";
import { rankedStates } from "../tables/ranked-states.js";
import { matchResults } from "../tables/match-results.js";
import { ratingHistory } from "../tables/rating-history.js";
import { auditLog } from "../tables/audit-log.js";

/**
 * POST /api:ranked/seed — reset the workspace and load a demo. Public, so the
 * deployed ephemeral is browsable on first load and a reviewer can hit "Reset".
 *
 * The demo spreads players across EVERY phase (placement, ranked, a live
 * promotion series, promoted) plus a closed season, so every screen shows real
 * state and every guard has something to refuse.
 *
 * Demo logins:
 *   admin@arena.gg    / admin-pass-2026     (role admin)
 *   reporter@arena.gg / reporter-pass-2026  (role reporter)
 */
export const seedQuery = query({
  name: "seed",
  verb: "POST",
  apiGroup: ranked,
  stack: [
    s.db.truncate({ table: auditLog, reset: true }),
    s.db.truncate({ table: ratingHistory, reset: true }),
    s.db.truncate({ table: matchResults, reset: true }),
    s.db.truncate({ table: rankedStates, reset: true }),
    s.db.truncate({ table: seasons, reset: true }),
    s.db.truncate({ table: players, reset: true }),
    s.db.truncate({ table: staff, reset: true }),

    // ── Staff (the auth table; passwords hash on write) ───────────────────────
    s.db.add({
      table: staff,
      row: { email: "admin@arena.gg", password: "admin-pass-2026", name: "Ada Ops", role: "admin" },
      as: "st_admin",
    }),
    s.db.add({
      table: staff,
      row: { email: "reporter@arena.gg", password: "reporter-pass-2026", name: "Rey Score", role: "reporter" },
      as: "st_reporter",
    }),

    // ── Players ───────────────────────────────────────────────────────────────
    s.db.add({ table: players, row: { handle: "vortex", display_name: "Vortex" }, as: "p1" }),
    s.db.add({ table: players, row: { handle: "nova", display_name: "Nova" }, as: "p2" }),
    s.db.add({ table: players, row: { handle: "razor", display_name: "Razor" }, as: "p3" }),
    s.db.add({ table: players, row: { handle: "echo", display_name: "Echo" }, as: "p4" }),
    s.db.add({ table: players, row: { handle: "quake", display_name: "Quake" }, as: "p5" }),
    s.db.add({ table: players, row: { handle: "titan", display_name: "Titan" }, as: "p6" }),

    // ── Seasons ─────────────────────────────────────────────────────────────
    s.db.add({
      table: seasons,
      row: { name: "Season 7", status: "active", started_at: c.now() },
      as: "s_active",
    }),
    s.db.add({
      table: seasons,
      row: { name: "Season 6", status: "closed", started_at: c.now(), ended_at: c.now() },
      as: "s_closed",
    }),
    s.db.add({
      table: seasons,
      row: { name: "Season 8", status: "upcoming" },
      as: "s_upcoming",
    }),

    // ── Ranked states in the ACTIVE season — one per phase ────────────────────
    // Placement: rating moves but the phase resolves only when games run out.
    s.db.add({
      table: rankedStates,
      row: {
        player_id: ref("p1.id"), season_id: ref("s_active.id"), phase: "placement",
        tier: "Silver", division: 2, rating: 1000, placement_games_remaining: 3,
        series_wins: 0, series_losses: 0, series_target: 3,
      },
    }),
    s.db.add({
      table: rankedStates,
      row: {
        player_id: ref("p2.id"), season_id: ref("s_active.id"), phase: "placement",
        tier: "Silver", division: 3, rating: 850, placement_games_remaining: 1,
        series_wins: 0, series_losses: 0, series_target: 3,
      },
    }),
    // Ranked mid-tier.
    s.db.add({
      table: rankedStates,
      row: {
        player_id: ref("p3.id"), season_id: ref("s_active.id"), phase: "ranked",
        tier: "Gold", division: 3, rating: 1450, placement_games_remaining: 0,
        series_wins: 0, series_losses: 0, series_target: 3,
      },
    }),
    // A live promotion series at the Gold -> Platinum line (1 win in, needs 3).
    s.db.add({
      table: rankedStates,
      row: {
        player_id: ref("p4.id"), season_id: ref("s_active.id"), phase: "promotion_series",
        tier: "Gold", division: 1, rating: 1800, placement_games_remaining: 0,
        series_wins: 1, series_losses: 0, series_target: 3,
      },
    }),
    // Ranked at the Silver floor: one loss demotes to Bronze.
    s.db.add({
      table: rankedStates,
      row: {
        player_id: ref("p5.id"), season_id: ref("s_active.id"), phase: "ranked",
        tier: "Silver", division: 4, rating: 615, placement_games_remaining: 0,
        series_wins: 0, series_losses: 0, series_target: 3,
      },
    }),
    // Already promoted (terminal): report() will refuse a further result.
    s.db.add({
      table: rankedStates,
      row: {
        player_id: ref("p6.id"), season_id: ref("s_active.id"), phase: "promoted",
        tier: "Platinum", division: 4, rating: 1810, placement_games_remaining: 0,
        series_wins: 3, series_losses: 0, series_target: 3,
      },
    }),

    // ── Ranked states in the CLOSED season — all terminal ─────────────────────
    s.db.add({
      table: rankedStates,
      row: {
        player_id: ref("p3.id"), season_id: ref("s_closed.id"), phase: "closed",
        tier: "Gold", division: 2, rating: 1550, placement_games_remaining: 0,
        series_wins: 0, series_losses: 0, series_target: 3,
      },
    }),
    s.db.add({
      table: rankedStates,
      row: {
        player_id: ref("p6.id"), season_id: ref("s_closed.id"), phase: "closed",
        tier: "Diamond", division: 4, rating: 2450, placement_games_remaining: 0,
        series_wins: 0, series_losses: 0, series_target: 3,
      },
    }),

    // ── Sample ledger + match rows so player detail is populated ──────────────
    s.db.add({
      table: matchResults,
      row: { season_id: ref("s_active.id"), player_id: ref("p3.id"), outcome: "win", opponent_rating: 1440, rating_before: 1400, rating_after: 1425, reported_by: ref("st_reporter.id") },
    }),
    s.db.add({
      table: ratingHistory,
      row: { player_id: ref("p3.id"), season_id: ref("s_active.id"), rating_before: 1400, rating_after: 1425, delta: 25, reason: "match" },
    }),
    s.db.add({
      table: matchResults,
      row: { season_id: ref("s_active.id"), player_id: ref("p3.id"), outcome: "win", opponent_rating: 1460, rating_before: 1425, rating_after: 1450, reported_by: ref("st_reporter.id") },
    }),
    s.db.add({
      table: ratingHistory,
      row: { player_id: ref("p3.id"), season_id: ref("s_active.id"), rating_before: 1425, rating_after: 1450, delta: 25, reason: "match" },
    }),
    s.db.add({
      table: matchResults,
      row: { season_id: ref("s_active.id"), player_id: ref("p4.id"), outcome: "win", opponent_rating: 1820, rating_before: 1785, rating_after: 1800, reported_by: ref("st_reporter.id") },
    }),
    s.db.add({
      table: ratingHistory,
      row: { player_id: ref("p4.id"), season_id: ref("s_active.id"), rating_before: 1785, rating_after: 1800, delta: 15, reason: "match" },
    }),
    s.db.add({
      table: matchResults,
      row: { season_id: ref("s_active.id"), player_id: ref("p6.id"), outcome: "win", opponent_rating: 1780, rating_before: 1770, rating_after: 1790, reported_by: ref("st_reporter.id") },
    }),
    s.db.add({
      table: ratingHistory,
      row: { player_id: ref("p6.id"), season_id: ref("s_active.id"), rating_before: 1770, rating_after: 1790, delta: 20, reason: "match" },
    }),
    s.db.add({
      table: matchResults,
      row: { season_id: ref("s_active.id"), player_id: ref("p6.id"), outcome: "win", opponent_rating: 1800, rating_before: 1790, rating_after: 1810, reported_by: ref("st_reporter.id") },
    }),
    s.db.add({
      table: ratingHistory,
      row: { player_id: ref("p6.id"), season_id: ref("s_active.id"), rating_before: 1790, rating_after: 1810, delta: 20, reason: "promotion" },
    }),

    // ── Audit trail seed ──────────────────────────────────────────────────────
    s.db.add({
      table: auditLog,
      row: { actor_id: ref("st_admin.id"), action: "advance", target: "Season 7", detail: c.obj({ from: "upcoming", to: "active" }) },
    }),
    s.db.add({
      table: auditLog,
      row: { actor_id: ref("st_reporter.id"), action: "report", target: "razor", detail: c.obj({ outcome: "win", reason: "match" }) },
    }),
    s.db.add({
      table: auditLog,
      row: { actor_id: ref("st_reporter.id"), action: "report", target: "echo", detail: c.obj({ outcome: "win", reason: "match" }) },
    }),
  ],
  response: { ok: c.bool(true), active_season_id: ref("s_active.id") },
});
