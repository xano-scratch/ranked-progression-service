import { query, input, s, inp, ref, col, expr, and, c, auth, obj } from "@xanots/sdk";
import { ranked } from "./ranked.js";
import { rankedStates } from "../tables/ranked-states.js";
import { matchResults } from "../tables/match-results.js";
import { ratingHistory } from "../tables/rating-history.js";
import { auditLog } from "../tables/audit-log.js";
import { seasons } from "../tables/seasons.js";
import { players } from "../tables/players.js";
import { staff } from "../tables/staff.js";

/**
 * POST /api:ranked/report — report a match outcome for a player and let the
 * governed engine recompute rating and drive the progression state machine.
 *
 * The guards are explicit statements a reviewer can point at:
 *   - auth: staff        a reporter OR an admin may report (RBAC at the API layer)
 *   - season is active   a closed/upcoming season is refused
 *   - state exists       the player must be in that season
 *   - phase not terminal promoted / demoted / closed refuse a further result
 *
 * The rating math and the phase transition live in ONE readable lambda (the
 * "rating engine"). It is a pure function of the current state and the reported
 * outcome, and it is bounded: a per-match swing is capped, rating never drops
 * below zero, and only a defined transition changes the phase. The stack then
 * writes the state, an immutable match row, a rating-ledger row, and an audit row.
 */
