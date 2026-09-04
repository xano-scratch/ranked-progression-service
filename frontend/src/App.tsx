import { useEffect, useState } from "react";
import { Gauge, ListOrdered, RefreshCw, ScrollText, Trophy } from "lucide-react";
import { api, setToken, type Season } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { LoginBar } from "@/components/LoginBar";
import { RosterView } from "@/components/RosterView";
import { GovernView } from "@/components/GovernView";
import { AuditView } from "@/components/AuditView";

type View = "roster" | "govern" | "audit";

const NAV: { key: View; label: string; icon: typeof Gauge }[] = [
  { key: "roster", label: "Roster", icon: ListOrdered },
  { key: "govern", label: "Report & govern", icon: Gauge },
  { key: "audit", label: "Audit trail", icon: ScrollText },
];

export default function App() {
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [seasonId, setSeasonId] = useState<number | null>(null);
  const [view, setView] = useState<View>("roster");
  const [role, setRole] = useState<string | null>(null);
  const [staffName, setStaffName] = useState<string | null>(null);
  const [bump, setBump] = useState(0);
  const [booting, setBooting] = useState(true);
  const [bootError, setBootError] = useState<string | null>(null);

  function pickDefaultSeason(list: Season[]): number | null {
    const active = list.find((s) => String(s.status) === "active") ?? list[0];
    return active ? Number(active.id) : null;
  }

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        let list = await api.seasons();
        if (list.length === 0) {
          // Auto-seed so a fresh ephemeral is browsable, not an empty shell.
          await api.seed();
          list = await api.seasons();
        }
        if (!alive) return;
        setSeasons(list);
        setSeasonId((prev) => prev ?? pickDefaultSeason(list));
      } catch (e) {
        if (alive) setBootError(e instanceof Error ? e.message : String(e));
      } finally {
        if (alive) setBooting(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  async function reloadSeasons() {
    const list = await api.seasons();
    setSeasons(list);
    setSeasonId((prev) => (prev && list.some((s) => Number(s.id) === prev) ? prev : pickDefaultSeason(list)));
  }

  async function handleLogin(email: string, password: string) {
    const res = await api.login({ email, password });
    setToken(String((res as { token: string }).token));
    setRole(String((res as { role: string }).role));
    setStaffName(String((res as { name: string }).name));
    setBump((b) => b + 1);
  }

  function handleLogout() {
    setToken(null);
    setRole(null);
    setStaffName(null);
    setBump((b) => b + 1);
  }

  async function resetDemo() {
    await api.seed();
    // seed truncates staff, so any live session is now stale — sign out.
    handleLogout();
    await reloadSeasons();
    setBump((b) => b + 1);
  }

  function onChanged() {
    void reloadSeasons();
    setBump((b) => b + 1);
  }

  const season = seasons.find((s) => Number(s.id) === seasonId) ?? null;

  return (
    <div className="bg-background text-foreground min-h-screen">
      <header className="border-border/60 bg-card/40 border-b backdrop-blur">
        <div className="mx-auto max-w-6xl px-6 py-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="bg-primary/10 text-primary flex size-9 items-center justify-center rounded-lg">
                <Trophy className="size-5" />
              </div>
              <div>
                <h1 className="text-lg font-semibold tracking-tight">Ranked Progression Service</h1>
                <p className="text-muted-foreground text-xs">
                  One governed API layer for ranked play: rules, bounds, and authority in one place.
                </p>
              </div>
            </div>
            <LoginBar
              role={role}
              staffName={staffName}
              onLogin={handleLogin}
              onLogout={handleLogout}
            />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-6">
        {booting ? (
          <p className="text-muted-foreground py-20 text-center text-sm">Loading the arena…</p>
        ) : bootError ? (
          <div className="py-20 text-center">
            <p className="text-destructive text-sm">{bootError}</p>
            <p className="text-muted-foreground mt-2 text-xs">
              Is the backend reachable? (VITE_XANO_HOST in dev, or the injected host on the deploy.)
            </p>
          </div>
        ) : (
          <>
            <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
              <nav className="flex gap-1.5">
                {NAV.map((n) => (
                  <Button
                    key={n.key}
                    variant={view === n.key ? "default" : "ghost"}
                    size="sm"
                    onClick={() => setView(n.key)}
                  >
                    <n.icon className="size-4" /> {n.label}
                  </Button>
                ))}
              </nav>
              <div className="flex items-center gap-2">
                <Select
                  value={seasonId != null ? String(seasonId) : ""}
                  onValueChange={(v) => setSeasonId(Number(v))}
                >
                  <SelectTrigger className="w-[200px]">
                    <SelectValue placeholder="Season" />
                  </SelectTrigger>
                  <SelectContent>
                    {seasons.map((s) => (
                      <SelectItem key={s.id} value={String(s.id)}>
                        {s.name}
                        <Badge variant="outline" className="ml-2 text-[10px]">
                          {String(s.status)}
                        </Badge>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button variant="outline" size="sm" onClick={() => void resetDemo()}>
                  <RefreshCw className="size-4" /> Reset demo
                </Button>
              </div>
            </div>

            {season == null ? (
              <p className="text-muted-foreground py-20 text-center text-sm">
                No season selected.
              </p>
            ) : view === "roster" ? (
              <RosterView seasonId={Number(season.id)} bump={bump} />
            ) : view === "govern" ? (
              <GovernView season={season} role={role} bump={bump} onChanged={onChanged} />
            ) : (
              <AuditView role={role} bump={bump} />
            )}
          </>
        )}
      </main>

      <footer className="border-border/60 mt-8 border-t">
        <div className="text-muted-foreground mx-auto max-w-6xl px-6 py-4 text-xs">
          Backend authored in TypeScript with the XanoTS SDK. Auth is API-layer RBAC (no row-level
          security). Seed data resets on demand.
        </div>
      </footer>
    </div>
  );
}
