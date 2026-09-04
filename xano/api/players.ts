import { query, input, s, inp, ref, col, expr } from "@xanots/sdk";
import { ranked } from "./ranked.js";
import { rankedStates } from "../tables/ranked-states.js";
import { players } from "../tables/players.js";

/**
 * GET /api:ranked/players?season_id= — the roster for one season: every player's
 * current ranked_state (phase, tier, division, rating), joined to the player's
 * handle and display name. Sorted by rating so the ladder reads top-down. Public.
 */
export const playersQuery = query({
  name: "players",
  verb: "GET",
  apiGroup: ranked,
  input: { season_id: input.int({ required: true }) },
  stack: [
    s.db.query({
      table: rankedStates,
      where: expr(col("season_id"), "=", inp("season_id")),
      bind: [
        {
          table: players,
          as: "player_row",
          join: "left",
          where: expr(col("player_id"), "=", col("player_row.id")),
        },
      ],
      // Project the joined player columns onto each row (a bind alone does not add them).
      eval: [
        { name: "player_row.handle", as: "handle" },
        { name: "player_row.display_name", as: "display_name" },
      ],
      sort: [{ sortBy: "rating", dir: "desc" }],
      as: "rows",
    }),
  ],
  response: ref("rows"),
});
