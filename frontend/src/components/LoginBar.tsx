import { useState, type FormEvent } from "react";
import { LogOut, ShieldCheck, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

interface Props {
  role: string | null;
  staffName: string | null;
  onLogin: (email: string, password: string) => Promise<void>;
  onLogout: () => void;
}

const DEMO = {
  admin: { email: "admin@arena.gg", password: "admin-pass-2026" },
  reporter: { email: "reporter@arena.gg", password: "reporter-pass-2026" },
};

export function LoginBar({ role, staffName, onLogin, onLogout }: Props) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function attempt(mail: string, pass: string) {
    setBusy(true);
    setError(null);
    try {
      await onLogin(mail, pass);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign in failed.");
    } finally {
      setBusy(false);
    }
  }

  if (role) {
    return (
      <div className="flex items-center gap-3">
        <Badge variant="outline" className="gap-1.5 py-1">
          {role === "admin" ? (
            <ShieldCheck className="size-3.5 text-emerald-400" />
          ) : (
            <User className="size-3.5" />
          )}
          <span className="font-medium">{staffName}</span>
          <span className="text-muted-foreground">· {role}</span>
        </Badge>
        <Button variant="ghost" size="sm" onClick={onLogout}>
          <LogOut className="size-4" /> Sign out
        </Button>
      </div>
    );
  }

  function submit(e: FormEvent) {
    e.preventDefault();
    void attempt(email, password);
  }

  return (
    <form onSubmit={submit} className="flex flex-wrap items-center gap-2">
      <Input
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="email"
        type="email"
        className="h-9 w-44"
      />
      <Input
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="password"
        type="password"
        className="h-9 w-40"
      />
      <Button type="submit" size="sm" disabled={busy}>
        Sign in
      </Button>
      <span className="text-muted-foreground ml-1 text-xs">demo:</span>
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={busy}
        onClick={() => void attempt(DEMO.admin.email, DEMO.admin.password)}
      >
        admin
      </Button>
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={busy}
        onClick={() => void attempt(DEMO.reporter.email, DEMO.reporter.password)}
      >
        reporter
      </Button>
      {error && <span className="text-destructive text-xs">{error}</span>}
    </form>
  );
}
