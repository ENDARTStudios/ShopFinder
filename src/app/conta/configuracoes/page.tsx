"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";

/**
 * T045 — Configurações da conta (UI + localStorage; persistência em banco é
 * future work).
 *
 * - sf:locale / sf:currency / sf:notifications conforme especificado.
 * - Idioma também grava o cookie `locale` — o mesmo mecanismo do
 *   LanguageSelector — para que o next-intl aplique no reload.
 */
const LOCALE_COOKIE = "locale";
const ONE_YEAR = 60 * 60 * 24 * 365;

type Locale = "pt" | "en";
type Currency = "BRL" | "USD" | "EUR";
interface Notifications {
  email: boolean;
  push: boolean;
}

interface Settings {
  locale: Locale;
  currency: Currency;
  notifications: Notifications;
}

const DEFAULTS: Settings = {
  locale: "pt",
  currency: "BRL",
  notifications: { email: true, push: false }
};

function readSettings(): Settings {
  try {
    const locale = (localStorage.getItem("sf:locale") as Locale | null) ?? DEFAULTS.locale;
    const currency = (localStorage.getItem("sf:currency") as Currency | null) ?? DEFAULTS.currency;
    const rawNotif = localStorage.getItem("sf:notifications");
    const notifications: Notifications = rawNotif
      ? { ...DEFAULTS.notifications, ...(JSON.parse(rawNotif) as Notifications) }
      : DEFAULTS.notifications;
    return { locale, currency, notifications };
  } catch {
    return { ...DEFAULTS };
  }
}

function writeSettings(settings: Settings): void {
  localStorage.setItem("sf:locale", settings.locale);
  localStorage.setItem("sf:currency", settings.currency);
  localStorage.setItem("sf:notifications", JSON.stringify(settings.notifications));
  // Integração com o i18n real (mesmo cookie do LanguageSelector)
  document.cookie = `${LOCALE_COOKIE}=${settings.locale}; path=/; max-age=${ONE_YEAR}`;
}

export default function ConfiguracoesPage() {
  const t = useTranslations("account");
  const { toast } = useToast();

  const [settings, setSettings] = React.useState<Settings>(DEFAULTS);
  const [loaded, setLoaded] = React.useState(false);
  const [savedSettings, setSavedSettings] = React.useState<Settings>(DEFAULTS);

  React.useEffect(() => {
    const stored = readSettings();
    setSettings(stored);
    setSavedSettings(stored);
    setLoaded(true);
  }, []);

  const dirty = JSON.stringify(settings) !== JSON.stringify(savedSettings);

  const handleSave = () => {
    writeSettings(settings);
    setSavedSettings(settings);
    toast({ title: t("saved") });
  };

  if (!loaded) return null;

  return (
    <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6">
      <h1 className="mb-6 text-2xl font-bold">{t("settings")}</h1>

      <div className="space-y-6">
        {/* Idioma */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">{t("language")}</CardTitle>
          </CardHeader>
          <CardContent className="flex gap-6">
            {(
              [
                ["pt", "Português (PT)"],
                ["en", "English (EN)"]
              ] as Array<[Locale, string]>
            ).map(([value, label]) => (
              <div key={value} className="flex items-center gap-2">
                <input
                  type="radio"
                  id={`locale-${value}`}
                  name="locale"
                  checked={settings.locale === value}
                  onChange={() => setSettings((s) => ({ ...s, locale: value }))}
                />
                <Label htmlFor={`locale-${value}`}>{label}</Label>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Moeda */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">{t("currency")}</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-6">
            {(
              [
                ["BRL", "Real (BRL)"],
                ["USD", "Dólar (USD)"],
                ["EUR", "Euro (EUR)"]
              ] as Array<[Currency, string]>
            ).map(([value, label]) => (
              <div key={value} className="flex items-center gap-2">
                <input
                  type="radio"
                  id={`currency-${value}`}
                  name="currency"
                  checked={settings.currency === value}
                  onChange={() => setSettings((s) => ({ ...s, currency: value }))}
                />
                <Label htmlFor={`currency-${value}`}>{label}</Label>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Notificações */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">{t("notifications")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="notif-email"
                checked={settings.notifications.email}
                onChange={(e) =>
                  setSettings((s) => ({
                    ...s,
                    notifications: { ...s.notifications, email: e.target.checked }
                  }))
                }
              />
              <Label htmlFor="notif-email">{t("emailNotifications")}</Label>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="notif-push"
                checked={settings.notifications.push}
                onChange={(e) =>
                  setSettings((s) => ({
                    ...s,
                    notifications: { ...s.notifications, push: e.target.checked }
                  }))
                }
              />
              <Label htmlFor="notif-push">{t("pushNotifications")}</Label>
            </div>
          </CardContent>
        </Card>

        <Button disabled={!dirty} onClick={handleSave}>
          {t("save")}
        </Button>
      </div>
    </div>
  );
}
