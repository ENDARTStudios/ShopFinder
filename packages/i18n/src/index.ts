/**
 * @workspace/i18n
 *
 * Internationalization config — locale, messages, routing.
 *
 *   import { DEFAULT_LOCALE, LOCALES } from "@workspace/i18n";
 *   import { getMessages } from "@workspace/i18n/messages";
 *   import { localePath } from "@workspace/i18n/routing";
 */

export { DEFAULT_LOCALE, LOCALES, LOCALE_NAMES, isLocale, type Locale } from "./locale";
export { getMessages, type MessageCatalog } from "./messages";
export { localePath, getLocalePath } from "./routing";
