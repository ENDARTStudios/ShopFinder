/**
 * @workspace/i18n/messages
 *
 * Message catalog loader. In dev, messages are loaded synchronously from
 * the JSON files in this directory. In production, they can be lazy-loaded
 * per-locale to keep the bundle small.
 */

import { DEFAULT_LOCALE, type Locale } from "../locale";

// Placeholder catalogs — populated when item 19 (Internacionalização) lands.
const CATALOGS: Record<string, Record<string, string>> = {
  en: {
    "common.appName": "Dropshipping Platform",
    "nav.home": "Home",
    "nav.catalog": "Catalog",
    "nav.cart": "Cart",
    "nav.account": "Account",
    "cta.addToCart": "Add to cart",
    "cta.checkout": "Checkout"
  },
  "pt-BR": {
    "common.appName": "Plataforma de Dropshipping",
    "nav.home": "Início",
    "nav.catalog": "Catálogo",
    "nav.cart": "Carrinho",
    "nav.account": "Conta",
    "cta.addToCart": "Adicionar ao carrinho",
    "cta.checkout": "Finalizar compra"
  }
};

export type MessageCatalog = Record<string, string>;

export function getMessages(locale: Locale = DEFAULT_LOCALE as Locale): MessageCatalog {
  return CATALOGS[locale] ?? CATALOGS[DEFAULT_LOCALE] ?? {};
}