export const reportQuery = query({
  name: "report",
  verb: "POST",
  apiGroup: ranked,
  auth: staff,
  input: {
    player_id: input.int({ required: true }),
    season_id: input.int({ required: true }),
    outcome: input.enum(["win", "loss", "draw"], { required: true }),
    opponent_rating: input.int({ required: false, default: 1200 }),
  },
  stack: [
    s.db.get_by_id({ table: seasons, id: inp("season_id"), as: "season" }),
    s.precondition({
      expr: expr(ref("season", { safe: true }), "!=", c.null()),
      error_type: "notfound",
      error: c.text("No such season."),
    }),
    s.precondition({
      expr: expr(ref("season.status"), "=", c.text("active")),
      error_type: "badrequest",
      error: c.text("Results can only be reported on an active season."),
    }),
    s.db.query({
      table: rankedStates,
      where: [expr(col("player_id"), "=", inp("player_id")), expr(col("season_id"), "=", inp("season_id"))],
      returnType: "single",
      as: "state",
    }),
    s.precondition({
      expr: expr(ref("state", { safe: true }), "!=", c.null()),
      error_type: "notfound",
      error: c.text("This player is not in that season."),
    }),
    // Terminal phases refuse a result — the illegal transition is blocked here,
    // not left to the client.
    s.precondition({
      expr: and(
        expr(ref("state.phase"), "!=", c.text("promoted")),
        expr(ref("state.phase"), "!=", c.text("demoted")),
        expr(ref("state.phase"), "!=", c.text("closed")),
      ),
      error_type: "badrequest",
      error: c.text("This player's season is already resolved (promoted, demoted, or closed)."),
    }),
    // Fetch the player so we can name it on the audit row.
    s.db.get_by_id({ table: players, id: inp("player_id"), as: "player" }),
    // ── The rating engine ────────────────────────────────────────────────────
    s.lambda({
      as: "engine",
      code: ({ $var, $input }) => {
        const st: {
          rating: number;
          phase: string;
          tier: string;
          division: number;
          placement_games_remaining: number;
          series_wins: number;
          series_losses: number;
          series_target: number;
        } = $var.state as never;
        const outcome = String($input.outcome);
        const opp = Number($input.opponent_rating) || 1200;

        // Governed constants: one tier is 600 rating, split into 4 divisions of 150.
        const TIER_SIZE = 600;
        const DIV_SIZE = 150;
        const K = 40; // caps a single match's swing at +/- 40
        const TIERS = ["Bronze", "Silver", "Gold", "Platinum", "Diamond"];

        const clampInt = (n: number, lo: number, hi: number) =>
          Math.max(lo, Math.min(hi, n));

        // Rating -> (tier, division). Division 4 is the tier floor, 1 its top.
        const derive = (r: number) => {
          const idx = clampInt(Math.floor(r / TIER_SIZE), 0, 4);
          const within = r - idx * TIER_SIZE;
          const step = clampInt(Math.floor(within / DIV_SIZE), 0, 3);
          return { tier: TIERS[idx], division: 4 - step, idx };
        };

        const before = Number(st.rating) || 0;
        const curIdx = Math.max(0, TIERS.indexOf(st.tier));

        // Elo-style expectation; the swing is already inside [-K, K].
        const score = outcome === "win" ? 1 : outcome === "draw" ? 0.5 : 0;
        const expected = 1 / (1 + Math.pow(10, (opp - before) / 400));
        let swing = Math.round(K * (score - expected));
        swing = clampInt(swing, -K, K);
        let after = Math.max(0, before + swing);

        let phase = st.phase;
        let tier = st.tier;
        let division = Number(st.division) || 4;
        let placement = Number(st.placement_games_remaining) || 0;
        let wins = Number(st.series_wins) || 0;
        let losses = Number(st.series_losses) || 0;
        const target = Number(st.series_target) || 3;
        let reason = "match";

        if (phase === "placement") {
          reason = "placement";
          placement = Math.max(0, placement - 1);
          const d = derive(after);
          tier = d.tier;
          division = d.division;
          if (placement === 0) phase = "ranked"; // placement resolves into ranked
        } else if (phase === "ranked") {
          const d = derive(after);
          if (outcome === "win" && d.idx > curIdx && curIdx < 4) {
            // A win crossing into the next tier opens a promotion series instead
            // of promoting outright. Rating pins at the boundary until it is won.
            phase = "promotion_series";
            wins = 0;
            losses = 0;
            after = (curIdx + 1) * TIER_SIZE;
            division = 1;
            reason = "match";
          } else if (outcome === "loss" && after < curIdx * TIER_SIZE && curIdx > 0) {
            // A bottom-boundary loss is the defined demotion.
            phase = "demoted";
            const dd = derive(after);
            tier = dd.tier;
            division = dd.division;
            reason = "demotion";
          } else {
            tier = d.tier;
            division = d.division;
          }
        } else if (phase === "promotion_series") {
          if (outcome === "win") {
            wins += 1;
            if (wins >= target) {
              const nextIdx = Math.min(4, curIdx + 1);
              phase = "promoted";
              // Land at least at the new tier's floor; never drop a promotion.
              after = Math.max(after, nextIdx * TIER_SIZE + 10);
              const dd = derive(after);
              tier = dd.tier;
              division = dd.division;
              reason = "promotion";
            }
          } else if (outcome === "loss") {
            losses += 1;
            if (losses >= target) {
              // Series failed: fall back into the current tier just below the line.
              phase = "ranked";
              after = curIdx * TIER_SIZE + (TIER_SIZE - 50);
              const dd = derive(after);
              tier = dd.tier;
              division = dd.division;
              reason = "match";
            }
          }
          // A draw does not move a series.
        }

        return {
          rating_before: before,
          rating_after: after,
          delta: after - before,
          phase,
          tier,
          division,
          placement_games_remaining: placement,
          series_wins: wins,
          series_losses: losses,
          series_target: target,
          reason,
        };
      },
    }),
    // ── Apply the computed transition ─────────────────────────────────────────
    s.db.edit({
      table: rankedStates,
      fieldName: "id",
      fieldValue: ref("state.id"),
      row: {
        phase: ref("engine.phase"),
        tier: ref("engine.tier"),
        division: ref("engine.division"),
        rating: ref("engine.rating_after"),
        placement_games_remaining: ref("engine.placement_games_remaining"),
        series_wins: ref("engine.series_wins"),
        series_losses: ref("engine.series_losses"),
      },
      as: "updated",
    }),
    s.db.add({
      table: matchResults,
      row: {
        season_id: inp("season_id"),
        player_id: inp("player_id"),
        outcome: inp("outcome"),
        opponent_rating: inp("opponent_rating"),
        rating_before: ref("engine.rating_before"),
        rating_after: ref("engine.rating_after"),
        reported_by: auth("id"),
      },
      as: "match",
    }),
    s.db.add({
      table: ratingHistory,
      row: {
        player_id: inp("player_id"),
        season_id: inp("season_id"),
        rating_before: ref("engine.rating_before"),
        rating_after: ref("engine.rating_after"),
        delta: ref("engine.delta"),
        reason: ref("engine.reason"),
      },
      as: "hist",
    }),
    s.db.add({
      table: auditLog,
      row: {
        actor_id: auth("id"),
        action: c.text("report"),
        target: ref("player.handle"),
        detail: obj({
          outcome: inp("outcome"),
          reason: ref("engine.reason"),
          rating_before: ref("engine.rating_before"),
          rating_after: ref("engine.rating_after"),
          phase: ref("engine.phase"),
        }),
      },
    }),
  ],
  response: { state: ref("updated"), match: ref("match"), history: ref("hist") },
});
