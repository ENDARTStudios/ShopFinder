/**
 * @workspace/i18n/routing
 *
 * Locale-aware routing helpers. Works with next-intl's pathnames config.
 */

import { DEFAULT_LOCALE, type Locale, isLocale } from "../locale";

/**
 * Build a locale-prefixed path.
 *   localePath("/catalog", "pt-BR") → "/pt-BR/catalog"
 *   localePath("/catalog", "en")    → "/catalog"  (default locale has no prefix)
 */
export function localePath(path: string, locale: Locale = DEFAULT_LOCALE as Locale): string {
  const clean = path.startsWith("/") ? path : `/${path}`;
  if (locale === DEFAULT_LOCALE) return clean;
  return `/${locale}${clean}`;
}

/** Extract the locale from a pathname. Returns null if not found. */
export function getLocalePath(pathname: string): Locale | null {
  const match = pathname.match(/^\/([a-z]{2}(?:-[A-Z]{2})?)(\/|$)/);
  if (match && isLocale(match[1])) return match[1] as Locale;
  return DEFAULT_LOCALE as Locale;
}
