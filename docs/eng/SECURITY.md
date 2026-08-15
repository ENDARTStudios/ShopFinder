# Security Audit — Gate de Deploy, WAF, Rate Limiting, TLS/HSTS e Zero Trust

## 1. Gate de deploy (security audit)

Um PR só deploya quando **todos** os checks passam (branch protection em `main`):

1. `gitleaks` — sem segredos no histórico do PR.
2. `CodeQL` (js/ts) — zero alerts high/critical.
3. `npm audit` / `bun audit` — zero vulns high+ ( Dependabot ativo para bumps).
4. `test:arch` — contrato de arquitetura respeitado.
5. Lint + testes unitários/integração verdes.
6. Review de CODEOWNERS em mudanças de `src/middleware.ts`, `.env.example`, `packages/auth/**`, workflows CI.

Workflow alvo `.github/workflows/security-gate.yml`: job `security-audit` como `required check`.

## 2. WAF + Bot Fight Mode + Rate Limiting

**Edge (Cloudflare na frente da Vercel):**
- WAF managed rules (OWASP core) em modo block para tráfego non-prod; modo count → block após baseline de 2 semanas.
- **Bot Fight Mode**: on (bloqueia bots definitivos; desafio JS para prováveis).
- Exceção de rate-limit para `/api/webhook` (Stripe vem de IPs conhecidos + assinatura HMAC — dupla checagem por prefixo de IP `3.18.12.0/22` etc. ou apenas confiar na assinatura).

**Rate limiting na aplicação** (`src/lib/rate-limit.ts`, Upstash Redis com fallback em memória):

| Rota | Limite |
|---|---|
| `/api/auth/*` (login/register) | 5/min por IP + lockout exponencial |
| `/api/catalog`, busca | 60/min por IP |
| `/api/checkout-session` | 10/min por IP |
| `/api/webhook` | 300/min (idempotência protege) |
| demais `/api/*` | 120/min |

Respostas `429` com `Retry-After`. Apenas `/login`, `/register` e checkout usam desafio (hCaptcha se abuso persistir).

## 3. TLS/SSL + HSTS — Full (Strict)

- Cloudflare SSL/TLS mode: **Full (Strict)** — origin valida com cert emitido (Vercel fornece cert válido; sem "Flexible" jamais).
- HSTS no middleware (implementado neste PR):

```
Strict-Transport-Security: max-age=63072000; includeSubDomains; preload
```

- Headers adicionais implementados: `X-Content-Type-Options`, `X-Frame-Options: DENY`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy` mínima, CSP com nonce no Next (etapa 2).
- Submeter domínio à lista HSTS preload após 2 releases estáveis.

## 4. Zero Trust

1. **IAM/IGA**: roles formais (ver `RBAC.md`), least privilege, revisão trimestral de acessos, `createdBy` auditável.
2. **MFA**: TOTP obrigatório para `superadmin` e `store_admin` antes do go-live (flag `mfa_admin`).
3. **ZTNA**: sem acesso a infra por rede confiança — tudo via SSO/VPN-less (Vercel/Cloudflare Access para dashboards internos).
4. **NAC + microsegmentação**: na Vercel, funções isoladas; banco (Neon) com restrição de IP e conexões SCRAM/TLS; Redis (Upstash) com ACL e TLS. Sem tráfego leste-oeste entre componentes além do necessário.
5. **Endpoints & monitoramento**: Dependabot + CodeQL contínuos, alertas de anomalia (spike 429/5xx) via SLO da observabilidade.

## 5. Checklist de auditoria (recorrente, trimestral)

- [ ] RLS ativa e testada (tentativas cross-store retornam 0 linhas)
- [ ] Rotação de API keys (Stripe, eBay, AliExpress)
- [ ] Revisão de usuários/roles ativos
- [ ] Teste de replay de webhook (idempotência)
- [ ] OWASP ZAP baseline scan no staging
- [ ] Backup/restore drill do banco
