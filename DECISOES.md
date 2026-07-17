# Decisões do Projeto

Criado em: 2026-07-16

## 2026-07-16 — Discovery

### 1. O que é o projeto, em uma frase?

Plataforma que coleta, organiza, verifica e entrega informações confiáveis de produtos para decisão de compra.

### 2. Quem vai usar, e mais ou menos quantas pessoas?

- Consumidores que pesquisam antes de comprar hardware/componentes.
- Profissionais de TI, montadores de PC, integradores.
- Operadores de catálogo que supervisionam o pipeline (hoje, o próprio Operador nos testes, mas com potencial para pequenas equipes de e-commerce).
- Escala inicial: pequena (dezenas de usuários internos/teste), com potencial de crescer para milhares de visitantes únicos/mês se for aberto ao público.

### 3. Existe algo parecido hoje que sirva de referência?

Sim:

- **PCPartPicker** — referência para compatibilidade de hardware e comparação de preços entre lojas.
- **Keepa/CamelCamelCamel** — referência para histórico de preços.
- **GSMArena** — referência para especificações técnicas detalhadas e comparativo lado a lado de smartphones.
- **Octopart** — referência para busca de componentes eletrônicos em múltiplos distribuidores.

Nenhum deles faz exatamente o que a ShopFinder propõe (grafo de conhecimento com autoridade por atributo, pipeline de enriquecimento, trilha de evidências).

### 4. Vai ter login? Pagamento? Dado sensível? Upload de arquivo?

- **Login:** Sim, já implementado (NextAuth, RBAC). Essencial para o dashboard do operador.
- **Pagamento:** Não processamos pagamentos. A monetização planejada é via comissão por indicação, APIs, assinatura — mas isso é externo à plataforma.
- **Dado sensível:** Hoje não armazenamos nada sensível de consumidores (sem documentos, saúde, financeiro). Senhas dos operadores são hasheadas com bcrypt (12 rounds). Se no futuro coletarmos dados de usuários finais (ex.: para assinatura), aí entra dado pessoal (email, nome) e possivelmente financeiro (cartão via Stripe — aí o PCI é do Stripe, não nosso).
- **Upload de arquivo:** Hoje não. No futuro, fabricantes/operadores podem enviar datasheets ou imagens de produtos.

**Conclusão:** Hoje temos login e senha (bcrypt). Nada de dado sensível de consumidor, pagamento ou upload. Isso pode mudar com assinatura profissional no futuro.

### 5. Existe prazo?

Não há prazo rígido. O MVP está concluído. O próximo passo é demonstrar a plataforma para validação de mercado. Não há data limite — o foco é qualidade e prontidão para quando surgir a oportunidade de apresentar.

### 6. Já existe nome, domínio ou marca decidida?

- **Nome:** ShopFinder
- **Slogan:** "compra inteligente" (pt-BR) / "smart shopping" (en)
- **Domínio:** Não adquirido ainda. O nome ShopFinder é comum (existem apps com nomes similares). A decisão de adquirir um domínio `.com` ou usar um TLD alternativo (`.app`, `.ai`) ainda não foi tomada.
- **Marca:** Identidade visual completa — logo (lupa emerald sobre slate-900), paleta de cores, tipografia, rodapé "ShopFinder - compra inteligente - V0.6.0 - Copyright © 2026 END ART".

### 7. O que "pronto" significa pra você?

"Pronto" significa três coisas, em ordem:

1. **Demonstrável** — a plataforma está no ar (deploy online), acessível via URL pública, com o catálogo de demonstração (564 produtos) funcionando: busca, comparação, detail page, troca de idioma.
2. **Operável com dados reais** — pelo menos um conector (eBay ou DigiKey) está ativado com credenciais reais, e o pipeline está gerando produtos a partir de dados vivos, com curadoria funcionando (operador analisa, publica, arquiva).
3. **Documentado** — qualquer pessoa com acesso ao repositório consegue: (a) subir a plataforma do zero seguindo o `DEPLOY.md`, (b) operar o dashboard seguindo o `operator-guide.md`, (c) adicionar um novo conector seguindo o `engineer-guide.md`.

Só depois desses três itens eu considero o projeto concluído como produto funcional.

---

## 2026-07-16 — Decisão: usar `bun audit` em vez de `npm audit` na Fase 8.1

