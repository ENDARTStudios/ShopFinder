# ANALYTICS — Métricas e Personalização

> Postura do produto: **privacy-first, sem identificadores**. Nenhum tracker de terceiros.

## O que coletamos

| Sinal                                               | Mecanismo                                                                     | Onde vive            |
| --------------------------------------------------- | ----------------------------------------------------------------------------- | -------------------- |
| Page views                                          | `AnalyticsPageView` (server-side, modelo próprio)                             | Postgres             |
| Termos buscados / produtos vistos                   | Histórico **local** (localStorage `shopfinder:history:*`, LRU 20, versionado) | Navegador do usuário |
| Preferências (locale, densidade de vista, wishlist) | localStorage/cookie `locale`                                                  | Navegador            |

## Princípios

1. **Sem PII em analytics** — sem emails/nomes em eventos; sem fingerprinting; sem cookies de rastreamento de terceiros.
2. **Personalização cookieless:** "Vistos recentemente" e "Recomendados" derivam do histórico local × catálogo — dados nunca saem do navegador sem ação explícita do usuário.
3. **LGPD by design:** base = execução de contrato/legítimo interesse mínimo; banner de consentimento granular para o que exceder ([COMPLIANCE.md](../05-security-compliance/COMPLIANCE.md)).
4. **Rate/métricas de produto:** conversão checkout, uso de compare, criação de alertas — agregados, sem perfil individual.

## Métricas de produto que importam (PRD §6)

- Conversão checkout ≥ 1.5%
- Uso do compare (adições, conclusões da jornada)
- Alertas criados / disparados
- Engajamento de /guias e API pública

## Ferramentas

- Consulta direta no banco (agregado) + painel admin quando existir
- Referrals de engines de IA (GEO/AIO) visíveis nos headers de referência server-side
- Lighthouse/GSC para aquisição (ver [SEO.md](SEO.md))

## O que NÃO fazer

- ❌ Injetar GA4/GTM/Meta Pixel (mudança dessa postura = decisão do Operador + revisão LGPD + banner)
- ❌ Correlacionar histórico local com identidade sem consentimento explícito
- ❌ Enviar conteúdo de campos de formulário para telemetry
