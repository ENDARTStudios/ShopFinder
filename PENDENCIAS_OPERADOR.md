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

---

### [3] Conectar repositório na Vercel e configurar variáveis de ambiente

Por quê: Publicar a plataforma online com o banco de dados Neon.

Onde: https://vercel.com

Passo a passo:
1. Acesse https://vercel.com e clique "Continue with GitHub".
2. Clique "Add New Project" e selecione o repositório ShopFinder.
3. Em "Configure Project", vá em "Environment Variables" e adicione:
   - `DATABASE_URL` → (cole aqui a connection string do Neon que você anotou no item [2])
   - `NEXTAUTH_SECRET` → (abra um terminal no seu computador e rode: `openssl rand -base64 32` — copie o resultado e cole aqui)
   - `NEXTAUTH_URL` → (deixe em branco por enquanto; após o primeiro deploy, volte aqui e preencha com `https://SEU_PROJETO.vercel.app`)
4. Clique "Deploy".
5. Aguarde a conclusão do deploy (1-2 minutos). O build da Vercel vai automaticamente:
   - Selecionar o provider PostgreSQL do Prisma (baseado no `DATABASE_URL`)
   - Gerar o Prisma client
   - Aplicar as migrations no banco Neon
   - Compilar o Next.js
6. Acesse a URL gerada (algo como `https://shopfinder-xxxxx.vercel.app`).
7. Se a página carregar com a busca e produtos, está funcionando. Se aparecer erro, volte aqui e preencha `NEXTAUTH_URL` com a URL gerada, depois clique "Redeploy".

Como saber que deu certo: A landing page carrega com a barra de busca e produtos.

Depois de feito: responda "feito o item 3 — URL é https://..."
