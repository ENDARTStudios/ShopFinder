/**
 * @workspace/i18n/locale
 *
 * Locale configuration for next-intl. Shared between the app and the
 * @workspace/i18n/messages + @workspace/i18n/routing subpaths.
 */

export const DEFAULT_LOCALE = process.env.NEXT_PUBLIC_DEFAULT_LOCALE ?? "en";

export const LOCALES = (process.env.NEXT_PUBLIC_LOCALES ?? "en,pt-BR,es,fr,de,it,ja,zh-CN")
  .split(",")
  .map((l) => l.trim())
  .filter(Boolean);

export const LOCALE_NAMES: Record<string, string> = {
  en: "English",
  "pt-BR": "Português (Brasil)",
  es: "Español",
  fr: "Français",
  de: "Deutsch",
  it: "Italiano",
  ja: "日本語",
  "zh-CN": "简体中文"
};

export const LOCALE_RTL = new Set<string>([]); // no RTL locales yet

export function isLocale(value: string): value is (typeof LOCALES)[number] {
  return LOCALES.includes(value);
}

export type Locale = (typeof LOCALES)[number];
