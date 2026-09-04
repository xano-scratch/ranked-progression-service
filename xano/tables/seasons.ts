import { table, f } from "@xanots/sdk";

/**
 * seasons — a competitive season with a governed lifecycle:
 *   upcoming -> active -> closed
 * advance() and close() are the only sanctioned moves; each refuses an illegal
 * transition at the API layer.
 */
export const seasons = table({
  name: "seasons",
  schema: {
    name: f.text({ required: true }),
    status: f.enum(["upcoming", "active", "closed"], { required: true }),
    started_at: f.timestamp({ nullable: true }),
    ended_at: f.timestamp({ nullable: true }),
  },
});
