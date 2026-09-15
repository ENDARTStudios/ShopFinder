import type { Metadata } from "next";
import { buildMetadata } from "@workspace/seo/metadata";

export const metadata: Metadata = buildMetadata({
  title: "API pública — ShopFinder para parceiros",
  description: "Consulta read-only do catálogo público (produtos, ofertas e estoque).",
  path: "/api-docs",
  noIndex: true
});

const ENDPOINT = "GET /api/public/v1/products?q=<texto>&limit=<1-50>";

const RESPONSE_SAMPLE = `{
  "count": 1,
  "products": [
    {
      "id": "cmt…",
      "sku": "i9-14900K",
      "slug": "intel-core-i9-14900k",
      "title": "Intel Core i9-14900K",
      "updatedAt": "2026-09-15T12:00:00.000Z",
      "offers": [
        { "provider": "ebay",
          "price": { "amount": 549.99, "currency": "USD" },
          "inventory": 512 }
      ]
    }
  ]
}`;

export default function ApiDocsPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <h1 className="mb-2 text-3xl font-black tracking-tight">API pública v1</h1>
      <p className="mb-8 text-sm text-muted-foreground">
        Consulta read-only do catálogo público para parceiros. Sem autenticação no v1; rate limit
        de 30 requisições/minuto por IP.
      </p>

      <h2 className="mb-2 text-lg font-bold">Endpoint</h2>
      <p className="mb-2 font-mono text-sm">{ENDPOINT}</p>
      <ul className="mb-6 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
        <li>
          <code className="font-mono">q</code> — busca por título ou SKU (opcional; sem q retorna os
          produtos atualizados mais recentemente).
        </li>
        <li>
          <code className="font-mono">limit</code> — 1 a 50 (padrão 20).
        </li>
      </ul>

      <h2 className="mb-2 text-lg font-bold">Exemplo de resposta</h2>
      <pre className="overflow-x-auto rounded-lg border border-border/40 bg-muted/30 p-4 text-xs">
        {RESPONSE_SAMPLE}
      </pre>

      <h2 className="mb-2 mt-8 text-lg font-bold">Regras de uso</h2>
      <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
        <li>Dados agregados de catálogo — sem PII; cite a fonte ShopFinder.</li>
        <li>Cache recomendado no lado do parceiro (dados atualizados por sync de fornecedor).</li>
        <li>Rate limit respeitoso: 30 req/min; para volumes maiores, fale com a gente.</li>
      </ul>
    </div>
  );
}
