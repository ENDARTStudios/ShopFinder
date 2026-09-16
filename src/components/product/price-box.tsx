/**
 * T103 — Box de preço do hub de decisão: melhor oferta destacada +
 * alternativas por fornecedor. Frete EXIBIDO SOMENTE se existir no offer
 * (nunca estimado). CTA externo apenas quando há URL de saída (afiliado T071).
 */
import { ExternalLink } from "lucide-react";
import { PriceBlock } from "@/components/ui/price";

export interface PriceBoxOffer {
  id: string;
  supplierName: string;
  priceBrl: number;
  compareAtBrl: number | null;
  inventory: number;
  shipsFromCountry: string | null;
  fulfillmentDays: [number, number] | null;
  shippingCostBrl: number | null;
  url: string | null;
}

interface Labels {
  best: string;
  others: string;
  viewOffer: string;
  inStock: string;
  outOfStock: string;
  shipsFrom: string;
  shippingCost: string;
  freeShipping: string;
  days: string;
  supplierNote: string;
}

function ShipsNote({
  offer,
  labels
}: {
  offer: PriceBoxOffer;
  labels: Pick<Labels, "shipsFrom" | "shippingCost" | "freeShipping" | "days" | "supplierNote">;
}) {
  return (
    <p className="text-[11px] leading-relaxed text-muted-foreground">
      {offer.shipsFromCountry ? `${labels.shipsFrom}: ${offer.shipsFromCountry}. ` : ""}
      {offer.shippingCostBrl !== null
        ? offer.shippingCostBrl === 0
          ? `${labels.freeShipping}. `
          : `${labels.shippingCost}: R$ ${offer.shippingCostBrl.toFixed(2)}. `
        : ""}
      {offer.fulfillmentDays
        ? `${labels.days
            .replace("{min}", String(offer.fulfillmentDays[0]))
            .replace("{max}", String(offer.fulfillmentDays[1]))}. `
        : ""}
      {labels.supplierNote}
    </p>
  );
}

export function PriceBox({
  offers,
  labels
}: {
  offers: PriceBoxOffer[];
  labels: Labels;
}) {
  const sorted = [...offers].sort((a, b) => a.priceBrl - b.priceBrl);
  const best = sorted[0];
  const others = sorted.slice(1);
  if (!best) return null;

  const stock = (inv: number) => (inv > 0 ? labels.inStock : labels.outOfStock);

  return (
    <div className="space-y-4">
      {/* Melhor oferta */}
      <div className="rounded-lg border border-emerald-500/40 bg-emerald-500/5 p-4">
        <PriceBlock
          amount={best.priceBrl}
          currency="BRL"
          provider={best.supplierName}
          stock={best.inventory > 0 ? "in-stock" : "out"}
          discountPercent={
            best.compareAtBrl && best.compareAtBrl > best.priceBrl
              ? ((1 - best.priceBrl / best.compareAtBrl) * 100)
              : null
          }
          best
          size="lg"
        />
        <p className="mt-1 text-[11px] text-muted-foreground">{stock(best.inventory)}</p>
        <ShipsNote offer={best} labels={labels} />
        {best.url && (
          <a
            href={best.url}
            target="_blank"
            rel="noopener noreferrer sponsored"
            className="mt-3 inline-flex h-11 items-center gap-1.5 rounded-md bg-emerald-600 px-4 text-sm font-semibold text-white hover:bg-emerald-700"
          >
            {labels.viewOffer}
            <ExternalLink className="h-3.5 w-3.5" aria-hidden />
          </a>
        )}
      </div>

      {/* Alternativas */}
      {others.length > 0 && (
        <div className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {labels.others}
          </p>
          {others.map((o) => (
            <div key={o.id} className="rounded-lg border border-border/40 p-3">
              <PriceBlock
                amount={o.priceBrl}
                currency="BRL"
                provider={o.supplierName}
                stock={o.inventory > 0 ? "in-stock" : "out"}
                discountPercent={
                  o.compareAtBrl && o.compareAtBrl > o.priceBrl
                    ? ((1 - o.priceBrl / o.compareAtBrl) * 100)
                    : null
                }
              />
              <ShipsNote offer={o} labels={labels} />
              {o.url && (
                <a
                  href={o.url}
                  target="_blank"
                  rel="noopener noreferrer sponsored"
                  className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-emerald-600 hover:underline dark:text-emerald-400"
                >
                  {labels.viewOffer}
                  <ExternalLink className="h-3 w-3" aria-hidden />
                </a>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
