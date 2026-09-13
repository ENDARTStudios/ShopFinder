import type { Metadata } from "next";
import { buildMetadata } from "@workspace/seo/metadata";

// Checkout não deve ser indexado (página transacional, sem conteúdo de busca).
export const metadata: Metadata = buildMetadata({
  title: "Finalizar compra",
  description: "Checkout seguro via Stripe.",
  path: "/checkout",
  noIndex: true
});

export default function CheckoutLayout({ children }: { children: React.ReactNode }) {
  return children;
}
