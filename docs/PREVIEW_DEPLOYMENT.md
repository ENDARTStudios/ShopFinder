# PREVIEW_DEPLOYMENT — Previews da Vercel

> Como funcionam, como validar neles e como não acumular lixo.

## Como funcionam

- Previews nascem do **GitHub App/Vercel Git Integration** ao abrir PR — não dos jobs do CI (CI valida código; Vercel constrói preview paralelamente).
- URL por PR (`<slug>-<hash>-shop-finder-taupe.vercel.app`); env de preview herda do projeto (segredos gated ausentes desligam features limpo — comportamento esperado).
- Proteção de Deployment/SSO pode cobrar login no preview — bypass cabe ao Operador (mesma pendência do P0 de produção).

## O que validar no preview (roteiro por PR)

1. Build passa sem erro/warning novo de lint.
2. Rota(s) tocada(s) renderizam com dados de staging (skeleton → conteúdo; sem soft-404 indevido).
3. Jornada do PR ponta a ponta (ex.: filtrar → comparar → abrir PDP).
4. Console do navegador sem erro novo.
5. Responsivo mobile (persona central é mobile).

## Higiene de deployments (evitar pagar storage)

- **Auto-delete de previews:** Vercel → Settings → Git → "Automatically delete deployments for reverted/merged PRs" (**pendente no console — item aberto do T104 para o Operador**).
- **Workflow de limpeza ativo:** `.github/workflows/cleanup-deployments.yml` (T099) — gated por `vars.CLEANUP_ENABLED` + `VERCEL_TOKEN`; resolve produção antes de deletar (aborta se não identificar); `DRY_RUN` default true. Rodar em rounds e conferir o log antes de confiar nos deletes.

## Regras

- Preview é **descartável**: nada vive só em preview (dado de teste criado lá não é evidência permanente).
- Evidência de validação = screenshot/URL do **preview** anexado ao PR quando o brief pede UI.
- Nunca apontar domínio/custom env para preview.
