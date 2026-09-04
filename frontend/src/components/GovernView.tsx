import { useEffect, useState } from "react";
import { AlertTriangle, CheckCircle2, ShieldAlert } from "lucide-react";
import { api, ApiError, type RosterRow, type Season } from "@/lib/api";
import { PHASE_LABEL, divisionRoman, formatDelta } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type Banner = { kind: "ok" | "err"; title: string; message: string } | null;

const OUTCOMES = ["win", "loss", "draw"] as const;
const PHASES = [
  "placement",
  "ranked",
  "promotion_series",
  "promoted",
  "demoted",
  "closed",
] as const;

function ResultBanner({ banner }: { banner: Banner }) {
  if (!banner) return null;
  const ok = banner.kind === "ok";
  return (
    <Alert variant={ok ? "default" : "destructive"} className="mt-3">
      {ok ? <CheckCircle2 className="size-4" /> : <AlertTriangle className="size-4" />}
      <AlertTitle>{banner.title}</AlertTitle>
      <AlertDescription>{banner.message}</AlertDescription>
    </Alert>
  );
}

export function GovernView({
  season,
  role,
  bump,
  onChanged,
}: {
  season: Season;
  role: string | null;
  bump: number;
  onChanged: () => void;
}) {
  const seasonId = Number(season.id);
  const [roster, setRoster] = useState<RosterRow[]>([]);

  // report form
  const [reportPlayer, setReportPlayer] = useState<string>("");
  const [outcome, setOutcome] = useState<(typeof OUTCOMES)[number]>("win");
  const [opponent, setOpponent] = useState<string>("1200");
  const [reportBanner, setReportBanner] = useState<Banner>(null);
  const [reporting, setReporting] = useState(false);

  // override form
  const [ovrPlayer, setOvrPlayer] = useState<string>("");
  const [ovrRating, setOvrRating] = useState<string>("");
  const [ovrPhase, setOvrPhase] = useState<string>("");
  const [ovrBanner, setOvrBanner] = useState<Banner>(null);

  const [seasonBanner, setSeasonBanner] = useState<Banner>(null);

  useEffect(() => {
    let alive = true;
    api
      .players(seasonId)
      .then((r) => {
        if (!alive) return;
        setRoster(r);
        if (r.length) {
          setReportPlayer((p) => p || String(r[0].player_id));
          setOvrPlayer((p) => p || String(r[0].player_id));
        }
      })
      .catch(() => alive && setRoster([]));
    return () => {
      alive = false;
    };
  }, [seasonId, bump]);

  function describeError(err: unknown): Banner {
    if (err instanceof ApiError) {
      const title =
        err.status === 403
          ? "Refused (403) — admin only"
          : err.status === 401
            ? "Refused (401) — sign in first"
            : `Refused (${err.status})`;
      return { kind: "err", title, message: err.message };
    }
    return { kind: "err", title: "Request failed", message: String(err) };
  }

  async function submitReport() {
    setReporting(true);
    setReportBanner(null);
    try {
      const res = await api.report({
        player_id: Number(reportPlayer),
        season_id: seasonId,
        outcome,
        opponent_rating: Number(opponent) || 1200,
      });
      const st = res.state as { tier: string; division: number; rating: number; phase: string };
      const delta = (res.history as { delta: number }).delta;
      setReportBanner({
        kind: "ok",
        title: `Reported: ${outcome}`,
        message: `Rating ${formatDelta(delta)} → ${st.rating}. Now ${PHASE_LABEL[st.phase] ?? st.phase} · ${st.tier} ${divisionRoman(st.division)}.`,
      });
      onChanged();
    } catch (err) {
      setReportBanner(describeError(err));
    } finally {
      setReporting(false);
    }
  }

  async function runSeason(action: "advance" | "close") {
    setSeasonBanner(null);
    try {
      if (action === "advance") await api.advance(seasonId);
      else await api.close(seasonId);
      setSeasonBanner({
        kind: "ok",
        title: action === "advance" ? "Season advanced" : "Season closed",
        message: `${season.name} is now ${action === "advance" ? "active" : "closed"}.`,
      });
      onChanged();
    } catch (err) {
      setSeasonBanner(describeError(err));
    }
  }

  async function submitOverride() {
    setOvrBanner(null);
    try {
      const res = await api.override({
        player_id: Number(ovrPlayer),
        season_id: seasonId,
        rating: Number(ovrRating) || 0,
        ...(ovrPhase ? { phase: ovrPhase as (typeof PHASES)[number] } : {}),
      });
      const st = res.state as { tier: string; division: number; rating: number; phase: string };
      setOvrBanner({
        kind: "ok",
        title: "Override applied",
        message: `Set to ${st.rating}, ${PHASE_LABEL[st.phase] ?? st.phase} · ${st.tier} ${divisionRoman(st.division)}. Written to the ledger and audit trail.`,
      });
      onChanged();
    } catch (err) {
      setOvrBanner(describeError(err));
    }
  }

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {/* Report a match — any signed-in staff */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Report a match</CardTitle>
          <CardDescription>
            The engine recomputes rating within bounds and drives the phase transition. A terminal
            phase or a non-active season is refused at the API layer.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-1.5">
            <Label>Player</Label>
            <Select value={reportPlayer} onValueChange={setReportPlayer}>
              <SelectTrigger>
                <SelectValue placeholder="Pick a player" />
              </SelectTrigger>
              <SelectContent>
                {roster.map((r) => (
                  <SelectItem key={r.id} value={String(r.player_id)}>
                    {String(r.display_name)} · {r.tier} {divisionRoman(r.division)} ·{" "}
                    {PHASE_LABEL[r.phase] ?? r.phase}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-[1fr_auto] gap-3">
            <div className="space-y-1.5">
              <Label>Outcome</Label>
              <div className="flex gap-1.5">
                {OUTCOMES.map((o) => (
                  <Button
                    key={o}
                    type="button"
                    size="sm"
                    variant={outcome === o ? "default" : "outline"}
                    className="flex-1 capitalize"
                    onClick={() => setOutcome(o)}
                  >
                    {o}
                  </Button>
                ))}
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="opp">Opponent</Label>
              <Input
                id="opp"
                type="number"
                value={opponent}
                onChange={(e) => setOpponent(e.target.value)}
                className="w-24"
              />
            </div>
          </div>

          <Button onClick={() => void submitReport()} disabled={reporting || !reportPlayer}>
            Report result
          </Button>
          <ResultBanner banner={reportBanner} />
        </CardContent>
      </Card>

      {/* Admin: season lifecycle + override */}
      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              Season control
              <Badge variant="outline" className="gap-1 text-xs">
                <ShieldAlert className="size-3" /> admin
              </Badge>
            </CardTitle>
            <CardDescription>
              {season.name} is <span className="font-medium">{String(season.status)}</span>. An
              illegal lifecycle move is refused; a reporter token gets a 403.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => void runSeason("advance")}
                disabled={String(season.status) !== "upcoming"}
              >
                Advance to active
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => void runSeason("close")}
                disabled={String(season.status) !== "active"}
              >
                Close season
              </Button>
            </div>
            {role !== "admin" && (
              <p className="text-muted-foreground text-xs">
                Signed in as {role ?? "nobody"}. Try it anyway to see the API refuse.
              </p>
            )}
            <ResultBanner banner={seasonBanner} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              Override
              <Badge variant="outline" className="gap-1 text-xs">
                <ShieldAlert className="size-3" /> admin
              </Badge>
            </CardTitle>
            <CardDescription>
              The one sanctioned bypass. Tier and division are re-derived, and the ledger records
              the change.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Player</Label>
                <Select value={ovrPlayer} onValueChange={setOvrPlayer}>
                  <SelectTrigger>
                    <SelectValue placeholder="Pick a player" />
                  </SelectTrigger>
                  <SelectContent>
                    {roster.map((r) => (
                      <SelectItem key={r.id} value={String(r.player_id)}>
                        {String(r.display_name)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ovr-rating">New rating</Label>
                <Input
                  id="ovr-rating"
                  type="number"
                  placeholder="e.g. 1500"
                  value={ovrRating}
                  onChange={(e) => setOvrRating(e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Phase (optional)</Label>
              <Select value={ovrPhase} onValueChange={setOvrPhase}>
                <SelectTrigger>
                  <SelectValue placeholder="Keep current phase" />
                </SelectTrigger>
                <SelectContent>
                  {PHASES.map((p) => (
                    <SelectItem key={p} value={p}>
                      {PHASE_LABEL[p]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button
              variant="outline"
              onClick={() => void submitOverride()}
              disabled={!ovrPlayer || !ovrRating}
            >
              Apply override
            </Button>
            <ResultBanner banner={ovrBanner} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
