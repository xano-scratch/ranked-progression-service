import { table, f } from "@xanots/sdk";
import { players } from "./players.js";
import { seasons } from "./seasons.js";
import { staff } from "./staff.js";

/**
 * match_results — one immutable row per reported match. The rating_before /
 * rating_after pair records what the rating engine computed at report time, so a
 * result is auditable without replaying the ledger.
 */
export const matchResults = table({
  name: "match_results",
  schema: {
    season_id: f.tableRef(seasons, { required: true }),
    player_id: f.tableRef(players, { required: true }),
    outcome: f.enum(["win", "loss", "draw"], { required: true }),
    opponent_rating: f.int({ required: true }),
    rating_before: f.int({ required: true }),
    rating_after: f.int({ required: true }),
    reported_by: f.tableRef(staff, { required: true }),
  },
  index: [{ type: "btree", fields: [{ name: "season_id" }, { name: "player_id" }] }],
});
