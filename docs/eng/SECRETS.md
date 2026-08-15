# Secrets Management — Variáveis de Ambiente

## Princípios

1. **Nunca** commit de `.env` (verificado por gitleaks no CI e pre-commit).
2. `.env.example` é o catálogo completo, sem valores reais.
3. Produção: secrets na plataforma de deploy (Vercel) ou cofre; rotação a cada 90 dias para chaves de API.
4. Prefixo `NEXT_PUBLIC_` **somente** para valores públicos (URLs, nome do site). Segredos nunca.

## Catálogo (.env.example)

Ver `.env.example` na raiz — mantido como fonte de verdade. Grupos:

| Grupo | Vars | Ambiente |
|---|---|---|
| Banco/Cache | `DATABASE_URL`, `REDIS_URL`, `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN` | server |
| Auth | `JWT_SECRET`, `NEXTAUTH_SECRET`, `NEXTAUTH_URL` | server |
| Pagamento | `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` | server |
| eBay | `EBAY_APP_ID`, `EBAY_CERT_ID`, `EBAY_CLIENT_ID`, `EBAY_CLIENT_SECRET`, `EBAY_SANDBOX`, `EBAY_FORCE_REPLAY` | server |
| AliExpress | `ALIEXPRESS_API_URL`, `ALIEXPRESS_APP_KEY`, `ALIEXPRESS_APP_SECRET`, `ALIEXPRESS_TRACKING_ID` | server |
| Observabilidade | `SENTRY_DSN`, `LOG_LEVEL` | server |
| App pública | `NEXT_PUBLIC_APP_URL`, `NEXT_PUBLIC_SITE_NAME`, `NEXT_PUBLIC_SITE_URL`, `NEXT_PUBLIC_DEFAULT_LOCALE`, `NEXT_PUBLIC_LOCALES` | client ok |
| Testes | `TEST_BASE_URL` | CI apenas |

## Geração e rotação

```bash
openssl rand -base64 32   # JWT_SECRET / NEXTAUTH_SECRET
```

Rotação do `JWT_SECRET` invalida todas as sessões (aceitável; comunicar janela de manutenção).

## Gates no CI

- `gitleaks` (já ativo em `ci.yml` + pre-commit) — bloqueia PR com segredo.
- Review obrigatória em mudanças que tocam `.env.example` (CODEOWNERS).
