"use client";

"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

function RegisterForm() {
  const router = useRouter();
  const t = useTranslations("register");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [accepted, setAccepted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, termsAccepted: true })
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Erro ao registrar");
        setLoading(false);
        return;
      }

      // Auto-login after registration
      await signIn("credentials", { email, password, redirect: false });
      router.push("/");
      router.refresh();
    } catch {
      setError("Erro de conexão");
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl">Criar conta</CardTitle>
          {error && <p className="text-sm text-red-500">{error}</p>}
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium">Email</label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="seu@email.com"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Senha</label>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
                placeholder="Mínimo 8 caracteres"
              />
            </div>
            {/* T051 — aceite obrigatório dos termos (LGPD art. 8º / MCV art. 10) */}
            <div className="flex items-start gap-2 text-sm">
              <input
                id="terms-acceptance"
                type="checkbox"
                checked={accepted}
                onChange={(e) => setAccepted(e.target.checked)}
                required
                className="mt-0.5 h-4 w-4"
              />
              <label htmlFor="terms-acceptance" className="text-muted-foreground">
                {t("acceptPrefix")}{" "}
                <Link href="/termos" target="_blank" className="text-emerald-500 hover:underline">
                  {t("terms")}
                </Link>{" "}
                {t("acceptAnd")}{" "}
                <Link
                  href="/privacidade"
                  target="_blank"
                  className="text-emerald-500 hover:underline"
                >
                  {t("privacy")}
                </Link>
                .
              </label>
            </div>

            <Button
              type="submit"
              disabled={loading || !accepted}
              className="w-full bg-emerald-500 hover:bg-emerald-600"
            >
              {loading ? "Registrando..." : "Registrar"}
            </Button>
            <p className="text-center text-sm text-muted-foreground">
              Já tem conta?{" "}
              <a href="/login" className="text-emerald-500 hover:underline">
                Entrar
              </a>
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <Suspense
      fallback={<div className="flex min-h-screen items-center justify-center">Carregando...</div>}
    >
      <RegisterForm />
    </Suspense>
  );
}
