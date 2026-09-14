---
name: redteam
description: Executa uma rodada de testes adversariais defensivos contra o projeto atual (esta aplicacao, seus endpoints, sua autenticacao e qualquer agente/LLM embutido). Use antes de deploy, ao fechar fase com item de risco medio/alto no PLANO_MESTRE.md, ou quando o Operador pedir auditoria de seguranca. Nunca mira sistemas de terceiros.
effort: high
---

# /redteam — Teste adversarial defensivo

## Escopo (limite rígido, não negociável)
- Alvo: **somente este projeto**, rodando localmente ou em ambiente de staging próprio. Nunca um sistema de terceiros, nunca um alvo sem autorização explícita do Operador registrada em `DECISOES.md`.
- Objetivo: encontrar fraqueza para corrigir antes do deploy. Todo achado vem acompanhado de uma correção proposta — nunca produz um payload funcional como entregável isolado, sem esse contexto.
- Se a tarefa parecer pedir ataque contra algo fora deste projeto, ou uma lista de exploits sem correção associada: pare, não prossiga, registre em `PENDENCIAS_OPERADOR.md` e aguarde esclarecimento.

## Checklist — AppSec clássico (OWASP Top 10)
Para cada rota/endpoint que recebe entrada externa, verifique e registre o resultado:
- Injecao (SQL, NoSQL, comando de SO) — a query e parametrizada? o input e validado na fronteira?
- XSS — a saida e escapada antes de renderizar?
- CSRF — token sincronizado, `SameSite` configurado?
- SSRF — chamada externa valida o destino antes de buscar?
- Autenticacao quebrada — enumeracao de usuario, forca bruta sem lockout, sessao previsivel?
- Autorizacao quebrada (IDOR) — um usuario consegue acessar recurso de outro trocando um ID?
- Exposicao de dado sensivel — segredo aparece em log, mensagem de erro ou payload de resposta da API?

## Checklist — se o projeto embute um agente/LLM (OWASP Top 10 para LLM, 2025)
- **Prompt Injection (LLM01):** uma entrada de usuario consegue fazer o agente ignorar a instrucao original?
- **Exposicao de informacao sensivel (LLM02):** o agente revela segredo, PII ou dado de outro usuario quando perguntado de forma indireta?
- **Cadeia de suprimentos (LLM03):** dependencias e modelos de terceiros tem procedencia verificada?
- **Tratamento inseguro de saida (LLM05):** a resposta do agente e tratada como dado (escapada) antes de virar HTML/SQL/comando, ou e confiada cegamente?
- **Agencia excessiva (LLM06):** o agente pode executar acao irreversivel sem confirmacao? Se sim, e falha do sandbox/hook (Secao 2 do `PROMPT_DOER_MESTRE.md`), nao so do texto do prompt.
- **Vazamento do system prompt (LLM07):** pedir ao agente para revelar suas instrucoes internas funciona? Lembrete: prompt nunca e controle de seguranca suficiente sozinho — se um segredo depende só de "o prompt diz para não contar", ele ja vazou estruturalmente.
- **Consumo ilimitado (LLM10):** existe rate limit real, ou um usuario pode gerar custo/carga sem limite?

## Formato do relatorio
Para cada achado:
```
### [severidade: baixo|medio|alto|critico] <título curto>
Onde: <arquivo/rota/componente>
Como reproduzir: <passos objetivos que provam a falha, sem payload pronto para uso fora de contexto>
Impacto: <o que se ganha explorando isso>
Correcao proposta: <mudanca concreta>
```

Achado **critico ou alto**: gera uma `TAREFA` de correcao antes de fechar a fase, mesmo que atrase o deploy — registre isso no `PLANO_MESTRE.md`. Achado **medio ou baixo**: registra em `DECISOES.md` e entra no proximo ciclo se nao bloquear o objetivo atual da fase.