"use client";

/**
 * ShopFinder — Painel "Preferências de Cookies" (LGPD).
 *
 * Segunda camada da especificação de consentimento (docs/legal/
 * cookie-banner-consentimento-lgpd-v2.md). A plataforma usa somente
 * tecnologias essenciais e de preferência (sem analytics/publicidade), então
 * o banner de primeira camada é dispensado conforme a própria especificação
 * (§3); este painel é o local permanente de gestão (link no rodapé).
 *
 * Salvar grava um registro de consentimento em sf:cookie-consent (id aleatório,
 * timestamp, versão das políticas, escolhas, idioma). Revogar "Preferências"
 * remove as chaves opcionais do armazenamento (sf:locale, sf:currency,
 * sf:notifications, shopfinder:compare, shopfinder:read-notifications e o
 * cookie `locale`) — as essenciais (carrinho, sessão, CSRF, fx, imagens)
 * permanecem.
 */
import * as React from "react";
import { useLocale, useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";

const CONSENT_KEY = "sf:cookie-consent";
const POLICY_VERSION = "2.0";
const OPTIONAL_KEYS = [
  "sf:locale",
  "sf:currency",
  "sf:notifications",
  "shopfinder:compare",
  "shopfinder:read-notifications"
];

interface ConsentRecord {
  id: string;
  ts: string;
  version: string;
  choices: { essential: true; preferences: boolean };
  lang: string;
}

function readConsent(): ConsentRecord | null {
  try {
    const raw = localStorage.getItem(CONSENT_KEY);
    return raw ? (JSON.parse(raw) as ConsentRecord) : null;
  } catch {
    return null;
  }
}

function clearOptionalStorage() {
  for (const key of OPTIONAL_KEYS) {
    try {
      localStorage.removeItem(key);
    } catch {
      // armazenamento indisponível — segue sem bloquear a revogação
    }
  }
  // cookie `locale` (Preferência — idioma): removido na revogação
  document.cookie = "locale=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/";
}

export function CookiePreferences() {
  const t = useTranslations("cookies.panel");
  const locale = useLocale();
  const [preferences, setPreferences] = React.useState(true);
  const [message, setMessage] = React.useState<string | null>(null);
  const [hydrated, setHydrated] = React.useState(false);

  React.useEffect(() => {
    const record = readConsent();
    // Sem registro: estado atual (tecnologias de preferência já ativas por uso
    // explícito de funcionalidades). Com registro: reflete a última escolha.
    if (record) setPreferences(record.choices.preferences);
    setHydrated(true);
  }, []);

  function persist(preferencesChoice: boolean) {
    const record: ConsentRecord = {
      id:
        typeof crypto !== "undefined" && "randomUUID" in crypto
          ? crypto.randomUUID()
          : `c_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`,
      ts: new Date().toISOString(),
      version: POLICY_VERSION,
      choices: { essential: true, preferences: preferencesChoice },
      lang: locale
    };
    try {
      localStorage.setItem(CONSENT_KEY, JSON.stringify(record));
    } catch {
      // sem armazenamento, a escolha vale apenas para esta visita
    }
    if (!preferencesChoice) clearOptionalStorage();
  }

  function save() {
    const previous = readConsent()?.choices.preferences ?? null;
    persist(preferences);
    setMessage(
      previous === true && !preferences ? t("revokedMsg") : t("savedMsg")
    );
  }

  function reject() {
    setPreferences(false);
    persist(false);
    setMessage(t("rejectedMsg"));
  }

  return (
    <div
      id="preferencias"
      className="scroll-mt-20 rounded-xl border border-border/60 bg-muted/20 p-4"
    >
      <h2 className="mb-1 text-base font-bold">{t("title")}</h2>
      <p className="mb-4 text-sm leading-relaxed text-muted-foreground">
        {t("intro")}
      </p>

      <div
        className={`space-y-3 ${hydrated ? "" : "opacity-70"}`}
        role="group"
        aria-label={t("title")}
      >
        <div className="flex items-start justify-between gap-3 rounded-lg border border-border/40 bg-card p-3">
          <div>
            <div className="text-sm font-medium">{t("essentialTitle")}</div>
            <div className="text-xs text-muted-foreground">
              {t("essentialDesc")}
            </div>
          </div>
          <span className="shrink-0 rounded-full bg-emerald-500/10 px-2 py-1 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
            {t("alwaysOn")}
          </span>
        </div>

        <div className="flex items-start justify-between gap-3 rounded-lg border border-border/40 bg-card p-3">
          <div>
            <div className="text-sm font-medium">{t("preferencesTitle")}</div>
            <div className="text-xs text-muted-foreground">
              {t("preferencesDesc")}
            </div>
          </div>
          <Switch
            aria-label={t("preferencesTitle")}
            checked={preferences}
            onCheckedChange={setPreferences}
          />
        </div>

        <div className="flex flex-wrap gap-2">
          <Button type="button" size="sm" onClick={save}>
            {t("save")}
          </Button>
          <Button type="button" size="sm" variant="outline" onClick={reject}>
            {t("reject")}
          </Button>
        </div>

        {message && (
          <p role="status" className="text-xs leading-relaxed text-muted-foreground">
            {message}
          </p>
        )}
      </div>
    </div>
  );
}
