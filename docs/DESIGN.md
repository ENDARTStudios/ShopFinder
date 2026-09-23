# DESIGN — Direção Visual e UX

> **Fontes canônicas:** [`docs/eng/FRONTEND-DESIGN.md`](eng/FRONTEND-DESIGN.md) (direção visual/stack de UI) e [`docs/eng/MOTION-SYSTEM.md`](eng/MOTION-SYSTEM.md) (skeleton/lazy/animação — **obrigatório**). Brand legado detalhado: `docs/brand-system.md`, `docs/brand-grid.md`.

## Direção: "Commerce Utility"

Sóbrio, útil, rápido — o site é uma **ferramenta de decisão de compra**, não uma vitrine. Estabelecido em T101 (fundação) e consolidado em T102–T104:

- **Light default** (tema claro por padrão; dark é opt-in)
- Home sem wordmark gigante, sem badges decorativos, sem 3D
- **Semânticas de compra primeiro**: preço, disponibilidade, fornecedor — acima de qualquer elemento estético

## Componentes-chave

| Componente                                           | Papel                                                                                                                     |
| ---------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| `src/components/ui/price.tsx` (`PriceBlock`)         | Preço protagonista com `tabular-nums`, provider label, badges semânticos (stock/deal/best)                                |
| `src/components/layout/header.tsx` (`UtilityHeader`) | Header utilitário com busca persistente → `/produtos?q=`; `Breadcrumbs` exportados daqui                                  |
| `src/components/site/results-view.tsx`               | Toolbar de resultados: sort segmentado, densidade grid/lista, filtros supplier/marca/preço/estoque (URL-state, T102/T107) |
| `src/components/compare/compare-bar.tsx`             | Barra sticky de comparação (T104): thumbnails (máx 3 + "+N"), contagem `aria-live`, "Limpar tudo" com confirmação         |
| `src/components/product/*`                           | PDP como hub de decisão (T103): PriceBox → histórico de preço (sparkline SVG) → specs → reviews                           |

## Regras práticas

1. **Números com `tabular-nums`** — preços e medidas nunca "dançam".
2. **Nunca inventar dado**: frete só aparece se existir `shippingCostMinorUnits`; veredito de preço só com ≥ 7 dias de snapshot; senão, estado neutro honesto.
3. **CTA externo** (fornecedor) só com URL real, sempre `rel="sponsored noopener noreferrer"`.
4. Tela/carregamento novo → seguir `MOTION-SYSTEM.md`: skeleton, lazy loading, animação de entrada/saída, `prefers-reduced-motion` respeitado.
5. Stack: Tailwind v4 (`@theme inline`, `@custom-variant dark`) + componentes shadcn/ui (`@workspace/ui`).
6. Acessibilidade faz parte do design: [ACCESSIBILITY.md](ACCESSIBILITY.md).

## Como manter

Novo padrão visual ou componente recorrente → documentar em `eng/FRONTEND-DESIGN.md`; este resumo muda só quando a **direção** muda (decisão = entrada em `DECISOES.md`).
