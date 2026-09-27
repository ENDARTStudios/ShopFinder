# STYLE_GUIDE — Estilo de Código e Copy

> Ferramentas: ESLint 9 + Prettier (husky + lint-staged no commit), commitlint. Este arquivo cobre o que ferramenta não pega.

## Código

- **TypeScript estrito**; zero `any` novo; tipos de contrato em `@workspace/contracts` (zod).
- Nomes: inglês no código; domínio nos termos do negócio (`ProductOffer`, `PriceSnapshot`).
- Componente novo no padrão da pasta em que vive (`src/components/<área>/`); server component por padrão, `"use client"` só quando necessário.
- Comentário só para **restrição que o código não expressa** — nunca "o que a linha faz" nem nota de review.
- Imports respeitando `app → application → domain → shared` (`npm run test:arch`).
- Dinheiro: `priceMinor: bigint` + `currencyCode: string` — formatação só na view via `Intl`.

## Copy (product copy)

- **PT-BR neutro e factual** — utilidade, não hype ("Melhor preço entre 4 fornecedores", nunca "preços incríveis!").
- Claims com prova (CDC art. 37): superlativo só com métrica exibida junto.
- Estado vazio honesto: "Ainda não há avaliações" + CTA discreto; nunca estado fake.
- Tom de erro: o que aconteceu + o que fazer ("Não foi possível salvar. Tente novamente.").
- Em desenvolvimento (páginas /pro): "em desenvolvimento", **sem** promessa de preço/data.

## Convenções tipográficas

- **©** para copyright (nunca "(c)") — inclusive se um brief prescrever o contrário.
- Números/preços com `tabular-nums`; moeda via `Intl.NumberFormat` (produz NBSP — conta com isso em testes).
- Datas por extenso no usuário (`23 de setembro de 2026`), ISO no técnico.

## i18n

- Chaves em `messages/{pt-BR,en,es-ES}.json` — **paridade total** (script de paridade da casa; base pt-BR, reporta ausentes+extras).
- Chave nova em commit inclui os 3 arquivos; sem texto hardcoded em componente.
- Namespace por feature (`compareBar.*`, `pricebox.*`, `results.*`).

## Commits

Conventional Commits + ID da tarefa: `feat: barra sticky de comparacao (T104)`. Assunto no infinitivo, sem ponto final, ≤ 72 chars.
