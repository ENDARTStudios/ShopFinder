# Documentação — ShopFinder

> Reorganizada em 8 categorias numeradas (reorg #79, 2026-09). Zero perda de conteúdo: `adr/` e `legal/` preservados como arquivos de referência; fontes fundadas estão mapeadas na tabela de fusões abaixo.

## Estrutura

```
docs/
├── README.md                 ← você está aqui
├── 01-product-discovery/     Produto: personas, PRD, roadmap, legal, pricing
├── 02-architecture-design/   Arquitetura, ADRs, stack, data model, design
├── 03-development-process/   Setup, desenvolvimento, regras, tarefas, testes
├── 04-api-integrations/      API, conteúdo, integrações externas
├── 05-security-compliance/   Segurança: RBAC, RLS, secrets, compliance, IAM
├── 06-devops-deployment/     CI/CD, deploys, review, QA, backup/DR, FinOps
├── 07-operations-marketing/  SEO/AEO/GEO/AIO, performance, a11y, monitoring
├── 08-knowledge-management/  Changelog, memória, onboarding, pesquisa, iteração
├── adr/                      31 ADRs imutáveis (fonte da verdade — ver 02/ADR.md)
└── legal/                    Documentos legais v2 (fonte da verdade — ver 01/LEGAL_TERMS.md)
```

Arquivos de governança na **raiz do repo** (não mover): `AGENTS.md` (processo obrigatório), `AUTONOMO.md` (execução autônoma), `DECISOES.md`, `PENDENCIAS_OPERADOR.md`, `MANUAL_DO_OPERADOR.md`, `SECURITY.md` (reporte de vulnerabilidades), `CHANGELOG.md`, `worklog.md`.

## Índice

### 01-product-discovery

[DEFINE_THE_USER.md](01-product-discovery/DEFINE_THE_USER.md) · [PRD.md](01-product-discovery/PRD.md) · [ROADMAP.md](01-product-discovery/ROADMAP.md) · [PRICING_MONETIZATION.md](01-product-discovery/PRICING_MONETIZATION.md) · [LEGAL_TERMS.md](01-product-discovery/LEGAL_TERMS.md)

### 02-architecture-design

[ARCHITECTURE.md](02-architecture-design/ARCHITECTURE.md) · [ADR.md](02-architecture-design/ADR.md) · [CHOOSE_TECH_STACK.md](02-architecture-design/CHOOSE_TECH_STACK.md) · [DATA_MODEL.md](02-architecture-design/DATA_MODEL.md) · [DESIGN.md](02-architecture-design/DESIGN.md) · [STYLE_GUIDE.md](02-architecture-design/STYLE_GUIDE.md) · [UML.md](02-architecture-design/UML.md) · [GREEN_COMPUTING.md](02-architecture-design/GREEN_COMPUTING.md)

### 03-development-process

[SETUP.md](03-development-process/SETUP.md) · [DEVELOPMENT.md](03-development-process/DEVELOPMENT.md) · [RULES.md](03-development-process/RULES.md) · [TASKS.md](03-development-process/TASKS.md) · [TASK_BREAKING_DOWN.md](03-development-process/TASK_BREAKING_DOWN.md) · [TESTING.md](03-development-process/TESTING.md) · [AGENT-TOOLBELT.md](03-development-process/AGENT-TOOLBELT.md)

### 04-api-integrations

[API.md](04-api-integrations/API.md) · [INTEGRATIONS.md](04-api-integrations/INTEGRATIONS.md) · [CONTENT.md](04-api-integrations/CONTENT.md)

### 05-security-compliance

[SECURITY.md](05-security-compliance/SECURITY.md) · [SECURITY_REVIEW.md](05-security-compliance/SECURITY_REVIEW.md) · [RBAC.md](05-security-compliance/RBAC.md) · [RLS.md](05-security-compliance/RLS.md) · [SECRETS.md](05-security-compliance/SECRETS.md) · [IAM_IGA.md](05-security-compliance/IAM_IGA.md) · [MFA.md](05-security-compliance/MFA.md) · [ZTNA.md](05-security-compliance/ZTNA.md) · [NAC.md](05-security-compliance/NAC.md) · [THREAT_MODELING.md](05-security-compliance/THREAT_MODELING.md) · [INCIDENT_RESPONSE.md](05-security-compliance/INCIDENT_RESPONSE.md) · [VULNERABILITY_DISCLOSURE.md](05-security-compliance/VULNERABILITY_DISCLOSURE.md) · [COMPLIANCE.md](05-security-compliance/COMPLIANCE.md)

### 06-devops-deployment

[CI_CD_PIPELINE.md](06-devops-deployment/CI_CD_PIPELINE.md) · [CODE_REVIEW.md](06-devops-deployment/CODE_REVIEW.md) · [PREVIEW_DEPLOYMENT.md](06-devops-deployment/PREVIEW_DEPLOYMENT.md) · [PRODUCTION_DEPLOY.md](06-devops-deployment/PRODUCTION_DEPLOY.md) · [QA_TESTING.md](06-devops-deployment/QA_TESTING.md) · [BACKUP_DR.md](06-devops-deployment/BACKUP_DR.md) · [FINOPS.md](06-devops-deployment/FINOPS.md)

### 07-operations-marketing

[SEO.md](07-operations-marketing/SEO.md) · [AEO.md](07-operations-marketing/AEO.md) · [GEO.md](07-operations-marketing/GEO.md) · [AIO.md](07-operations-marketing/AIO.md) · [PERFORMANCE.md](07-operations-marketing/PERFORMANCE.md) · [ACCESSIBILITY.md](07-operations-marketing/ACCESSIBILITY.md) · [MONITORING.md](07-operations-marketing/MONITORING.md) · [ERROR_HANDLING.md](07-operations-marketing/ERROR_HANDLING.md) · [ANALYTICS.md](07-operations-marketing/ANALYTICS.md)

### 08-knowledge-management

[ONBOARDING.md](08-knowledge-management/ONBOARDING.md) · [CHANGELOG.md](08-knowledge-management/CHANGELOG.md) · [MEMORY.md](08-knowledge-management/MEMORY.md) · [RESEARCH.md](08-knowledge-management/RESEARCH.md) · [ITERATION.md](08-knowledge-management/ITERATION.md) · [CONTRIBUTING.md](08-knowledge-management/CONTRIBUTING.md) · [CODE_OF_CONDUCT.md](08-knowledge-management/CODE_OF_CONDUCT.md) · [DEPRECATION_POLICY.md](08-knowledge-management/DEPRECATION_POLICY.md)

## Regras de precedência

- ADRs (`adr/`) e documentos legais (`legal/`) são **fonte da verdade** e não mudam depois de aceitos.
- `DECISOES.md` (raiz) registra decisões operacionais datadas.
- Esqueletos marcados `status: esqueleto` são seções a desenvolver — não são spec.

## Mapa de fusões (reorg #79) — onde foi parar o que mudou de lugar

| Antes                                          | Agora                                                                                                                                                                                                                                                                                              |
| ---------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `docs/eng/*` (camada canônica)                 | Movido/fundido nas pastas numeradas (PRD→01, ARCHITECTURE/UML/DESIGN→02, TESTING/AGENT-TOOLBELT→03, SECURITY/RBAC/RLS/SECRETS→05, DR-PLAN→06/BACKUP_DR, OBSERVABILITY→07/MONITORING, SEO-AEO-AIO-GEO→07/SEO+AEO+GEO+AIO, ROADMAP-NOVA-DIRECAO→01/ROADMAP, FRONTEND-DESIGN+MOTION-SYSTEM→02/DESIGN) |
| `docs/DEPLOY.md`                               | 06/PRODUCTION_DEPLOY.md (parte 2)                                                                                                                                                                                                                                                                  |
| `docs/DEMO_CHECKLIST.md`                       | 06/QA_TESTING.md (parte 2)                                                                                                                                                                                                                                                                         |
| `docs/credentials-guide.md`                    | 05/IAM_IGA.md (parte legado)                                                                                                                                                                                                                                                                       |
| `docs/domain.md` + `docs/persistence-model.md` | 02/DATA_MODEL.md                                                                                                                                                                                                                                                                                   |
| `docs/brand-system.md` + `docs/brand-grid.md`  | 02/DESIGN.md                                                                                                                                                                                                                                                                                       |
| `docs/product-vision.md`                       | 01/PRD.md                                                                                                                                                                                                                                                                                          |
| `docs/decisions.md` (índice de ADRs)           | 02/ADR.md                                                                                                                                                                                                                                                                                          |

O histórico completo de cada arquivo fica no git (`git log --follow <caminho>`).

## Ordem de leitura por papel

- **Novo dev/agente:** [ONBOARDING.md](08-knowledge-management/ONBOARDING.md) → `AGENTS.md` (raiz) → [ARCHITECTURE.md](02-architecture-design/ARCHITECTURE.md) → [RULES.md](03-development-process/RULES.md)
- **Reviewer:** [CODE_REVIEW.md](06-devops-deployment/CODE_REVIEW.md) → [RULES.md](03-development-process/RULES.md) → [SECURITY.md](05-security-compliance/SECURITY.md)
- **Operador:** `MANUAL_DO_OPERADOR.md` (raiz) → [PRODUCTION_DEPLOY.md](06-devops-deployment/PRODUCTION_DEPLOY.md) → [MONITORING.md](07-operations-marketing/MONITORING.md) → `PENDENCIAS_OPERADOR.md` (raiz)
