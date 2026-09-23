# AIO — AI Optimization (coordenação)

> **Fonte canônica:** [`docs/eng/SEO-AEO-AIO-GEO.md`](eng/SEO-AEO-AIO-GEO.md). AIO aqui = otimizar a **presença do ShopFinder como fonte para sistemas de IA**, coordenando [SEO.md](SEO.md) + [AEO.md](AEO.md) + [GEO.md](GEO.md). Não confundir com "colocar IA no produto" (esse tópico está no final).

## Objetivo e métrica

Tráfego e citações originados de sistemas de IA — **`ai.*` referrals** + share of voice em respostas generativas.

## Coordenando as três disciplinas

| Camada | Pergunta que responde           | Entrega-chave             |
| ------ | ------------------------------- | ------------------------- |
| SEO    | "quero comprar X"               | Ranchear head + long tail |
| AEO    | "qual o melhor X para Y"        | Featured snippet/PAA      |
| GEO    | perguntas em ChatGPT/Perplexity | Citação com fonte         |

**Regra de ouro compartilhada:** tudo server-side, factual, com dados do dia (snapshot) e claims com prova. Uma página que serve as três é a mesma página — PDP e /compare são os ativos centrais; não criar páginas paralelas por disciplina (risco de duplicação).

## Checklist ao tocar PDP/compare/conteúdo

- [ ] HTML entregue contém specs + preços (sem client-only)
- [ ] JSON-LD Product/Offer/FAQPage válido
- [ ] Resposta direta de 40–60 palavras nas perguntas H2/H3
- [ ] Data de atualização do dado visível (frescor)
- [ ] Sem superlativo sem prova (CDC art. 37)

## IA **no** produto (anti-confusão)

- Claim público de "IA" **só com feature real e visível** — lição T100 (removemos claims de IA do marketing).
- Features de IA planejadas são gated e server-side: painel de conhecimento do produto (flag `product_knowledge_ai`), pré-triagem de reviews (candidato via TypeSafe, exige `TYPESAFE_API_KEY`) — ver [INTEGRATIONS.md](INTEGRATIONS.md).
- Marketing verde ("powered by AI") é **proibido** até a feature existir em produção.
