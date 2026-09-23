# TASK_BREAKING_DOWN — Como Quebrar Tarefas

> Como o Thinker transforma demanda em briefs T0XX e como o Doer as executa. Origem: `PROMPT_SIMBIOSE_THINKER_DOER.md`, `PROTOCOLO_MESTRE.md`.

## Anatomia de um brief (o que o Thinker emite)

1. **Objetivo** em uma frase + contexto do porquê agora.
2. **Escopo fechado:** o que mexer E a lista "NÃO mexer" (protege trabalho adjacente — ex.: T103 não tocava em /compare).
3. **Critérios de aceite** verificáveis (comportamento esperado por caso).
4. **Validação exigida:** evidências concretas (greps com contagem, screenshots, respostas HTTP, roteiro de prova).
5. **Mensagem de commit literal** quando a tarefa o exige; autorizações explícitas (`--no-verify`, merge direto) quando aplicável.
6. **Campos do relatório** do Doer (formato fixo).

## Regras de quebra

- **Uma incerteza = uma pergunta antes.** Brief ambíguo gera PROPOSTA_DOER, não adivinhação.
- **Vertical fino:** cada tarefa entrega estado do sistema funcionando (feature flag se preciso) — nunca "metade de um fluxo" mergeada.
- **Fronteira de risco separada:** mudança de CI/infra vira tarefa própria (ex.: T104 UI vs T108 CI no mesmo pacote de briefs).
- **Tamanho:** cabe em 1 PR revisável; se não cabe, quebrar por camada ou por tela.
- **Dependência explícita:** tarefa que depende de credencial/decisão do Operador vai para `PENDENCIAS_OPERADOR.md` e NÃO fica na fila do Doer.

## Como o Doer executa

1. Ler brief inteiro; divergência → **PROPOSTA_DOER antes** de codar (nunca silêncio, nunca decisão unilateral).
2. Issue → branch → implementação → validação local com as evidências pedidas.
3. Relatório nos campos definidos + gates: `evidence` · `typecheck` · `lint` · `paridade` (i18n quando aplica) · `ci_green` · `commit`.
4. Thinker revisa → **APPROVED/REJECTED** (com highlights seniores e lições sistêmicas).

## Sinais de que a quebra falhou (re-quebrar)

- PR com mais de ~15 arquivos sem coerência única
- Review exige explicar "por que isso está aqui" mais de uma vez
- Validação exige passo manual não descrito no brief
- Doer precisou inventar escopo (brief não cobriu caso óbvio)
