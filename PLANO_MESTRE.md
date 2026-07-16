# PLANO MESTRE — ShopFinder V0.6.0 → V1.0.0

Gerado a partir do Discovery de 2026-07-16.  
Governança: `PROTOCOLO_MESTRE.md` v2.0.  
Estado inicial: MVP completo (69 testes, 274 arquitetura limpa, 3 conectores híbridos, catálogo demo com 564 produtos).

## O que "pronto" significa (definição do Operador)

1. **Demonstrável** — deploy online, URL pública, catálogo funcional (busca, comparação, detail page, i18n).
2. **Operável com dados reais** — pelo menos 1 conector live (eBay ou DigiKey) gerando produtos no pipeline, com curadoria ativa.
3. **Documentado** — qualquer pessoa sobe, opera e estende a plataforma seguindo a documentação commitada.

---

## Fase 8 — Testes e segurança (completar itens pendentes)

- [ ] **8.1** Rodar `npm audit` e corrigir vulnerabilidades HIGH/CRITICAL.  
  _Verificação:_ `npm audit --audit-level=high` sai com código 0.
- [ ] **8.2** Executar SAST com CodeQL (gratuito para repositórios públicos).  
  _Verificação:_ workflow do GitHub Actions CodeQL passa sem erros ≥ `error`.

---

## Fase 9 — Deploy online (demonstrável)

- [ ] **9.1** Criar conta gratuita na Vercel.  
  _Verificação:_ login bem-sucedido em `https://vercel.com`.
- [ ] **9.2** Conectar repositório e fazer primeiro deploy.  
  _Verificação:_ `curl -sI https://shopfinder-*.vercel.app | head -1` retorna `HTTP/2 200`.
- [ ] **9.3** Configurar variáveis de ambiente no painel da Vercel.  
  _Verificação:_ `curl -s https://shopfinder-*.vercel.app/api/health` retorna JSON `{"status":"ok"}`.
- [ ] **9.4** Verificar catálogo de demo online: busca, detail page, comparação, troca de idioma.  
  _Verificação:_ smoke-test manual dos 9 cenários do `docs/DEMO_CHECKLIST.md` contra a URL de produção, todos passam.

---

## Fase 10 — Ativação de dados reais (operável)

- [ ] **10.1** Obter credenciais do eBay Developer Program (sandbox).  
  _Verificação:_ `EBAY_APP_ID` e `EBAY_CERT_ID` anotados em local seguro.
- [ ] **10.2** Configurar variáveis `EBAY_APP_ID` e `EBAY_CERT_ID` no ambiente de deploy.  
  _Verificação:_ `/api/admin/pipeline/status` mostra eBay `mode: "live"`.
- [ ] **10.3** Executar pipeline com eBay live.  
  _Verificação:_ novos produtos com prefixo `SF-LIVE-` aparecem no catálogo e `/api/admin/pipeline/status` registra execução bem-sucedida.
- [ ] **10.4** Validar curadoria com dados reais: revisar, publicar, arquivar.  
  _Verificação:_ dashboard `/admin` mostra produtos do eBay nos estados corretos; API pública retorna apenas `status: "published"`.

---

## Fase 11 — Documentação final (documentado)

- [ ] **11.1** Validar `docs/DEPLOY.md` executando o passo a passo do zero em ambiente limpo.  
  _Verificação:_ novo deploy sobe sem erros seguindo apenas o documento.
- [ ] **11.2** Validar `docs/operator-guide.md` com um operador de teste (pode ser o próprio Operador).  
  _Verificação:_ operador executa todas as ações (publicar, revisar, arquivar) sem perguntar ao Doer.
- [ ] **11.3** Validar `docs/engineer-guide.md` adicionando um conector dummy.  
  _Verificação:_ novo conector fake aparece no pipeline status sem quebrar nada.
- [ ] **11.4** Atualizar `docs/credentials-guide.md` com aprendizados da ativação real do eBay.  
  _Verificação:_ documento reflete o processo real, não apenas a teoria.

---

## Fase 12 — Entrega (Seção 9 do protocolo)

- [ ] **12.1** Operador acessa a URL de produção e confirma "está no ar".  
  _Verificação:_ resposta do Operador registrada em `DECISOES.md`.
- [ ] **12.2** `MANUAL_DO_OPERADOR.md` atualizado com: como saber se está no ar, o que fazer se parar, como pedir alteração.  
  _Verificação:_ arquivo existe e contém as 3 seções.
- [ ] **12.3** `PENDENCIAS_OPERADOR.md` vazio — todas as ações manuais resolvidas ou documentadas.  
  _Verificação:_ `wc -l PENDENCIAS_OPERADOR.md` ≤ 3 (só cabeçalho).
