# RBAC — Matriz de Níveis de Acesso

Implementação: roles em `User.roles` (JSON), resolvidas por `resolvePermissions()` (`@workspace/application`). Middleware protege `/admin/*`; a checagem fina por permissão é feita na rota/página.

## 1. Roles

| Role | Escopo | Descrição |
|---|---|---|
| `superadmin` | Plataforma | Acesso total, cross-store, gestão de feature flags |
| `store_admin` | Store | Administra uma loja (catálogo, pedidos, operação) |
| `integrations_operator` | Store | Opera SyncJobs, credenciais e conectores |
| `support` | Store | Somente leitura de pedidos/clientes (sem dados sensíveis) |
| `customer` | — | Papel implícito de Customer autenticado (wishlist, próprios pedidos) |
| `guest` | — | Sem autenticação: catálogo, compare, checkout |

## 2. Matriz de permissões

Legenda: **F** = full (CRUD), **R** = read, **O** = operação pontual, `—` = sem acesso.

| Recurso / Ação | superadmin | store_admin | integrations_operator | support | customer | guest |
|---|---|---|---|---|---|---|
| Catálogo (produtos/categorias) | F | F | R | R | R | R |
| Preços & ofertas | F | F | R | — | R | R |
| Pedidos (própria loja) | F | F | R | R | — | — |
| Pedidos (outra loja) | F | — | — | — | — | — |
| Próprios pedidos (`/account`) | F | — | — | — | R | — |
| Clientes (PII) | F | R | — | — (sem PII) | — | — |
| Integrações & credenciais | F | F | F | — | — | — |
| SyncJobs / pipeline | F | F | F | R | — | — |
| Usuários & roles | F | O (convite support) | — | — | — | — |
| Feature flags | F | — | — | — | — | — |
| Webhooks admin | F | R | R | — | — | — |
| Checkout/cart | F | — | — | — | O | O |
| Logs & observabilidade | F | R | R | — | — | — |
| Catálogo público, compare, busca | R | R | R | R | R | R |

## 3. Regras de implementação

1. **Negar por padrão**: rotas `/admin/api/*` exigem permissão explícita; sem role → 403.
2. **Isolamento de tenant**: toda query filtrada por `storeId` da sessão; superadmin é a única role que pode cross-store.
3. **Princípio do menor privilégio**: `support` nunca recebe PII (emails, endereços) — serializadores removem campos.
4. Auditoria: mutações admin registram `createdBy`/`updatedBy` (já presentes no schema Prisma).
5. Sessão JWT inclui `roles` + `storeId` (`packages/auth/src/session.ts`); mudança de role exige re-login (curta expiração do JWT).

## 4. Roadmap MFA/Zero Trust

Ver seção Zero Trust em `SECURITY.md`: MFA (TOTP) para roles `superadmin` e `store_admin` como gate de deploy antes de produção.
