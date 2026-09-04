import { useEffect, useState } from "react";
import { History, Swords } from "lucide-react";
import { api, type RankResponse } from "@/lib/api";
import {
  PHASE_LABEL,
  REASON_LABEL,
  divisionRoman,
  formatDelta,
  formatTime,
  phaseClasses,
  tierClasses,
} from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export function PlayerDetail({
  playerId,
  seasonId,
  bump,
}: {
  playerId: number;
  seasonId: number;
  bump: number;
}) {
  const [data, setData] = useState<RankResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError(null);
    api
      .rank(playerId, seasonId)
      .then((d) => alive && setData(d))
      .catch((e) => alive && setError(e instanceof Error ? e.message : String(e)))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [playerId, seasonId, bump]);

  if (loading) return <p className="text-muted-foreground p-6 text-sm">Loading…</p>;
  if (error) return <p className="text-destructive p-6 text-sm">{error}</p>;
  if (!data) return null;

  const player = data.player as { handle?: string; display_name?: string } | null;
  const state = data.state as
    | {
        phase: string;
        tier: string;
        division: number;
        rating: number;
        placement_games_remaining: number;
        series_wins: number;
        series_losses: number;
        series_target: number;
      }
    | null;

  if (!state) {
    return (
      <p className="text-muted-foreground p-6 text-sm">
        {player?.display_name ?? "This player"} is not in the selected season.
      </p>
    );
  }

  return (
    <div className="space-y-5 p-1">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-xl font-semibold tracking-tight">{player?.display_name}</h3>
          <p className="text-muted-foreground font-mono text-sm">@{player?.handle}</p>
        </div>
        <div className="text-right">
          <div className="text-2xl font-bold tabular-nums">{state.rating}</div>
          <div className="text-muted-foreground text-xs">rating</div>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="outline" className={phaseClasses(state.phase)}>
          {PHASE_LABEL[state.phase] ?? state.phase}
        </Badge>
        <Badge variant="outline" className={tierClasses(state.tier)}>
          {state.tier} {divisionRoman(state.division)}
        </Badge>
      </div>

      {state.phase === "placement" && (
        <div className="border-border/60 bg-muted/30 rounded-lg border p-3 text-sm">
          <span className="text-muted-foreground">Placement: </span>
          <span className="font-medium">{state.placement_games_remaining}</span> game
          {state.placement_games_remaining === 1 ? "" : "s"} until the rank is set.
        </div>
      )}
      {state.phase === "promotion_series" && (
        <div className="border-violet-800/40 bg-violet-950/20 rounded-lg border p-3 text-sm">
          <span className="text-muted-foreground">Promotion series: </span>
          <span className="font-medium text-emerald-300">{state.series_wins} W</span>
          {" · "}
          <span className="font-medium text-red-300">{state.series_losses} L</span>
          {" · first to "}
          {state.series_target} wins.
        </div>
      )}

      <Separator />

      <section>
        <div className="mb-2 flex items-center gap-2 text-sm font-medium">
          <History className="size-4" /> Rating history
          <span className="text-muted-foreground font-normal">(append-only)</span>
        </div>
        {data.history.length === 0 ? (
          <p className="text-muted-foreground text-sm">No changes recorded yet.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Reason</TableHead>
                <TableHead>Change</TableHead>
                <TableHead className="text-right">Δ</TableHead>
                <TableHead className="text-right">When</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.history.map((h) => (
                <TableRow key={h.id}>
                  <TableCell>{REASON_LABEL[h.reason] ?? h.reason}</TableCell>
                  <TableCell className="tabular-nums">
                    {h.rating_before} → {h.rating_after}
                  </TableCell>
                  <TableCell
                    className={`text-right tabular-nums ${h.delta >= 0 ? "text-emerald-400" : "text-red-400"}`}
                  >
                    {formatDelta(h.delta)}
                  </TableCell>
                  <TableCell className="text-muted-foreground text-right text-xs">
                    {formatTime(h.created_at)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </section>

      <section>
        <div className="mb-2 flex items-center gap-2 text-sm font-medium">
          <Swords className="size-4" /> Match results
        </div>
        {data.matches.length === 0 ? (
          <p className="text-muted-foreground text-sm">No matches reported yet.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Outcome</TableHead>
                <TableHead className="text-right">Opponent</TableHead>
                <TableHead className="text-right">Rating</TableHead>
                <TableHead className="text-right">When</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.matches.map((m) => (
                <TableRow key={m.id}>
                  <TableCell className="capitalize">{m.outcome}</TableCell>
                  <TableCell className="text-right tabular-nums">{m.opponent_rating}</TableCell>
                  <TableCell className="text-right tabular-nums">
                    {m.rating_before} → {m.rating_after}
                  </TableCell>
                  <TableCell className="text-muted-foreground text-right text-xs">
                    {formatTime(m.created_at)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </section>
    </div>
  );
}
