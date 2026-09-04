import { table, f } from "@xanots/sdk";
import { players } from "./players.js";
import { seasons } from "./seasons.js";

/**
 * rating_history — the append-only rating ledger. Every rating change writes one
 * row with the reason it happened, so a player's climb reads as a governed audit
 * trail rather than a single mutable number.
 */
export const ratingHistory = table({
  name: "rating_history",
  schema: {
    player_id: f.tableRef(players, { required: true }),
    season_id: f.tableRef(seasons, { required: true }),
    rating_before: f.int({ required: true }),
    rating_after: f.int({ required: true }),
    delta: f.int({ required: true }),
    reason: f.enum(["match", "placement", "promotion", "demotion", "override"], {
      required: true,
    }),
  },
  index: [{ type: "btree", fields: [{ name: "player_id" }, { name: "season_id" }] }],
});
