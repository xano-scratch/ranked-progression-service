import { table, f } from "@xanots/sdk";

/**
 * players — the domain subjects. One row per competitor. Their ranked standing
 * per season lives in ranked_states, not here.
 */
export const players = table({
  name: "players",
  schema: {
    handle: f.text({ required: true, methods: ["trim"] }),
    display_name: f.text({ required: true }),
  },
  index: [{ type: "unique", fields: [{ name: "handle" }] }],
});
