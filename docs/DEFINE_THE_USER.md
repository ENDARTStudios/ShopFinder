# DEFINE_THE_USER — Usuários e Anti-usuários

> Base para decisões de produto: se uma feature não serve uma destas personas, ela não entra. Personas formais: [`eng/PRD.md`](eng/PRD.md) §2.

## Personas primárias

### 1. Comprador pesquisador (persona central)

- **Quem:** entusiasta/maker BR comprando componentes e eletrônicos (ex.: STM32, periféricos); compara antes de comprar.
- **Contexto:** mobile, pressa, desconfia de "too good to be true", já levou frete-surpresa.
- **Precisa:** preço real em BRL com data, frete **quando existe** (nunca estimado), estoque, comparar 2–4 opções lado a lado, histórico de preço para saber se "está caro agora".
- **Não precisa:** vitrine bonita, gamificação, cadastro para pesquisar.

### 2. Comprador recorrente / pro (futuro /pro)

- **Quem:** técnico/pequena oficina que compra com frequência e quer monitorar preço.
- **Precisa:** alertas de preço (cap 20), API pública, densidade de informação (lista), recompra rápida (histórico).
- **Restrição atual:** /pro é landing "em desenvolvimento" — sem promessa de preço/data (T105).

### 3. Admin da loja (interno)

- **Quem:** operador da Store.
- **Precisa:** moderação de reviews (flagged no bell, D1), pipeline dos conectores, sem fricção de RBAC.

## Anti-personas (não otimizar para)

- **Roqueiro de promoção:** caçador de cupom/bug de preço — não construímos alerting sub-minuto nem "arbitragem".
- **Vitrine-only:** usuário que só quer "ver produtos bonitos" — a home é utilidade, não lookbook.
- **Bot/scraper agressivo:** rate limit 30/min na API pública, WAF/Bot Fight ativos.

## Consequências práticas (já aplicadas)

- PDP = hub de **decisão** (T103): preço → histórico honesto → specs → reviews — ordem da dúvida do comprador.
- Veredito de preço só com ≥ 7 dias de dado — pesquisador prefere "ainda não sei" a palpite.
- Densidade grid/lista + filtros na URL (T102/T107): linkável, voltável, compartilhável.
- Personalização cookieless: o pesquisador não abre mão de privacidade por recomendação.

## Como usar

Toda proposta de feature responde: **qual persona, qual dúvida dela some**. Se a resposta for "engajamento genérico", rejeitar.
