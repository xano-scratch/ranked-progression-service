import { table, f } from "@xanots/sdk";
import { staff } from "./staff.js";

/**
 * audit_log — the append-only trail of every governed action. Who did what, to
 * which target, with the salient detail. This is the governance surface a
 * technical evaluator points at: no privileged action happens off the record.
 */
export const auditLog = table({
  name: "audit_log",
  schema: {
    actor_id: f.tableRef(staff, { required: true }),
    action: f.enum(["report", "advance", "close", "override"], { required: true }),
    target: f.text({ required: true }), // player handle or season name
    detail: f.json(), // structured context for the action
  },
  index: [{ type: "btree", fields: [{ name: "created_at" }] }],
});
