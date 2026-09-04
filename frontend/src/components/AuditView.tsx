import { useEffect, useState } from "react";
import { ScrollText } from "lucide-react";
import { api, ApiError, type AuditRow } from "@/lib/api";
import { formatTime } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const ACTION_TONE: Record<string, string> = {
  report: "border-sky-800/50 bg-sky-950/40 text-sky-300",
  advance: "border-emerald-800/50 bg-emerald-950/40 text-emerald-300",
  close: "border-border bg-muted text-muted-foreground",
  override: "border-amber-800/50 bg-amber-950/40 text-amber-300",
};

export function AuditView({ role, bump }: { role: string | null; bump: number }) {
  const [rows, setRows] = useState<AuditRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError(null);
    api
      .audit()
      .then((r) => alive && setRows(r))
      .catch((e) => {
        if (!alive) return;
        if (e instanceof ApiError && (e.status === 403 || e.status === 401)) {
          setError("The audit trail is admin only. Sign in as admin to read it.");
        } else {
          setError(e instanceof Error ? e.message : String(e));
        }
      })
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [role, bump]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <ScrollText className="size-4" /> Audit trail
        </CardTitle>
        <CardDescription>
          Every governed action, newest first. Append-only: no privileged move happens off the
          record.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <p className="text-muted-foreground text-sm">Loading…</p>
        ) : error ? (
          <p className="text-muted-foreground text-sm">{error}</p>
        ) : rows.length === 0 ? (
          <p className="text-muted-foreground text-sm">No actions recorded yet.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Action</TableHead>
                <TableHead>Actor</TableHead>
                <TableHead>Target</TableHead>
                <TableHead>Detail</TableHead>
                <TableHead className="text-right">When</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r) => (
                <TableRow key={r.id}>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={ACTION_TONE[r.action] ?? "border-border bg-muted"}
                    >
                      {r.action}
                    </Badge>
                  </TableCell>
                  <TableCell>{String(r.actor_name ?? "—")}</TableCell>
                  <TableCell className="font-mono text-xs">{r.target}</TableCell>
                  <TableCell className="text-muted-foreground max-w-[22ch] truncate font-mono text-xs">
                    {r.detail ? JSON.stringify(r.detail) : "—"}
                  </TableCell>
                  <TableCell className="text-muted-foreground text-right text-xs">
                    {formatTime(r.created_at)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
