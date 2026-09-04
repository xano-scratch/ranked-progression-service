import { query, s, ref } from "@xanots/sdk";
import { ranked } from "./ranked.js";
import { seasons } from "../tables/seasons.js";

/**
 * GET /api:ranked/seasons — every season with its status and dates. Feeds the
 * season selector. Public read.
 */
export const seasonsQuery = query({
  name: "seasons",
  verb: "GET",
  apiGroup: ranked,
  stack: [s.db.query({ table: seasons, sort: [{ sortBy: "created_at", dir: "asc" }], as: "rows" })],
  response: ref("rows"),
});
