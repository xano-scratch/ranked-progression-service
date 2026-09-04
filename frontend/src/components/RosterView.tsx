import { useEffect, useState } from "react";
import { api, type RosterRow } from "@/lib/api";
import { PHASE_LABEL, divisionRoman, phaseClasses, tierClasses } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PlayerDetail } from "./PlayerDetail";

function progressText(row: RosterRow): string {
  if (row.phase === "placement") return `${row.placement_games_remaining} placement left`;
  if (row.phase === "promotion_series")
    return `series ${row.series_wins}/${row.series_target}`;
  return "—";
}

export function RosterView({ seasonId, bump }: { seasonId: number; bump: number }) {
  const [rows, setRows] = useState<RosterRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<number | null>(null);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError(null);
    api
      .players(seasonId)
      .then((r) => {
        if (!alive) return;
        setRows(r);
        setSelected((prev) =>
          prev && r.some((x) => Number(x.player_id) === prev)
            ? prev
            : r.length
              ? Number(r[0].player_id)
              : null,
        );
      })
      .catch((e) => alive && setError(e instanceof Error ? e.message : String(e)))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [seasonId, bump]);

  return (
    <div className="grid gap-4 lg:grid-cols-[1.35fr_1fr]">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Roster</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-muted-foreground text-sm">Loading roster…</p>
          ) : error ? (
            <p className="text-destructive text-sm">{error}</p>
          ) : rows.length === 0 ? (
            <p className="text-muted-foreground text-sm">No players in this season yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-8">#</TableHead>
                  <TableHead>Player</TableHead>
                  <TableHead>Phase</TableHead>
                  <TableHead>Rank</TableHead>
                  <TableHead className="text-right">Rating</TableHead>
                  <TableHead className="text-right">Progress</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row, i) => {
                  const pid = Number(row.player_id);
                  const active = pid === selected;
                  return (
                    <TableRow
                      key={row.id}
                      onClick={() => setSelected(pid)}
                      className={`cursor-pointer ${active ? "bg-accent/60" : ""}`}
                    >
                      <TableCell className="text-muted-foreground tabular-nums">{i + 1}</TableCell>
                      <TableCell>
                        <div className="font-medium">{String(row.display_name)}</div>
                        <div className="text-muted-foreground font-mono text-xs">
                          @{String(row.handle)}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={phaseClasses(row.phase)}>
                          {PHASE_LABEL[row.phase] ?? row.phase}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={tierClasses(row.tier)}>
                          {row.tier} {divisionRoman(row.division)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-semibold tabular-nums">
                        {row.rating}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-right text-xs">
                        {progressText(row)}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Player detail</CardTitle>
        </CardHeader>
        <CardContent>
          {selected == null ? (
            <p className="text-muted-foreground text-sm">Select a player to see their standing.</p>
          ) : (
            <PlayerDetail playerId={selected} seasonId={seasonId} bump={bump} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
