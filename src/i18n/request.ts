/**
 * ShopFinder — next-intl request config (no i18n routing).
 *
 * Locale is stored in a `locale` cookie (set by the language selector in
 * the header). Falls back to `pt-BR` if no cookie is present. We do NOT use
 * next-intl's i18n routing (no `[locale]` segment) — this keeps the existing
 * URL structure intact (`/`, `/produtos/[slug]`, `/admin`, etc.).
 *
 * Messages live in `/messages/<locale>.json`.
 */
import { getRequestConfig } from "next-intl/server";
import { cookies } from "next/headers";

export const locales = ["pt-BR", "en"] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = "pt-BR";

export default getRequestConfig(async () => {
  const cookieStore = await cookies();
  const cookie = cookieStore.get("locale")?.value;
  const locale: Locale =
    cookie === "en" || cookie === "pt-BR" ? cookie : defaultLocale;

  return {
    locale,
    messages: (await import(`../../messages/${locale}.json`)).default
  };
});