Motivo: O projeto usa Bun como gerenciador de pacotes (`bun.lock` commitado, scripts em `package.json` rodam via `bun run`). `npm audit` exige `package-lock.json`, que o npm se recusa a gerar a partir do `bun.lock` (erro `Cannot read properties of null (reading 'matches')`). Forçar geração do lock com `npm install` migraria o projeto para o ecossistema npm, contrariando a decisão arquitetural de usar Bun e possivelmente quebrando o `bun install` idempotente.

`bun audit` consulta o mesmo banco de dados de advisories (GitHub Advisory Database) que `npm audit`, com semântica idêntica para níveis de severidade. A substituição preserva o critério de pronto da OS GOV-004 (zero vulnerabilidades HIGH/CRITICAL) sem custo de migração.

Alternativas consideradas:

1. Gerar `package-lock.json` com `npm install` — rejeitado: introduz segundo lockfile no repo, conflito com `bun.lock`, e `npm install` resinstala todos os pacotes sob outra resolução.
2. Migrar projeto para npm — rejeitado: mudança de arquitetura fora do escopo da Fase 8.
3. Usar `audit-ci` ou similar — rejeitado: adiciona nova dependência para algo que `bun audit` já faz nativamente.

Verificação substituta aceita: `bun audit 2>&1 | tail -5` exibe `No vulnerabilities found` e exit code 0.

---

## 2026-07-16 — Bloqueio técnico pendente de decisão do Thinker: SQLite vs Vercel serverless

**Contexto:** Fase 9 (deploy Vercel) iniciada. Projeto usa SQLite local (`db/custom.db`, 1.1 MB, 64 produtos + 500 bulk). Schema Prisma declara `provider = "sqlite"`.

**Bloqueio:** Vercel serverless functions têm filesystem efêmero — SQLite em arquivo não persiste entre invocações. O deploy funcionaria na primeira requisição, mas qualquer escrita (ex.: rodar pipeline) seria perdida. Não há como manter SQLite em produção na Vercel.

**Evidência técnica:**

- `prisma/schema.prisma` → `provider = "sqlite"`, `url = env("DATABASE_URL")`
- `.env` → `DATABASE_URL=file:/home/z/my-project/db/custom.db`
- Schema já usa 38 ocorrências de tipos compatíveis com PostgreSQL (`Json`, `BigInt`, etc.) — projeto foi desenhado para PostgreSQL em prod (ver `docs/persistence-model.md` ADR-0009), SQLite é só o fallback de dev
- `docker-compose.yml` já declara PostgreSQL 17 + PgBouncer para produção
- `DEPLOY.md` já documenta `DATABASE_URL=postgresql://...` como variável de produção

**Decisão necessária do Thinker (não delegável ao Doer):**

1. Qual provedor de PostgreSQL gratuito usar?
   - **Neon** — serverless Postgres, free tier 0.5 GB storage, branching gratuito, ideal para Vercel
   - **Supabase** — Postgres + auth + storage, free tier 500 MB, pausa após 1 semana inativo
   - **Railway** — Postgres gerenciado, free trial $5 credit, depois $5/mês
2. Quem provisiona o banco?
   - Operador cria conta + copia connection string (manual, item em PENDENCIAS_OPERADOR.md)
   - Doer usa CLI gratuita se existir (Neon tem CLI; Supabase tem CLI)
3. É necessário testar migração para PostgreSQL antes do deploy, ou confiamos no schema compatível + Prisma migrate?
   - Opção A: Doer roda `prisma migrate deploy` localmente contra PostgreSQL (Docker) antes do deploy
   - Opção B: Confia no schema, primeiro `prisma migrate deploy` roda na Vercel build
4. O `bun run scripts/run-pipeline.ts` precisa ser re-executado em produção após a migração para popular o catálogo?

**Ação do Doer enquanto aguarda:**

- Prossegue com tarefa independente: criar `scripts/smoke-test.sh` (cobre 9 cenários do DEMO_CHECKLIST.md)
- Prepara `PENDENCIAS_OPERADOR.md` com 3 itens, deixando `DATABASE_URL` como `{{DECIDIR_PROVEDOR}}` até o Thinker responder
- Não modifica `prisma/schema.prisma` nem `.env` — essa é decisão do Thinker

