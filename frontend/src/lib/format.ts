// Presentation helpers shared across the screens. Tier hues are categorical data
// color (a ladder needs distinct ranks); the rest of the UI uses semantic tokens.

export const TIERS = ["Bronze", "Silver", "Gold", "Platinum", "Diamond"] as const;

export const PHASE_LABEL: Record<string, string> = {
  placement: "Placement",
  ranked: "Ranked",
  promotion_series: "Promotion series",
  promoted: "Promoted",
  demoted: "Demoted",
  closed: "Closed",
};

export const REASON_LABEL: Record<string, string> = {
  match: "Match",
  placement: "Placement",
  promotion: "Promotion",
  demotion: "Demotion",
  override: "Override",
};

export function tierClasses(tier: string): string {
  switch (tier) {
    case "Bronze":
      return "border-amber-800/50 bg-amber-950/40 text-amber-300";
    case "Silver":
      return "border-slate-500/50 bg-slate-700/40 text-slate-200";
    case "Gold":
      return "border-yellow-700/50 bg-yellow-950/40 text-yellow-300";
    case "Platinum":
      return "border-cyan-700/50 bg-cyan-950/40 text-cyan-300";
    case "Diamond":
      return "border-indigo-600/50 bg-indigo-950/40 text-indigo-300";
    default:
      return "border-border bg-muted text-muted-foreground";
  }
}

export function phaseClasses(phase: string): string {
  switch (phase) {
    case "promoted":
      return "border-emerald-700/50 bg-emerald-950/40 text-emerald-300";
    case "demoted":
      return "border-red-800/50 bg-red-950/40 text-red-300";
    case "promotion_series":
      return "border-violet-700/50 bg-violet-950/40 text-violet-300";
    case "placement":
      return "border-sky-800/50 bg-sky-950/40 text-sky-300";
    case "closed":
      return "border-border bg-muted text-muted-foreground";
    default:
      return "border-border bg-secondary text-secondary-foreground";
  }
}

const ROMAN = ["", "I", "II", "III", "IV"];
export function divisionRoman(division: number): string {
  return ROMAN[division] ?? String(division);
}

export function rankLabel(tier: string, division: number): string {
  return `${tier} ${divisionRoman(division)}`;
}

export function formatDelta(delta: number): string {
  return delta > 0 ? `+${delta}` : String(delta);
}

export function formatTime(epochMs: number | null | undefined): string {
  if (!epochMs) return "—";
  try {
    return new Date(Number(epochMs)).toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "—";
  }
}
