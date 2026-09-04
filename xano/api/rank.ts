import { query, input, s, inp, ref, col, expr, c } from "@xanots/sdk";
import { ranked } from "./ranked.js";
import { rankedStates } from "../tables/ranked-states.js";
import { ratingHistory } from "../tables/rating-history.js";
import { matchResults } from "../tables/match-results.js";
import { players } from "../tables/players.js";

/**
 * GET /api:ranked/rank/{player_id}?season_id= — one player's standing for a season
 * plus their append-only rating history and match results. Feeds the player detail
 * screen. player_id is a path segment (it names which player); season_id narrows
 * the ledger. Public read.
 */
export const rankQuery = query({
  name: "rank/{player_id}",
  verb: "GET",
  apiGroup: ranked,
  input: {
    player_id: input.int({ required: true }),
    season_id: input.int({ required: true }),
  },
  stack: [
    s.db.get_by_id({ table: players, id: inp("player_id"), as: "player" }),
    s.precondition({
      expr: expr(ref("player", { safe: true }), "!=", c.null()),
      error_type: "notfound",
      error: c.text("No such player."),
    }),
    s.db.query({
      table: rankedStates,
      where: [expr(col("player_id"), "=", inp("player_id")), expr(col("season_id"), "=", inp("season_id"))],
      returnType: "single",
      as: "state",
    }),
    s.db.query({
      table: ratingHistory,
      where: [expr(col("player_id"), "=", inp("player_id")), expr(col("season_id"), "=", inp("season_id"))],
      sort: [{ sortBy: "created_at", dir: "desc" }],
      as: "history",
    }),
    s.db.query({
      table: matchResults,
      where: [expr(col("player_id"), "=", inp("player_id")), expr(col("season_id"), "=", inp("season_id"))],
      sort: [{ sortBy: "created_at", dir: "desc" }],
      as: "matches",
    }),
  ],
  response: {
    player: ref("player"),
    state: ref("state"),
    history: ref("history"),
    matches: ref("matches"),
  },
});
