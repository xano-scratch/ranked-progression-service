import { s, auth, ref, expr, c, statements } from "@xanots/sdk";
import { staff } from "../tables/staff.js";

/**
 * Governance guards, authored as explicit statements so the RBAC rule is visible
 * in the stack a reviewer reads (not buried in config). Returned via statements()
 * so the stack keeps its tuple type and InferResponse still resolves downstream.
 *
 * The role is read from the staff row on every call, so it is the server's
 * authority. A client cannot claim admin by editing a token payload.
 */
export function requireAdmin() {
  return statements(
    // auth: staff already refused a request with no valid token, so `me` is the caller.
    s.db.get_by_id({ table: staff, id: auth("id"), as: "me" }),
    s.precondition({
      expr: expr(ref("me.role"), "=", c.text("admin")),
      error_type: "accessdenied",
      error: c.text("This action is restricted to admins."),
    }),
  );
}