**Recomendação técnica do Doer (não decisão):** Neon é o melhor casamento com Vercel — ambos serverless, free tier generoso, integração nativa (botão "Connect to Vercel" no painel Neon). CLI existe (`neonctl`) mas provisionamento ainda exige login OAuth do Operador. Recomendação A: Operador cria conta Neon manualmente (mais simples que CLI); Doer adapta schema/provider após decisão.

---

## 2026-07-16 — BLOQUEIO CRÍTICO: Perda de código das Sprints 11-16 do working tree

**Severidade:** Crítica — bloqueia Fase 9 e qualquer progresso futuro até resolução.

**Sintoma:** Ao executar `bash scripts/smoke-test.sh` contra o dev server local na OS GOV-005, 10 de 22 checks falharam. Investigação revelou que rotas inteiras retornam 404:

- `/compare` → 404 (arquivo `src/app/compare/page.tsx` não existe)
- `/api/admin/pipeline/status` → 404 (arquivo não existe)
- `/admin/pipeline` → 404 (arquivo não existe)

**Evidência da perda:**

- `ls src/app/compare/` → `No such file or directory`
- `ls src/app/api/admin/pipeline/` → `No such file or directory`
- `ls src/app/admin/pipeline/` → só existe `layout.tsx` e `page.tsx` (sem `pipeline/`)
- `ls src/contexts/` → `No such file or directory` (CompareContext perdido)
- `ls packages/integrations/src/connectors/` → `No such file or directory` (DigiKey/Amazon/eBay connectors perdidos)
- `ls tests/integration/` → apenas `admin-api.test.ts` e `pipeline.test.ts` (compare, digikey, amazon-ebay, sigv4 perdidos)
- `src/components/site/` → sem `filter-bar.tsx`, `compare-button.tsx`, `notifications-bell.tsx`, `language-selector.tsx`, `header-compare-link.tsx`, `empty-results.tsx`, `product-card-skeleton.tsx`

**Causa raiz (reconstruída via `git reflog`):**

- O `reflog` mostra 22+ entradas `reset: moving to HEAD` para o commit `f00c8db` (pré-Sprint 11)
- O commit `76ada11` (GOV-001) foi feito com `--amend`, reescrevendo o commit `3b83065`
- Todo o trabalho das Sprints 11-16 existia apenas no working tree **não rastreado pelo git**
- Quando os resets para `f00c8db` aconteceram (provavelmente durante resets automáticos do ambiente), o working tree foi restaurado para o estado do commit, sobrescrevendo todos os arquivos não-commitados

**Tentativa de recuperação:**

- `git stash list` → vazio
- `git fsck --lost-found` → 12 dangling commits encontrados, mas nenhum contém os arquivos das Sprints 11-16
- `git reflog --all` → nenhum commit das Sprints 11-16 aparece (confirma que nunca foram commitados)

**Impacto:**

- ~30 arquivos perdidos (componentes, contexts, conectores, testes, rotas)
- Funcionalidades perdidas: FilterBar, CompareContext, /compare page, NotificationsBell, /admin/pipeline, i18n (language-selector), DigiKeyConnector, AmazonConnector, EbayConnector, SigV4 signer, smoke-test, bulk-products generator, bench-search, ~50 testes de integração
- 69 testes passando → caiu para 18 (apenas pipeline + admin-api originais)
- Build ainda funciona (rotas perdidas não são referenciadas em código runtime), mas funcionalidades desapareceram

**Ação do Doer:** Parou a Fase 9. Não pode prosseguir sem orientação do Thinker.

**Decisão necessária do Thinker:**

1. Recriar todo o trabalho perdido? (estimativa: 2-3 sessões para reimplantar Sprints 11-16)
2. Aceitar a perda e seguir com o MVP base (Sprints 1-10 apenas)?
3. Existe fonte externa de verdade (backup, fork, outro ambiente) que o Operador possa ter?

**Recomendação técnica do Doer (não decisão):**

- O `worklog.md` contém o registro detalhado de todas as Sprints 11-16 (cada arquivo criado, cada implementação, cada teste). Pode servir de referência para recriação.
- Antes de recriar, implementar commit-atômico-a-cada-tarefa rigorosamente (Seção 6 item 6 do protocolo) para evitar repetição da perda.

---

## 2026-07-16 — Decisão: Recriar Sprints 11-16 após perda de working tree

