# AEO — Answer Engine Optimization

> **Fonte canônica:** [`docs/07-operations-marketing/SEO.md`](../07-operations-marketing/SEO.md) §AEO. Foco: responder **perguntas diretas** e ganhar featured snippets / People Also Ask.

## Objetivo e métrica

Ser a resposta direta para perguntas do nicho (specs, comparações, "quanto custa", "qual o melhor X para Y") — **featured snippets e PAA capturados**, CTR dessas consultas.

## Instruções

1. **PDP com FAQ estruturada:** seção "Perguntas frequentes" com `FAQPage` JSON-LD; a página pública de FAQ mantém as 8 perguntas canônicas (T068).
2. **Resposta direta primeiro:** 40–60 palavras logo após cada H2/H3 de pergunta; detalhes depois. Snippets cortam no parágrafo direto.
3. **Specs em `<table>` real** (`src/components/product/specs-table.tsx`) — nunca divs simulando tabela; crawlers e answer engines parseiam tabela semântica.
4. **Perguntas reais:** derivar das buscas internas (histórico local agrega termos) e do GSC; revisar a cada ciclo de conteúdo ([CONTENT.md](../04-api-integrations/CONTENT.md)).
5. **Comparações como resposta:** `/compare` com conteúdo comparativo renderizado server-side responde "X vs Y" diretamente.

## Guardrails

- Resposta factual e verificável — mesmas regras de claim do T100 (CDC art. 37): nada de superlativo sem prova.
- Um FAQPage JSON-LD **por página**, sem duplicar as mesmas perguntas em várias URLs (dilui canonical).

## Como medir

GSC (queries em formato pergunta) · posição média das páginas com FAQPage · CTR de snippet.
