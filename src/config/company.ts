/**
 * ShopFinder — Dados da empresa (fonte única).
 *
 * Usados pelas páginas legais (/termos, /privacidade, /contato) e pelo rodapé.
 * Placeholders explícitos "EM-REGISTRO" devem ser completados pelo Operador
 * (exigência do Decreto 7.962/2013, art. 3º) — nunca inventar dados jurídicos.
 */
export const company = {
  /** Nome fantasia */
  name: "ShopFinder",
  /** Razão social */
  legalName: "END ART Studios",
  /** Canal oficial de suporte e contato do encarregado (DPO) */
  email: "endart.studios@gmail.com",
  /** CNPJ oficial da operadora */
  cnpj: "45.370.930/0001-75",
  /** Endereço da operadora */
  address: "Osasco/SP - Brasil",
  /** Canal oficial no Telegram */
  telegram: "t.me/ShopFinder2026",
  /** País da sede (para seção de direito aplicável em EN) */
  country: "Brasil"
} as const;
