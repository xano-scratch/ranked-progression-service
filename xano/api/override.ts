import { query, input, s, inp, ref, col, expr, c, auth, obj } from "@xanots/sdk";
import { ranked } from "./ranked.js";
import { requireAdmin } from "./_guards.js";
import { rankedStates } from "../tables/ranked-states.js";
import { ratingHistory } from "../tables/rating-history.js";
import { auditLog } from "../tables/audit-log.js";
import { players } from "../tables/players.js";
import { staff } from "../tables/staff.js";

/**
 * POST /api:ranked/override — the ONE sanctioned bypass of the state machine: an
 * admin forces a rating (and optionally a phase) for a player's ranked_state.
 * Admin only; a reporter token is refused. Tier and division are re-derived from
 * the forced rating, and the change is written to the ledger (reason: override)
 * and the audit trail, so even the bypass leaves a governed record.
 */
export const overrideQuery = query({
  name: "override",
  verb: "POST",
  apiGroup: ranked,
  auth: staff,
  input: {
    player_id: input.int({ required: true }),
    season_id: input.int({ required: true }),
    rating: input.int({ required: true }),
    phase: input.enum(
      ["placement", "ranked", "promotion_series", "promoted", "demoted", "closed"],
      { required: false },
    ),
  },
  stack: [
    ...requireAdmin(),
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
    s.db.get_by_id({ table: players, id: inp("player_id"), as: "player" }),
    // Re-derive tier/division from the forced rating; keep the phase unless one is given.
    s.lambda({
      as: "engine",
      code: ({ $var, $input }) => {
        const st: { rating: number; phase: string } = $var.state as never;
        const TIER_SIZE = 600;
        const DIV_SIZE = 150;
        const TIERS = ["Bronze", "Silver", "Gold", "Platinum", "Diamond"];
        const clampInt = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));
        const before = Number(st.rating) || 0;
        const after = Math.max(0, Number($input.rating) || 0);
        const idx = clampInt(Math.floor(after / TIER_SIZE), 0, 4);
        const within = after - idx * TIER_SIZE;
        const step = clampInt(Math.floor(within / DIV_SIZE), 0, 3);
        const phase = $input.phase ? String($input.phase) : String(st.phase);
        return {
          rating_before: before,
          rating_after: after,
          delta: after - before,
          tier: TIERS[idx],
          division: 4 - step,
          phase,
        };
      },
    }),
    s.db.edit({
      table: rankedStates,
      fieldName: "id",
      fieldValue: ref("state.id"),
      row: {
        rating: ref("engine.rating_after"),
        tier: ref("engine.tier"),
        division: ref("engine.division"),
        phase: ref("engine.phase"),
      },
      as: "updated",
    }),
    s.db.add({
      table: ratingHistory,
      row: {
        player_id: inp("player_id"),
        season_id: inp("season_id"),
        rating_before: ref("engine.rating_before"),
        rating_after: ref("engine.rating_after"),
        delta: ref("engine.delta"),
        reason: c.text("override"),
      },
      as: "hist",
    }),
    s.db.add({
      table: auditLog,
      row: {
        actor_id: auth("id"),
        action: c.text("override"),
        target: ref("player.handle"),
        detail: obj({
          rating_before: ref("engine.rating_before"),
          rating_after: ref("engine.rating_after"),
          phase: ref("engine.phase"),
        }),
      },
    }),
  ],
  response: { state: ref("updated"), history: ref("hist") },
});
