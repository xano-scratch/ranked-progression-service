import { apiGroup } from "@xanots/sdk";

/**
 * The one API group for the ranked service. The canonical slug is PINNED so the
 * public paths stay stable and getPath() resolves in the browser bundle without
 * waiting on a lock. Everything the studio backend enforces lives under this one
 * readable surface: /api:ranked/...
 */
export const ranked = apiGroup({ name: "ranked", canonical: "ranked" });
