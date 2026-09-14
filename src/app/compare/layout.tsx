import type { Metadata } from "next";
import { buildMetadata } from "@workspace/seo/metadata";

export const metadata: Metadata = buildMetadata({
  title: "Comparar produtos",
  description:
    "Comparação lado a lado de produtos: especificações com origem, confiança por atributo e ofertas de múltiplos fornecedores.",
  path: "/compare",
  keywords: ["comparar produtos", "comparador", "especificações"]
});

export default function CompareLayout({ children }: { children: React.ReactNode }) {
  return children;
}
