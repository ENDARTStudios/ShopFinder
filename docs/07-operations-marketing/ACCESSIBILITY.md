# ACCESSIBILITY — Acessibilidade

> Alvo: **WCAG 2.1 AA**. É item fixo do checklist de PR (`AGENTS.md` §4).

## Regras por componente

| Situação           | Regra                                                                                                                |
| ------------------ | -------------------------------------------------------------------------------------------------------------------- |
| Navegação          | Toda funcionalidade operável por teclado; foco **visível** sempre (nunca `outline: none` sem substituto)             |
| Alvos de toque     | ≥ 44px (botões do compare bar, chips de filtro, paginação)                                                           |
| Conteúdo dinâmico  | Mudanças de estado informadas com `aria-live` (ex.: contagem da compare bar) + `role=region` com label               |
| Estado de controle | `aria-pressed` em toggles (densidade grid/lista, in-stock) e segmenteds de sort                                      |
| Tabelas            | `<table>` semântica com `th`/`scope` (specs, compare) — leitores de tela dependem disso                              |
| Preços             | `tabular-nums` + formatação `Intl` (leitor de tela lê corretamente)                                                  |
| Motion             | `prefers-reduced-motion` respeitado — animação de entrada/saída desligável (`docs/02-architecture-design/DESIGN.md`) |
| Contraste          | Texto ≥ 4.5:1 (badges de stock/deal incluídos)                                                                       |
| Imagens            | `alt` descritivo; decorativas `alt=""`                                                                               |

## Padrões já estabelecidos (copiar deles)

- Compare bar (`src/components/compare/compare-bar.tsx`): `aria-live` na contagem, botões ≥ 44px, confirmação no "Limpar tudo"
- Results toolbar (`src/components/site/results-view.tsx`): `aria-pressed` nos modos de densidade
- Specs table (`src/components/product/specs-table.tsx`): tabela semântica

## Como validar

1. Navegar a página só com teclado (Tab/Enter/Esc) — nada inacessível, sem armadilha de foco
2. Axe/Lighthouse a11y no CI quando o job cobrir a rota
3. Leitor de tela numa jornada crítica por release (busca → PDP → compare)
4. Diálogo nativo (`confirm`) aceito em ações destrutivas simples (Limpar tudo) — para fluxos maiores, AlertDialog do shadcn

## Guardrails específicos do projeto

- Skeletons precisam de `aria-busy` no container e o conteúdo real substitui sem perder foco.
- Toasts (sonner) não são o único canal de erro — repetir informação crítica inline no formulário.