Motivo: Arquivos das Sprints 11-16 não foram commitados e foram destruídos por resets do Git durante GOV-001. O `worklog.md` também foi parcialmente afetado — entradas detalhadas das Sprints 10-16 foram perdidas do arquivo, restando apenas o registro até Sprint 8+9. A especificação para recriação vem da OS GOV-005 (instruções B1-B5 detalhadas) + memória de implementação do Doer + código preservado das Sprints 1-10.

Alternativas consideradas:
- Aceitar a perda e seguir com MVP base (Sprints 1-10): rejeitado, pois não atende à definição de "pronto" do Operador (demonstrável com filtros/comparação, operável com conectores).
- Aguardar backup externo: o Operador será consultado via `PENDENCIAS_OPERADOR.md` item [1], mas a recriação começa em paralelo para não atrasar o projeto.
- Recriar imediatamente: escolhido. Compromisso: commits atômicos por tarefa, sem exceção (Seção 6 item 6 do protocolo).

## 2026-07-16 — Decisão: Usar Neon como provedor PostgreSQL gratuito para deploy na Vercel

Motivo: Vercel não suporta SQLite persistente (filesystem efêmero em serverless). Neon é serverless, tem free tier generoso (0.5 GB storage, branching gratuito), e o Prisma já é compatível com PostgreSQL (schema desenhado para isso desde ADR-0009).

Alternativas consideradas:
- Supabase: mais features (auth, storage), mas mais complexo e pausa após 1 semana inativo no free tier.
- Railway: bom, mas free trial limitado a $5 credit (depois $5/mês).
- Neon: escolhido por ser o mais simples e barato (Seção 3.6 do protocolo — entre soluções equivalentes, vence a mais simples). Integração nativa com Vercel (botão "Connect to Vercel").

Decisão sobre provisionamento: Operador cria conta manualmente no painel neon.tech (mais simples que CLI, evita fluxo OAuth). Doer incluirá passo a passo em `PENDENCIAS_OPERADOR.md` item [2].

---

## 2026-07-16 — Decisão do Operador: Licenciamento proprietário (All Rights Reserved)

Origem: Decisão direta do Operador (Seção 1 do `PROTOCOLO_MESTRE.md` — "é o dono do produto").

Conteúdo:
- `LICENSE` criado na raiz do repositório com texto exato definido pelo Operador: Copyright © 2026 END ART Studios, All Rights Reserved. Software proprietário e confidencial. Proibido uso, cópia, modificação, distribuição, sublicenciamento, publicação, engenharia reversa sem permissão escrita prévia do titular.
- `NOTICE` criado na raiz com: nome do projeto (ShopFinder — compra inteligente), titular dos direitos autorais (END ART Studios), e contato comercial para licenciamento (endart.studios@gmail.com).

Motivo: Estabelecer base legal para futuras negociações de licenciamento comercial conforme modelo de negócio da ShopFinder (assinatura profissional, APIs de catálogo). Prática comum em projetos proprietários.

Impacto técnico: Nenhum. Apenas 2 arquivos novos na raiz do repositório. Código permanece sob governança do `PROTOCOLO_MESTRE.md`.

Commit: `87003bd` — `chore: adicionar LICENSE proprietario e NOTICE com contato comercial`.

Verificação: Ambos arquivos em UTF-8, conteúdo conforme especificado pelo Operador, na raiz do repositório.

Status do projeto: Permanece na Fase 9 (Deploy Vercel), aguardando Operador responder aos itens `[1]` (backup externo das Sprints 11-16) e `[2]` (criação do banco Neon) em `PENDENCIAS_OPERADOR.md`.

Doer em espera pela próxima instrução.

---

## 2026-07-17 — Decisão (DEP-001): Provider Prisma dinâmico via select-prisma-provider.ts

Motivo: Prisma não suporta `provider = env("DATABASE_PROVIDER")` nativamente — o campo `provider` em `datasource db {}` deve ser uma string literal. Para suportar SQLite (dev) e PostgreSQL (prod Neon) sem manter dois schemas separados manualmente, criamos um script que reescreve o `provider` em `prisma/schema.prisma` baseado em `DATABASE_URL`.

