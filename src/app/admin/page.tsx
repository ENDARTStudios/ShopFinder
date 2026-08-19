/**
 * ShopFinder — Operator Dashboard
 *
 * Protected page (middleware redirects to /login if not authenticated).
 * Shows all products with enrichment status, confidence indicators,
 * and allows status changes (publish, review, archive).
 *
 * The dashboard materializes the "AI is advisory, Policies are authoritative"
 * principle: operators can override AI decisions and control what enters
 * the public catalog.
 */
"use client";

import * as React from "react";
import { useSession } from "next-auth/react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ShieldCheck, AlertTriangle, CheckCircle2, Clock, Archive, Activity } from "lucide-react";
import Link from "next/link";
import { NotificationsBell } from "@/components/site/notifications-bell";
import { AdminDashboardSkeleton } from "@/components/site/admin-skeletons";

interface AdminProduct {
  id: string;
  sku: string;
  slug: string;
  title: string;
  status: string;
  category: string;
  manufacturer: string | null;
  traceId: string | null;
  price: number;
  stockCount: number;
  offerCount: number;
  attributeCount: number;
  enrichedAttributeCount: number;
  enrichmentComplete: boolean;
  avgConfidence: number;
  isLowConfidence: boolean;
  createdAt: string;
  updatedAt: string;
}

interface AdminSummary {
  total: number;
  published: number;
  draft: number;
  review: number;
  archived: number;
  lowConfidence: number;
  fullyEnriched: number;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  published: {
    label: "Publicado",
    color: "bg-emerald-500/90 text-white",
    icon: <CheckCircle2 className="h-3 w-3" />
  },
  draft: {
    label: "Rascunho",
    color: "bg-slate-500/90 text-white",
    icon: <Clock className="h-3 w-3" />
  },
  review: {
    label: "Revisão",
    color: "bg-amber-500/90 text-white",
    icon: <AlertTriangle className="h-3 w-3" />
  },
  archived: {
    label: "Arquivado",
    color: "bg-red-500/90 text-white",
    icon: <Archive className="h-3 w-3" />
  }
};

function getConfidenceColor(conf: number): string {
  if (conf >= 0.95) return "text-emerald-500";
  if (conf >= 0.8) return "text-blue-500";
  if (conf >= 0.6) return "text-amber-500";
  return "text-red-500";
}

function getConfidenceLabel(conf: number): string {
  if (conf >= 0.95) return "Alta";
  if (conf >= 0.8) return "Boa";
  if (conf >= 0.6) return "Média";
  return "Baixa";
}

