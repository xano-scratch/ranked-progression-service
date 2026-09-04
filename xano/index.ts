import { workspace } from "@xanots/sdk";

// Tables
import { staff } from "./tables/staff.js";
import { players } from "./tables/players.js";
import { seasons } from "./tables/seasons.js";
import { rankedStates } from "./tables/ranked-states.js";
import { matchResults } from "./tables/match-results.js";
import { ratingHistory } from "./tables/rating-history.js";
import { auditLog } from "./tables/audit-log.js";

// API group
import { ranked } from "./api/ranked.js";

// Endpoints
import { seedQuery } from "./api/seed.js";
import { loginQuery } from "./api/login.js";
import { reportQuery } from "./api/report.js";
import { advanceQuery } from "./api/advance.js";
import { closeQuery } from "./api/close.js";
import { overrideQuery } from "./api/override.js";
import { playersQuery } from "./api/players.js";
import { rankQuery } from "./api/rank.js";
import { seasonsQuery } from "./api/seasons.js";
import { auditQuery } from "./api/audit.js";

/**
 * ranked-progression-service — a governed ranked-play backend.
 *
 * One readable API layer owns the ranking rules a studio would otherwise scatter
 * across game servers and scripts: the progression state machine, the rating math
 * and its bounds, and the admin-only authority over overrides and the season
 * lifecycle. Every governed action lands in an append-only audit trail.
 */
export default workspace("ranked-progression-service")
  .registerTables([staff, players, seasons, rankedStates, matchResults, ratingHistory, auditLog])
  .registerApiGroups([ranked])
  .registerQueries([
    seedQuery,
    loginQuery,
    reportQuery,
    advanceQuery,
    closeQuery,
    overrideQuery,
    playersQuery,
    rankQuery,
    seasonsQuery,
    auditQuery,
  ]);
