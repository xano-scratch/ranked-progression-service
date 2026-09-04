import { query, input, s, inp, ref, expr, c, obj } from "@xanots/sdk";
import { ranked } from "./ranked.js";
import { staff } from "../tables/staff.js";

/**
 * POST /api:ranked/login — verify a staff credential and mint an auth token.
 *
 * The token carries the caller's role as an extra, and the response returns it so
 * the frontend can show a reporter-vs-admin view. The role guard on the protected
 * endpoints still reads the staff row itself, so the token extra is a convenience,
 * not the authority.
 */
export const loginQuery = query({
  name: "login",
  verb: "POST",
  apiGroup: ranked,
  // Take the password as text on login: an f.password column already hashes on
  // write, and input.password would hash again, so check_password would compare
  // two different hashes and always fail.
  input: {
    email: input.email({ required: true, methods: ["lower", "trim"] }),
    password: input.text({ required: true }),
  },
  stack: [
    // output names `password` explicitly: the column is access:internal and is
    // absent from the row otherwise.
    s.db.get({
      table: staff,
      fieldName: "email",
      fieldValue: inp("email"),
      output: ["id", "email", "name", "role", "password"],
      as: "u",
    }),
    s.precondition({
      expr: expr(ref("u", { safe: true }), "!=", c.null()),
      error_type: "unauthorized",
      error: c.text("Wrong email or password."),
    }),
    s.security.check_password({
      text_password: inp("password"),
      hash_password: ref("u.password"),
      as: "ok",
    }),
    s.precondition({
      expr: expr(ref("ok"), "=", c.bool(true)),
      error_type: "unauthorized",
      error: c.text("Wrong email or password."),
    }),
    s.security.create_auth_token({
      table: staff,
      id: ref("u.id"),
      extras: obj({ role: ref("u.role") }),
      as: "token",
    }),
  ],
  response: { token: ref("token"), role: ref("u.role"), name: ref("u.name") },
});
