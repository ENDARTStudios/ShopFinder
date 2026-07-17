# Manual do Operador — ShopFinder

**Última atualização:** 2026-07-17  
**Versão:** V0.6.0  
**URL de produção:** `<URL_DO_OPERADOR>` (a confirmar)

---

## Como saber se está no ar

1. Acesse a URL de produção no navegador.
2. Você deve ver a landing page do ShopFinder com:
   - Barra de busca no topo
   - Seção de nichos (PC Hardware, Componentes, Consumo)
   - Grid de produtos com preços e marcas
3. Para verificar via linha de comando:
   ```bash
   curl -sI <URL_DO_OPERADOR> | head -1
   # Deve retornar: HTTP/2 200
   ```
4. Para executar o smoke test automatizado:
   ```bash
   DEPLOY_URL=<URL_DO_OPERADOR> bash scripts/smoke-test.sh
   # Deve retornar: "✅ Todos os cenários passaram"
   ```

Se a página não carregar ou estiver vazia, veja "O que fazer se parar de funcionar" abaixo.

---

## O que fazer se parar de funcionar

### Página não carrega (erro 500 ou timeout)

1. Acesse o painel da Vercel: https://vercel.com → seu projeto → "Deployments"
2. Verifique se o último deployment tem status "Ready" (verde)
3. Se houver erro de build, clique no deployment com falha e veja os logs
4. Tente um "Redeploy" (botão no painel da Vercel)

### Página carrega mas não mostra produtos

Significa que o banco de dados Neon está vazio (o seed não rodou). Para popular:

1. No seu computador, defina a `DATABASE_URL` do Neon no `.env`:
   ```
   DATABASE_URL=postgresql://user:pass@ep-xxx.neon.tech/dbname?sslmode=require
   ```
2. Execute o script de setup:
   ```bash
   bash scripts/deploy-setup.sh --seed
   ```
   Isso vai rodar o pipeline (39 produtos enriquecidos) + gerar 500 produtos de demonstração.

### Login admin não funciona

A causa mais provável é `NEXTAUTH_URL` incorreto no painel da Vercel.

1. Acesse o painel da Vercel → seu projeto → "Settings" → "Environment Variables"
2. Verifique que `NEXTAUTH_URL` = `https://<seu-projeto>.vercel.app` (URL exata de produção, sem barra no final)
3. Se precisar corrigir, altere o valor e clique "Redeploy"

### Banco de dados lento ou indisponível

1. Acesse o painel do Neon: https://neon.tech → seu projeto
2. Verifique se o projeto está ativo (Neon pausa projetos inativos no free tier)
3. Se pausado, clique "Resume" — leva alguns segundos
4. Verifique o uso de storage (free tier: 0.5 GB)

---

## Como pedir alteração futura

1. Descreva a alteração desejada em linguagem simples
2. O Thinker vai analisar e emitir uma Ordem de Serviço
3. O Doer vai implementar, testar e fazer o commit
4. O deploy na Vercel é automático (a cada push para `main`, a Vercel rebuilda)

---

## Acessos importantes

| Serviço | URL | O que fazer lá |
|---|---|---|
| Vercel | https://vercel.com | Verificar deployments, configurar env vars, redeploy |
| Neon | https://neon.tech | Verificar banco de dados, resumes se pausado |
| GitHub | (repositório do projeto) | Ver código, histórico de commits |

---

## Credenciais de teste (desenvolvimento)

- **Admin:** `test-admin@shopfinder.test` / `testAdminPass123`
- **Customer:** `test-customer@shopfinder.test` / `testCustomerPass123`

> Estas credenciais existem apenas no banco de desenvolvimento (SQLite local).
> Em produção (Neon), é necessário criar usuários via API de registro ou seed.
