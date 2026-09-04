import { table, f } from "@xanots/sdk";

/**
 * staff — the auth table. The operators who call the ranked service.
 *
 * Access is API-layer RBAC: a `reporter` may report match results; an `admin`
 * may also run season lifecycle moves and corrective overrides. The role is read
 * from this row on every governed call, so it is the authority, not a client claim.
 */
export const staff = table({
  name: "staff",
  auth: true, // backs authentication (create_auth_token / auth: staff on protected queries)
  schema: {
    email: f.email({ required: true, methods: ["lower", "trim"] }),
    // Plaintext on write; the column hashes it. Reads never return it (access: internal).
    password: f.password({ required: true }),
    name: f.text({ required: true }),
    role: f.enum(["reporter", "admin"], { required: true }),
  },
  index: [{ type: "unique", fields: [{ name: "email" }] }],
});
