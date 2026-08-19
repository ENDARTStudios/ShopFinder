"use client";

/**
 * ShopFinder — /admin/security (#22)
 *
 * Enrollment de MFA TOTP: QR + secret para o app autenticador,
 * verificação do código e ativação/desativação.
 */
import * as React from "react";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ShieldCheck, KeyRound, Loader2, CheckCircle2 } from "lucide-react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

interface SetupResponse {
  secret: string;
  otpauthUri: string;
  qrDataUrl: string;
}

export default function SecurityPage() {
  const { status } = useSession();
  const [setup, setSetup] = React.useState<SetupResponse | null>(null);
  const [enabled, setEnabled] = React.useState<boolean | null>(null);
  const [code, setCode] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [done, setDone] = React.useState(false);

  const loadStatus = React.useCallback(async () => {
    const res = await fetch("/api/admin/mfa/enable");
    if (res.ok) {
      const data = (await res.json()) as { enabled: boolean };
      setEnabled(data.enabled);
    }
  }, []);

  React.useEffect(() => {
    if (status === "authenticated") void loadStatus();
  }, [status, loadStatus]);

  async function startSetup() {
    setBusy(true);
    setError(null);
    setDone(false);
    try {
      const res = await fetch("/api/admin/mfa/setup", { method: "POST" });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? "Falha no setup");
      setSetup(await res.json());
      setEnabled(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro");
    }
    setBusy(false);
  }

  async function enable(event: React.FormEvent) {
    event.preventDefault();
    if (!code) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/mfa/enable", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Código inválido");
      setEnabled(true);
      setSetup(null);
      setCode("");
      setDone(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro");
    }
    setBusy(false);
  }

  async function disable() {
    setBusy(true);
    setError(null);
    const res = await fetch("/api/admin/mfa/enable", { method: "DELETE" });
    if (res.ok) {
      setEnabled(false);
      setDone(false);
      setSetup(null);
    }
    setBusy(false);
  }

  if (status === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6 lg:px-8">
        <Link
          href="/admin"
          className="mb-2 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Dashboard
        </Link>
        <h1 className="mb-6 flex items-center gap-2 text-2xl font-bold tracking-tight">
          <ShieldCheck className="h-6 w-6 text-emerald-500" />
          Segurança da conta
        </h1>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center justify-between text-base">
              <span className="flex items-center gap-2">
                <KeyRound className="h-4 w-4" />
                Autenticação de dois fatores (TOTP)
              </span>
              {enabled !== null && (
                <Badge
                  className={
                    enabled ? "bg-emerald-500/90 text-white" : "bg-amber-500/90 text-white"
                  }
                >
                  {enabled ? "Ativo" : "Inativo"}
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Segundo fator obrigatório para roles admin quando a flag{" "}
              <code className="rounded bg-muted px-1 text-xs">mfa_admin</code> está ativa
              (docs/eng/RBAC.md). Enrole com um app autenticador (Google Authenticator, 1Password,
              Authy...).
            </p>

            {done && (
              <div className="flex items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-3 text-sm text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 className="h-4 w-4" />
                MFA ativado — o código será exigido no próximo login.
              </div>
            )}

            {enabled ? (
              <Button variant="outline" onClick={disable} disabled={busy}>
                {busy ? "Desativando..." : "Desativar MFA"}
              </Button>
            ) : !setup ? (
              <Button
                onClick={startSetup}
                disabled={busy}
                className="bg-emerald-500 hover:bg-emerald-600"
              >
                {busy ? "Gerando..." : "Iniciar enrollment"}
              </Button>
            ) : (
              <div className="space-y-4">
                <div className="flex flex-col items-center gap-3 rounded-xl border border-border/60 p-4">
                  {/* QR renderizado do otpauth URI — secret fica no server */}
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={setup.qrDataUrl}
                    alt="QR code para app autenticador"
                    width={200}
                    height={200}
                  />
                  <p className="break-all rounded bg-muted px-2 py-1 font-mono text-xs">
                    {setup.secret}
                  </p>
                </div>

                <form onSubmit={enable} className="flex items-end gap-2">
                  <div className="flex-1">
                    <label htmlFor="totp-code" className="mb-1 block text-sm font-medium">
                      Código de 6 dígitos do app
                    </label>
                    <Input
                      id="totp-code"
                      inputMode="numeric"
                      autoComplete="one-time-code"
                      placeholder="000000"
                      value={code}
                      onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                      className="font-mono tracking-widest"
                    />
                  </div>
                  <Button
                    type="submit"
                    disabled={busy || code.length !== 6}
                    className="bg-emerald-500 hover:bg-emerald-600"
                  >
                    {busy ? "Verificando..." : "Ativar"}
                  </Button>
                </form>
              </div>
            )}

            {error && <p className="text-sm text-red-500">{error}</p>}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