export default function AdminDashboard() {
  const { data: session, status: sessionStatus } = useSession();
  const [products, setProducts] = React.useState<AdminProduct[]>([]);
  const [summary, setSummary] = React.useState<AdminSummary | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [filterStatus, setFilterStatus] = React.useState<string | null>(null);
  const [filterLowConf, setFilterLowConf] = React.useState(false);
  const [updating, setUpdating] = React.useState<string | null>(null);

  const fetchProducts = React.useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (filterStatus) params.set("status", filterStatus);
    if (filterLowConf) params.set("lowConfidence", "true");

    try {
      const res = await fetch(`/api/admin/products?${params.toString()}`);
      if (res.status === 401) {
        setError("Não autenticado. Faça login para acessar.");
        setLoading(false);
        return;
      }
      if (res.status === 403) {
        setError("Acesso negado. Requer perfil admin ou operator.");
        setLoading(false);
        return;
      }
      const data = await res.json();
      setProducts(data.products || []);
      setSummary(data.summary || null);
    } catch {
      setError("Erro ao carregar produtos.");
    }
    setLoading(false);
  }, [filterStatus, filterLowConf]);

  React.useEffect(() => {
    if (sessionStatus === "authenticated") {
      fetchProducts();
    } else if (sessionStatus === "unauthenticated") {
      setLoading(false);
      setError("Não autenticado. Faça login para acessar.");
    }
  }, [sessionStatus, fetchProducts]);

  const updateStatus = async (productId: string, newStatus: string) => {
    setUpdating(productId);
    try {
      const res = await fetch(`/api/admin/products/${productId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus })
      });

      if (res.ok) {
        // Update local state
        setProducts((prev) =>
          prev.map((p) => (p.id === productId ? { ...p, status: newStatus } : p))
        );
        // Refresh summary
        fetchProducts();
      }
    } catch {
      // Silent fail — UI will show stale state
    }
    setUpdating(null);
  };

  if (sessionStatus === "loading" || (loading && !error)) {
    return <AdminDashboardSkeleton />;
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4">
        <Card className="max-w-md">
          <CardContent className="pt-6 text-center">
            <AlertTriangle className="mx-auto mb-3 h-8 w-8 text-amber-500" />
            <p className="mb-4 text-sm text-muted-foreground">{error}</p>
            <Link href="/login">
              <Button className="bg-emerald-500 hover:bg-emerald-600">Ir para Login</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Dashboard do Operador</h1>
            <p className="text-sm text-muted-foreground">
              Supervisione o pipeline, revise confiança e controle o catálogo público.
            </p>
          </div>
          <Link href="/">
            <Button variant="ghost" size="sm">
              Ver site público
            </Button>
          </Link>
          <Link href="/admin/pipeline">
            <Button variant="outline" size="sm">
              <Activity className="mr-1.5 h-4 w-4" />
              Pipeline
            </Button>
          </Link>
          <Link href="/admin/security">
            <Button variant="outline" size="sm">
              <ShieldCheck className="mr-1.5 h-4 w-4" />
              Segurança
            </Button>
          </Link>
          <NotificationsBell />
        </div>

        {/* Summary cards */}
        {summary && (
          <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
            <Card className="p-3">
              <div className="text-xs text-muted-foreground">Total</div>
              <div className="text-xl font-bold">{summary.total}</div>
            </Card>
            <Card className="p-3">
              <div className="text-xs text-muted-foreground">Publicados</div>
              <div className="text-xl font-bold text-emerald-500">{summary.published}</div>
            </Card>
            <Card className="p-3">
              <div className="text-xs text-muted-foreground">Rascunho</div>
              <div className="text-xl font-bold text-slate-500">{summary.draft}</div>
            </Card>
            <Card className="p-3">
              <div className="text-xs text-muted-foreground">Revisão</div>
              <div className="text-xl font-bold text-amber-500">{summary.review}</div>
            </Card>
            <Card className="p-3">
              <div className="text-xs text-muted-foreground">Arquivados</div>
              <div className="text-xl font-bold text-red-500">{summary.archived}</div>
            </Card>
            <Card className="p-3">
              <div className="text-xs text-muted-foreground">Baixa conf.</div>
              <div className="text-xl font-bold text-amber-500">{summary.lowConfidence}</div>
            </Card>
            <Card className="p-3">
              <div className="text-xs text-muted-foreground">Enriquecidos</div>
              <div className="text-xl font-bold text-emerald-500">{summary.fullyEnriched}</div>
            </Card>
          </div>
        )}

        {/* Filters */}
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <Button
            size="sm"
            variant={filterStatus === null && !filterLowConf ? "default" : "outline"}
            onClick={() => {
              setFilterStatus(null);
              setFilterLowConf(false);
            }}
            className={
              filterStatus === null && !filterLowConf ? "bg-emerald-500 hover:bg-emerald-600" : ""
            }
          >
            Todos
          </Button>
          {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
            <Button
              key={key}
              size="sm"
              variant={filterStatus === key ? "default" : "outline"}
              onClick={() => {
                setFilterStatus(key);
                setFilterLowConf(false);
              }}
              className={filterStatus === key ? "bg-emerald-500 hover:bg-emerald-600" : ""}
            >
              {cfg.label}
            </Button>
          ))}
          <Button
            size="sm"
            variant={filterLowConf ? "default" : "outline"}
            onClick={() => {
              setFilterLowConf(!filterLowConf);
              setFilterStatus(null);
            }}
            className={filterLowConf ? "bg-amber-500 hover:bg-amber-600" : ""}
          >
            <AlertTriangle className="mr-1 h-3 w-3" />
            Baixa confiança
          </Button>
        </div>

        {/* Products table */}
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b bg-muted/30">
                  <tr className="text-left">
                    <th className="px-3 py-2 font-medium">Produto</th>
                    <th className="px-3 py-2 font-medium">Status</th>
                    <th className="px-3 py-2 font-medium">Fabricante</th>
                    <th className="px-3 py-2 font-medium text-right">Conf.</th>
                    <th className="px-3 py-2 font-medium text-right">Enriq.</th>
                    <th className="px-3 py-2 font-medium text-right">Preço</th>
                    <th className="px-3 py-2 font-medium text-right">Ofertas</th>
                    <th className="px-3 py-2 font-medium">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {products.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-3 py-8 text-center text-muted-foreground">
                        Nenhum produto encontrado com os filtros atuais.
                      </td>
                    </tr>
                  ) : (
                    products.map((p) => {
                      const sc = STATUS_CONFIG[p.status] ?? STATUS_CONFIG.draft;
                      return (
                        <tr key={p.id} className="border-b hover:bg-muted/20">
                          <td className="px-3 py-2">
                            <div className="font-medium line-clamp-1">{p.title}</div>
                            <div className="text-xs text-muted-foreground">{p.category}</div>
                          </td>
                          <td className="px-3 py-2">
                            <Badge className={sc.color}>
                              {sc.icon}
                              <span className="ml-1">{sc.label}</span>
                            </Badge>
                          </td>
                          <td className="px-3 py-2 text-xs">{p.manufacturer ?? "—"}</td>
                          <td className="px-3 py-2 text-right">
                            {p.enrichedAttributeCount > 0 ? (
                              <span
                                className={`font-medium ${getConfidenceColor(p.avgConfidence)}`}
                              >
                                {Math.round(p.avgConfidence * 100)}%
                              </span>
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </td>
                          <td className="px-3 py-2 text-right">
                            <span
                              className={
                                p.enrichmentComplete ? "text-emerald-500" : "text-amber-500"
                              }
                            >
                              {p.enrichedAttributeCount}/{p.attributeCount}
                            </span>
                          </td>
                          <td className="px-3 py-2 text-right font-medium">
                            ${p.price.toFixed(2)}
                          </td>
                          <td className="px-3 py-2 text-right">{p.offerCount}</td>
                          <td className="px-3 py-2">
                            <div className="flex gap-1">
                              {p.status !== "published" && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-7 px-2 text-xs"
                                  disabled={updating === p.id}
                                  onClick={() => updateStatus(p.id, "published")}
                                >
                                  Publicar
                                </Button>
                              )}
                              {p.status !== "review" && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-7 px-2 text-xs"
                                  disabled={updating === p.id}
                                  onClick={() => updateStatus(p.id, "review")}
                                >
                                  Revisar
                                </Button>
                              )}
                              {p.status !== "archived" && (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-7 px-2 text-xs"
                                  disabled={updating === p.id}
                                  onClick={() => updateStatus(p.id, "archived")}
                                >
                                  Arquivar
                                </Button>
                              )}
                              <Link href={`/produtos/${p.slug}`} target="_blank">
                                <Button size="sm" variant="ghost" className="h-7 px-2 text-xs">
                                  Ver
                                </Button>
                              </Link>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="mt-6 flex items-center justify-between text-xs text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
            <span>
              {products.length} produto(s) exibido(s). Operações protegidas por NextAuth + RBAC.
            </span>
          </div>
          <div>
            Logado como: <span className="font-medium">{session?.user?.email ?? "—"}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
