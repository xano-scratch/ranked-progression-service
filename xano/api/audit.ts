import { query, s, ref, col, expr } from "@xanots/sdk";
import { ranked } from "./ranked.js";
import { requireAdmin } from "./_guards.js";
import { auditLog } from "../tables/audit-log.js";
import { staff } from "../tables/staff.js";

/**
 * GET /api:ranked/audit — the append-only trail of every governed action, newest
 * first, with the acting staff member's name. Admin only: the audit surface is
 * itself governed.
 */
export const auditQuery = query({
  name: "audit",
  verb: "GET",
  apiGroup: ranked,
  auth: staff,
  stack: [
    ...requireAdmin(),
    s.db.query({
      table: auditLog,
      bind: [
        {
          table: staff,
          as: "actor_row",
          join: "left",
          where: expr(col("actor_id"), "=", col("actor_row.id")),
        },
      ],
      eval: [{ name: "actor_row.name", as: "actor_name" }],
      sort: [{ sortBy: "created_at", dir: "desc" }],
      as: "rows",
    }),
  ],
  response: ref("rows"),
});
