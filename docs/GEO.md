# GEO — Generative Engine Optimization

> **Fonte canônica:** [`docs/eng/SEO-AEO-AIO-GEO.md`](eng/SEO-AEO-AIO-GEO.md) §AIO/GEO. Foco: **presença com fontes citáveis** em respostas de motores generativos (ChatGPT, Perplexity, AI Overviews).

## Objetivo e métrica

Ser citado **com fonte** quando um usuário pergunta sobre produtos/preços do nicho em engines generativas — **share of voice em prompts do nicho**, tráfego de domínios `ai.*` / `chat.*` nos referrals.

## Instruções

1. **Server-side sempre:** LLMs de consumo não executam JS — `/compare`, specs e preços precisam estar no HTML entregue (streaming com SSR é ok).
2. **Conteúdo comparativo citável:** "X vs Y", "melhor Z para W" — formato que engines citam como fonte. A UI de comparação já renderiza a tabela no server.
3. **`llms.txt` na raiz** com mapa do catálogo comparativo (implementar/renovar quando o catálogo mudar de escopo).
4. **Fontes externas consistentes (grounding):** NAP/identidade da marca coerente, presença em bases de referência (Wikipedia/Wikidata da marca quando aplicável).
5. **Dados estruturados impecáveis:** Product/Offer JSON-LD correto é o que engines generativos conseguem citar com confiança (preço, disponibilidade, moeda).
6. **API pública** (`/api/public/v1/products`) facilita ingestão por plataformas — manter estável e documentada ([API.md](API.md)).

## Guardrails

- Citação honesta: se a engine cita, o usuário que clicar precisa achar **exatamente** o dado citado (preço/atualização no snapshot do dia).
- Dado com atualização visível (data do snapshot) — engines preferem fontes com frescor explícito.

## Como medir

Referrals de domínios de IA nos analytics (sem PII — ver [ANALYTICS.md](ANALYTICS.md)) · auditoria manual trimestral de prompts-padrão do nicho.