Implementação:
- `scripts/select-prisma-provider.ts` — lê `DATABASE_URL`, se começa com `postgresql://` ou `postgres://` → `provider = "postgresql"`, senão → `provider = "sqlite"`. Idempotente.
- `package.json` scripts `db:generate`, `db:push`, `db:migrate`, `db:reset` agora chamam `select-prisma-provider.ts` antes do comando Prisma.
- `postinstall` hook chama `select-prisma-provider.ts` após `bun install` (que pode resetar o schema via prisma generate).
- Novo script isolado `db:select-provider` para invocação manual.

Alternativas consideradas:
- Dois arquivos `schema.prisma` + `schema.postgres.prisma` com symlink: rejeitado, frágil e confunde IDE.
- `prisma-multi-tenant`: rejeitado, adiciona dependência para algo que um script de 5 linhas resolve.
- Deixar `provider = "sqlite"` fixo e documentar: rejeitado, quebra o deploy Vercel/Neon automaticamente.

Verificação:
- `npx prisma validate` → exit 0 ✓
- `packages/database/src/client.ts` → `new PrismaClient()` sem URL hardcode (Prisma lê DATABASE_URL do env) ✓
- `scripts/run-pipeline.ts` → sem referência a sqlite/file: ✓
- Teste manual: `DATABASE_URL=postgresql://...` → provider muda para "postgresql"; sem DATABASE_URL → "sqlite" ✓

Risco: baixo. Alteração de configuração, sem impacto funcional. O schema em si não muda — apenas o provider declarado.

---

## 2026-07-17 — Decisão (REC-004): Recriação eBay Connector — Opção A (híbrido com fallback automático)

Motivo: O conector eBay original (Sprint 13) foi perdido no reset do working tree. A Opção A (híbrido com fallback automático) foi escolhida por ser a mais simples (Seção 3.6 do protocolo) e por alinhar com o padrão já estabelecido para outros conectores futuros (DigiKey, Amazon).

Implementação:
- Transport layer criada em `packages/integrations/src/transports/`:
  - `Transport.ts` — interface `Transport`, `TransportRequest`, `TransportResponse`, helper `buildQueryString`
  - `ReplayTransport.ts` — lê fixtures JSON do filesystem, lança `MissingFixtureError` quando arquivo não existe
  - `FetchTransport.ts` — HTTPS real via `fetch` global, 4 estratégias de auth (none/bearer/basic/oauth2-client-credentials), OAuth2 token cached com refresh 60s antes do expiry
- `EbayConnector` em `packages/integrations/src/connectors/ebay/EbayConnector.ts`:
  - Detecta `EBAY_APP_ID` + `EBAY_CERT_ID` (ou aliases `EBAY_CLIENT_ID`/`EBAY_CLIENT_SECRET`) do ambiente
  - Se creds presentes e `EBAY_FORCE_REPLAY=false` → FetchTransport (mode="live") com OAuth2 client-credentials contra sandbox ou production
  - Senão → ReplayTransport (mode="replay") lendo de `fixtures/ebay/`
  - Aceita `transport` injetado para testes
  - Métodos: `searchByKeyword(keyword, opts)`, `getItemDetails(itemId)`, `hasCredentials()`
- Fixture `fixtures/ebay/get_buy_browse_v1_item_summary_search.json` com 4 itens (RTX 3080, IBM Model M, Ryzen 9 5950X, Arduino Uno R3)
- Pipeline `scripts/run-pipeline.ts` instancia `EbayConnector` no início do `main()` e reporta o mode no log
- 6 testes de integração cobrem: fallback replay, force-replay, live mode, aliases, transport injetado, fixture resolution

Alternativas consideradas:
- Opção B (apenas replay, sem FetchTransport): rejeitada — não permitiria ativação live quando credenciais chegarem.
- Opção C (apenas FetchTransport, sem fallback): rejeitada — quebraria sandbox e CI sem credenciais.
- Opção A (híbrido): escolhida — detecta credenciais automaticamente, fallback transparente, ativação live sem mudanças de código.

Verificação:
- `bun test tests/integration/ebay-connector.test.ts` → 6/6 pass, 18 expects
- `bun test tests/integration/` → 47/47 pass (18 originais + 23 compare + 6 ebay), 153 expects
- `bunx next build` → ✓ Compiled successfully
- `bun run test:arch` → 269 arquivos, 0 violações

Risco: baixo. Código isolado em `packages/integrations/`, sem conexão externa ativa no modo replay (default).
