# Pendências do Operador

Criado em: 2026-07-16

---

### [x] [1] Verificar se existe backup ou fork do repositório com o código das Sprints 11-16 — CONCLUÍDO em 2026-07-17

Por quê: Houve perda de arquivos não commitados durante a introdução da governança V2.0. O código das Sprints 11-16 (filtros de busca, comparação de produtos, internacionalização, conectores híbridos, painel de pipeline) foi perdido do working tree do repositório. Precisamos saber se você tem o projeto salvo em outro lugar antes de gastar esforço recriando tudo.

Onde: Qualquer ambiente seu — outro computador, fork no GitHub, pasta de backup na nuvem (Google Drive, Dropbox, iCloud), clone local anterior.

Passo a passo:
1. Verifique se você tem outra cópia do projeto ShopFinder em qualquer lugar (outro computador, pasta de backup, fork no GitHub).
2. Se tiver, abra essa cópia e confirme se ela contém arquivos como `src/components/site/filter-bar.tsx`, `src/app/compare/page.tsx`, `src/contexts/compare-context.tsx`, `packages/integrations/src/connectors/digikey/connector.ts`, ou `messages/pt-BR.json`.
3. Se a cópia tiver esses arquivos, você tem o backup que precisamos.

Como saber que deu certo: Você confirma ter (ou não ter) uma cópia com esses arquivos.

Depois de feito: responda "feito o item 1 — tenho backup em [detalhes do local]" ou "feito o item 1 — não tenho backup".

---

### [x] [2] Criar banco de dados gratuito no Neon (PostgreSQL) — CONCLUÍDO em 2026-07-17

Por quê: A plataforma será publicada na Vercel (ambiente online). A Vercel não suporta banco de dados SQLite em arquivo (cada requisição roda em um ambiente efêmero e perde alterações). Precisamos de um PostgreSQL externo gratuito para o banco de dados em produção.

Onde: https://neon.tech — serviço gratuito de PostgreSQL serverless.

Passo a passo:
1. Acesse https://neon.tech no navegador.
2. Clique em "Sign up" (ou "Get started").
3. Faça login com GitHub ou Google (gratuito, sem cartão de crédito).
4. Aceite os termos e crie sua conta.
5. No painel, clique em "New project".
6. Dê um nome ao projeto (ex.: `shopfinder`).
7. Selecione a região mais próxima (ex.: `AWS South America (São Paulo)` se disponível, senão `AWS US East`).
8. Clique em "Create project".
9. Na página seguinte, você verá uma "Connection string" no formato `postgresql://user:password@ep-xxxxx.region.aws.neon.tech/dbname?sslmode=require`.
10. **Copie essa connection string completa** e cole em um local seguro (gerenciador de senhas, nota criptografada, ou arquivo `.env` local que NÃO será commitado).

Como saber que deu certo: A connection string aparece no painel do Neon no formato `postgresql://...`.

Depois de feito: responda "feito o item 2 — connection string anotada". **NÃO cole a connection string no chat** — apenas confirme que você a salvou em local seguro. O Doer vai instruir onde colocá-la na Vercel na próxima etapa.

---

<!-- Novos itens adicionados abaixo deste comentário, mantendo numeração sequencial. -->
