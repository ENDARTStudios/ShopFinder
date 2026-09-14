/**
 * ShopFinder — modo afiliado Amazon (T071).
 *
 * Monta a URL de saída de ofertas Amazon anexando a tag de Associado
 * (`AMAZON_ASSOCIATE_TAG`) de forma IDEMPOTENTE: URL que já tem `tag=`
 * com valor volta intacta. Sem tag configurada, devolve a URL sem
 * parâmetro (comportamento anterior).
 *
 * Server-side apenas — a tag lê process.env e NÃO vai para o client bundle.
 */

const TAG = (process.env.AMAZON_ASSOCIATE_TAG ?? "").trim();

export function amazonAssociateTag(): string {
  return TAG;
}

/**
 * @param input ASIN (10 alfanuméricos) ou URL de produto em domínio amazon.*
 * @returns URL final (com/sem tag) ou null se a entrada não for utilizável.
 */
export function buildAmazonOfferUrl(input: string): string | null {
  const trimmed = input.trim();
  if (trimmed === "") return null;

  const isAsin = /^[A-Z0-9]{10}$/i.test(trimmed);
  let url: URL;
  try {
    url = new URL(
      isAsin ? `https://www.amazon.com/dp/${trimmed.toUpperCase()}` : trimmed
    );
  } catch {
    return null;
  }

  if (!/(^|\.)amazon\./i.test(url.hostname)) return null;

  // Idempotente: tag já presente (com valor) → URL intacta.
  const existing = url.searchParams.get("tag");
  if (existing !== null && existing.trim() !== "") return url.toString();

  if (TAG !== "") url.searchParams.set("tag", TAG);
  return url.toString();
}
