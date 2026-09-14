"use client";

/**
 * ShopFinder — /admin/analytics (T077).
 *
 * Agregados first-party dos últimos 7 dias (pageviews, top páginas,
 * referrers e dispositivos). Cookieless: sem cookie, sem IP cru e sem
 * identificador — apenas contagens agregadas (DECISAO-ANALYTICS-001).
 * RBAC: a rota de API exige admin.access; a página é da área /admin.
 */
import * as React from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

interface AnalyticsPayload {
  period: string;
  total: number;
  topPages: Array<{ path: string; views: number }>;
  referrers: Array<{ host: string; views: number }>;
  devices: Array<{ device: string; views: number }>;
}

export default function AnalyticsAdminPage() {
  const { status } = useSession();
  const [data, setData] = React.useState<AnalyticsPayload | null>(null);
  const [error, setError] = React.useState(false);

  React.useEffect(() => {
    if (status !== "authenticated") return;
    fetch("/api/admin/analytics")
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then(setData)
      .catch(() => setError(true));
  }, [status]);

  if (status === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center text-muted-foreground">
        Carregando…
      </div>
    );
  }

  if (status === "unauthenticated" || error) {
    return (
      <div className="flex min-h-screen items-center justify-center text-muted-foreground">
        {error ? "Erro ao carregar analytics." : "Acesso restrito."}
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
      <Link
        href="/admin"
        className="mb-6 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Voltar ao dashboard
      </Link>

      <h1 className="mb-1 text-2xl font-bold tracking-tight">Analytics — últimos 7 dias</h1>
      <p className="mb-8 text-sm text-muted-foreground">
        Agregados first-party, cookieless: sem cookies, sem IP cru e sem
        identificadores individuais (DECISAO-ANALYTICS-001).
      </p>

      {!data ? (
        <p className="text-sm text-muted-foreground">Carregando dados…</p>
      ) : (
        <div className="space-y-8">
          <section>
            <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-muted-foreground">
              Total de pageviews (7 dias)
            </h2>
            <p className="text-4xl font-black text-emerald-500">{data.total}</p>
          </section>

          <section>
            <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-muted-foreground">
              Top páginas
            </h2>
            {data.topPages.length === 0 ? (
              <p className="text-sm text-muted-foreground">Sem dados no período.</p>
            ) : (
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="border-b border-border/60 text-left text-xs uppercase text-muted-foreground">
                    <th className="py-2 pr-4 font-semibold">Página</th>
                    <th className="py-2 font-semibold text-right">Views</th>
                  </tr>
                </thead>
                <tbody>
                  {data.topPages.map((p) => (
                    <tr key={p.path} className="border-b border-border/30">
                      <td className="py-2 pr-4 font-mono text-xs">{p.path}</td>
                      <td className="py-2 text-right font-medium">{p.views}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>

          <section>
            <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-muted-foreground">
              Fontes (referrers externos)
            </h2>
            {data.referrers.length === 0 ? (
              <p className="text-sm text-muted-foreground">Sem referrers externos no período.</p>
            ) : (
              <ul className="space-y-1 text-sm">
                {data.referrers.map((r) => (
                  <li key={r.host} className="flex justify-between border-b border-border/30 pb-1">
                    <span>{r.host}</span>
                    <span className="font-medium">{r.views}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section>
            <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-muted-foreground">
              Dispositivos
            </h2>
            {data.devices.length === 0 ? (
              <p className="text-sm text-muted-foreground">Sem dados no período.</p>
            ) : (
              <ul className="space-y-1 text-sm">
                {data.devices.map((d) => (
                  <li key={d.device} className="flex justify-between border-b border-border/30 pb-1">
                    <span>{d.device}</span>
                    <span className="font-medium">{d.views}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
