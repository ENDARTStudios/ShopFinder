"use client";
import * as React from "react";
import Link from "next/link";
import { CheckCircle, AlertCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCart } from "@/context/cart-context";

function fmt(amount: number | null, currency: string | null): string {
  if (amount == null) return "—";
  const c = (currency ?? "usd").toUpperCase();
  try {
    return new Intl.NumberFormat("pt-BR", { style: "currency", currency: c }).format(amount / 100);
  } catch {
    return `${c} ${(amount / 100).toFixed(2)}`;
  }
}

export default function SuccessPage() {
  const [data, setData] = React.useState<any>(null);
  const [err, setErr] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [sessionId, setSessionId] = React.useState<string | null>(null);

  // T042: compra concluída → esvazia o carrinho (estado + localStorage sf:cart).
  // Só após a hidratação do provider — senão o restore do localStorage
  // sobrescreve o clear (efeito de hidratação roda depois do do filho).
  const { clear, hydrated } = useCart();
  React.useEffect(() => {
    if (hydrated) clear();
  }, [hydrated, clear]);

  React.useEffect(() => {
    const id = new URLSearchParams(window.location.search).get("session_id");
    setSessionId(id);
    if (!id) {
      setLoading(false);
      return;
    }
    fetch(`/api/checkout-status?session_id=${encodeURIComponent(id)}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error("falha ao verificar pagamento"))))
      .then(setData)
      .catch((e) => setErr(e.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading)
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
      </div>
    );

  if (err || !sessionId)
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-4 text-center">
        <AlertCircle className="h-12 w-12 text-red-500" />
        <p className="text-muted-foreground">{err ?? "Sessão não informada."}</p>
        <Button asChild className="bg-emerald-500 hover:bg-emerald-600">
          <Link href="/">Voltar ao catálogo</Link>
        </Button>
      </div>
    );

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="max-w-md text-center">
        <CheckCircle className="mx-auto h-16 w-16 text-emerald-500" />
        <h1 className="mt-6 text-3xl font-black tracking-tight">Pagamento confirmado!</h1>
        <p className="mt-2 text-muted-foreground">Seu pedido foi processado com sucesso.</p>
        <div className="mt-6 rounded-lg border border-border/60 bg-muted/30 p-4 text-left text-sm">
          {data?.customer_email && (
            <p className="text-muted-foreground">
              Email: <span className="font-medium text-foreground">{data.customer_email}</span>
            </p>
          )}
          {data?.amount_total != null && (
            <p className="mt-1 text-muted-foreground">
              Total:{" "}
              <span className="font-semibold text-foreground">
                {fmt(data.amount_total, data.currency)}
              </span>
            </p>
          )}
          <p className="mt-1 text-muted-foreground">
            Status:{" "}
            <span className="font-medium capitalize text-emerald-600">
              {data?.payment_status === "paid" ? "Pago" : data?.payment_status}
            </span>
          </p>
        </div>
        <Button asChild className="mt-8 bg-emerald-500 hover:bg-emerald-600">
          <Link href="/">Voltar ao catálogo</Link>
        </Button>
      </div>
    </div>
  );
}
