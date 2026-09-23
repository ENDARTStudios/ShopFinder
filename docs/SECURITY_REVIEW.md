# SECURITY_REVIEW — Protocolo de Revisão de Segurança

> **Fonte canônica:** [`docs/eng/SECURITY.md`](eng/SECURITY.md) (gate de deploy, WAF, rate limiting, TLS/HSTS Full Strict, Zero Trust) + [`SECURITY.md`](../SECURITY.md) na raiz (canais de reporte). Matrizes: [`eng/RBAC.md`](eng/RBAC.md) · [`eng/RLS.md`](eng/RLS.md) · `eng/SECRETS.md`.

## Checklist de revisão (todo PR)

- [ ] **Sem segredo no diff** (gitleaks no CI; review confere valores reais/mascarados)
- [ ] Dado sensível só em server component/API — nada de segredo em client bundle (`NEXT_PUBLIC_` revisado um a um)
- [ ] Queries multi-tenant carregam `storeId` da sessão (nunca do request)
- [ ] Rota admin/mutação atrás de `requirePermissions` (RBAC) — 401/403 corretos
- [ ] Entrada validada com zod; saída sem stack/mensagem crua de Prisma
- [ ] Rota pública nova tem rate limit
- [ ] Cron/webhook fail-closed (Bearer/assinatura obrigatórios; sem credencial = não executa)
- [ ] Dinheiro em minor units; câmbio datado (sem janela de manipulação)
- [ ] CTA externo com `rel="sponsored noopener noreferrer"`
- [ ] Nova dependência: justificativa + lock no commit + Dependabot cobrindo

## Gates automáticos (CI precisa estar verde)

CodeQL (alerts high+ bloqueiam) · gitleaks · npm audit · arch-test · typecheck estrito · integração/E2E.

## Revisão periódica (trimestral)

1. **Matriz RBAC × código** — permissões usadas = matriz documentada.
2. **RLS** — policies do Neon conferidas contra `eng/RLS.md` (flag `rls_enforcement` como segunda camada).
3. **Segredos** — rotação de tokens com idade > 90d; `.env.example` completo.
4. **Headers/CSP** — `CSP_REPORT_ONLY` avançando para enforce (#23).
5. **Cabeças de dependência** — majors pendentes e CVEs (T094/T095 fecharam o backlog; manter zero).

## Reporte de vulnerabilidade

Canais em [`SECURITY.md`](../SECURITY.md) (raiz). Incidente em produção: plano de resposta no `eng/SECURITY.md` + comunicação LGPD quando aplica ([COMPLIANCE.md](COMPLIANCE.md)).
