import { query, input, s, inp, ref, col, expr, c, auth, obj } from "@xanots/sdk";
import { ranked } from "./ranked.js";
import { requireAdmin } from "./_guards.js";
import { seasons } from "../tables/seasons.js";
import { rankedStates } from "../tables/ranked-states.js";
import { staff } from "../tables/staff.js";
import { auditLog } from "../tables/audit-log.js";

/**
 * POST /api:ranked/close — move a season active -> closed, stamp its end, and
 * transition every ranked_state in it to the terminal `closed` phase. Admin only.
 * Closing an already closed season is refused.
 */
export const closeQuery = query({
  name: "close",
  verb: "POST",
  apiGroup: ranked,
  auth: staff,
  input: { season_id: input.int({ required: true }) },
  stack: [
    ...requireAdmin(),
    s.db.get_by_id({ table: seasons, id: inp("season_id"), as: "season" }),
    s.precondition({
      expr: expr(ref("season", { safe: true }), "!=", c.null()),
      error_type: "notfound",
      error: c.text("No such season."),
    }),
    s.precondition({
      expr: expr(ref("season.status"), "=", c.text("active")),
      error_type: "badrequest",
      error: c.text("Only an active season can be closed."),
    }),
    s.db.edit({
      table: seasons,
      fieldName: "id",
      fieldValue: inp("season_id"),
      row: { status: c.text("closed"), ended_at: c.now() },
      as: "updated",
    }),
    // Every state in the season goes terminal.
    s.db.query({
      table: rankedStates,
      where: expr(col("season_id"), "=", inp("season_id")),
      as: "states",
    }),
    s.foreach({
      list: ref("states"),
      as: "st",
      body: [
        s.db.edit({
          table: rankedStates,
          fieldName: "id",
          fieldValue: ref("st.id"),
          row: { phase: c.text("closed") },
        }),
      ],
    }),
    s.db.add({
      table: auditLog,
      row: {
        actor_id: auth("id"),
        action: c.text("close"),
        target: ref("season.name"),
        detail: obj({ from: c.text("active"), to: c.text("closed") }),
      },
    }),
  ],
  response: { season: ref("updated") },
});
