import { query, input, s, inp, ref, expr, c, auth, obj } from "@xanots/sdk";
import { ranked } from "./ranked.js";
import { requireAdmin } from "./_guards.js";
import { seasons } from "../tables/seasons.js";
import { staff } from "../tables/staff.js";
import { auditLog } from "../tables/audit-log.js";

/**
 * POST /api:ranked/advance — move a season upcoming -> active and stamp its start.
 * Admin only. The lifecycle is enforced: advancing an already active or closed
 * season is refused at the API layer, so the season graph can only walk forward.
 */
export const advanceQuery = query({
  name: "advance",
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
      expr: expr(ref("season.status"), "=", c.text("upcoming")),
      error_type: "badrequest",
      error: c.text("Only an upcoming season can be advanced to active."),
    }),
    s.db.edit({
      table: seasons,
      fieldName: "id",
      fieldValue: inp("season_id"),
      row: { status: c.text("active"), started_at: c.now() },
      as: "updated",
    }),
    s.db.add({
      table: auditLog,
      row: {
        actor_id: auth("id"),
        action: c.text("advance"),
        target: ref("season.name"),
        detail: obj({ from: c.text("upcoming"), to: c.text("active") }),
      },
    }),
  ],
  response: { season: ref("updated") },
});
