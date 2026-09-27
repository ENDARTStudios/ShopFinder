# SETUP — Ambiente Local

> Pré-requisitos: Git, **Bun** (≥ 1.1), Node LTS (Playwright/CLI tools), conta GitHub com acesso ao repo.

## Passo a passo

```bash
git clone https://github.com/ENDARTStudios/ShopFinder.git
cd ShopFinder
bun install
cp .env.example .env      # preencher valores de staging com o Operador/time
npx prisma generate       # client postgres (com DATABASE_URL no .env)
npm run dev               # http://localhost:3000
```

## Variáveis de ambiente

- Nomes e grupos: `.env.example` (documentadas em [`docs/05-security-compliance/SECRETS.md`](../05-security-compliance/SECRETS.md)).
- **`.env` nunca é commitado** (gitleaks + review).
- O `.env` da máquina aponta para o **Neon de staging remoto** — não é sandbox: nada de drop/seed destrutivo; para isso, container Postgres descartável.
- Chaves que precisam de provisionamento (eBay/DigiKey prod, Telegram, Sentry, TypeSafe) ficam **gated**: sem a chave, a feature desliga limpo.

## Armadilhas conhecidas (todas já custaram horas)

| Sintoma                                            | Causa                                                                                          | Correção                                                                  |
| -------------------------------------------------- | ---------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| Erros P1012/`@db.Date`/`mode:"insensitive"` locais | `bun install` sem `DATABASE_URL` flipa schema p/ sqlite (postinstall `select-prisma-provider`) | `git checkout -- prisma/schema.prisma` → `npx prisma generate` (com .env) |
| `prisma generate` EPERM                            | dev server vivo segurando o client                                                             | matar `node.exe` antes de gerar                                           |
| Página pública 200 com seção client sumida         | `useSession` lança em SSR sem SessionProvider                                                  | `getServerSession` no RSC + prop `isAuthenticated`                        |
| Dados "estranhos" no DB local                      | você está no Neon de staging                                                                   | conferir `DATABASE_URL`; usar container descartável                       |

## Ferramentas recomendadas

- **Graft** (`graft map` / `graft ask`) — orientação no código antes de grep (grafo local do repo)
- **gh CLI** autenticado (issues/PR/CI); sem gh, `git credential fill` fornece token
- **Vercel CLI** (previews/rollback — Operador)
- Playwright (`bunx playwright test`) — sobe dev server sozinho

## Verificação final

```bash
npm run typecheck && npm run lint && npm run test:arch
```

Três verdes = ambiente pronto.
