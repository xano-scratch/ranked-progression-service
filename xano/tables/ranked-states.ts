import { table, f } from "@xanots/sdk";
import { players } from "./players.js";
import { seasons } from "./seasons.js";

/**
 * ranked_states — the live state machine, one row per (player, season).
 *
 * phase is the enforced progression:
 *   placement -> ranked -> promotion_series -> promoted   (a climb that succeeds)
 *                       \-> demoted                        (a bottom-boundary loss)
 *   any active phase -> closed                             (the season ends)
 * promoted / demoted / closed are terminal: report() refuses a result on them.
 */
export const rankedStates = table({
  name: "ranked_states",
  schema: {
    player_id: f.tableRef(players, { required: true }),
    season_id: f.tableRef(seasons, { required: true }),
    phase: f.enum(
      ["placement", "ranked", "promotion_series", "promoted", "demoted", "closed"],
      { required: true },
    ),
    tier: f.enum(["Bronze", "Silver", "Gold", "Platinum", "Diamond"], { required: true }),
    division: f.int({ required: true }), // 4 (entry) .. 1 (top of tier)
    rating: f.int({ required: true }),
    placement_games_remaining: f.int({ required: true, default: 0 }),
    series_wins: f.int({ required: true, default: 0 }),
    series_losses: f.int({ required: true, default: 0 }),
    series_target: f.int({ required: true, default: 3 }),
  },
  index: [{ type: "btree", fields: [{ name: "season_id" }, { name: "player_id" }] }],
});
