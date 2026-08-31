"use client";

/**
 * ShopFinder — Solicitação de arrependimento (T061, art. 49 CDC).
 *
 * Estados por pedido pago: botão "Solicitar arrependimento" (dentro dos 7 dias
 * e sem solicitação), badge com protocolo após a solicitação, ou texto discreto
 * de prazo expirado. O POST grava a solicitação e devolve o protocolo.
 */
import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

interface WithdrawalRequestProps {
  orderId: string;
  status: string;
  createdAt: string;
  cancellationRequestedAt: string | null;
  cancellationProtocol: string | null;
}

export function WithdrawalRequest({
  orderId,
  status,
  createdAt,
  cancellationRequestedAt,
  cancellationProtocol
}: WithdrawalRequestProps) {
  const t = useTranslations("orders");
  const locale = useLocale();
  const [requestedAt, setRequestedAt] = useState<string | null>(
    cancellationRequestedAt
  );
  const [protocol, setProtocol] = useState<string | null>(cancellationProtocol);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);

  if (status !== "paid") return null;

  const requested = requestedAt !== null;
  const expired = Date.now() - new Date(createdAt).getTime() > SEVEN_DAYS_MS;

  async function requestWithdrawal() {
    setLoading(true);
    setFailed(false);
    try {
      const res = await fetch(`/api/orders/${orderId}/cancelamento`, {
        method: "POST"
      });
      if (!res.ok) {
        setFailed(true);
        return;
      }
      const data = (await res.json()) as {
        protocolo: string;
        cancellationRequestedAt: string;
      };
      setRequestedAt(data.cancellationRequestedAt);
      setProtocol(data.protocolo);
    } catch {
      setFailed(true);
    } finally {
      setLoading(false);
    }
  }

  if (requested) {
    const dateFmt = new Intl.DateTimeFormat(locale, {
      dateStyle: "medium",
      timeStyle: "short"
    });
    return (
      <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-border/40 pt-3 text-xs">
        <Badge variant="secondary">{t("withdrawRequested")}</Badge>
        <span className="font-mono text-muted-foreground">
          {t("withdrawProtocol")}: {protocol}
        </span>
        {requestedAt && (
          <span className="text-muted-foreground">{dateFmt.format(new Date(requestedAt))}</span>
        )}
      </div>
    );
  }

  if (expired) {
    return (
      <p className="mt-3 border-t border-border/40 pt-3 text-xs text-muted-foreground">
        {t("withdrawExpired")}
      </p>
    );
  }

  return (
    <div className="mt-3 border-t border-border/40 pt-3">
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={requestWithdrawal}
        disabled={loading}
      >
        {loading ? t("withdrawRequesting") : t("withdrawAction")}
      </Button>
      {failed && (
        <p className="mt-2 text-xs text-destructive">
          {t("withdrawError")}{" "}
          <button
            type="button"
            onClick={requestWithdrawal}
            className="underline hover:no-underline"
          >
            {t("withdrawRetry")}
          </button>
        </p>
      )}
    </div>
  );
}
