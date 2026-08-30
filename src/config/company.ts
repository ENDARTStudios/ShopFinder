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
  /** Preencher pelo Operador quando o CNPJ for emitido */
  cnpj: "CNPJ-EM-REGISTRO",
  /** Preencher pelo Operador quando o endereço fiscal for definido */
  address: "ENDEREÇO-EM-REGISTRO",
  /** País da sede (para seção de direito aplicável em EN) */
  country: "Brasil"
} as const;
