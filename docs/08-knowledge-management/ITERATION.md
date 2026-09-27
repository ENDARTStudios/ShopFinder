# ITERATION — Ciclo de Melhoria Contínua

> Como o time transforma execução em aprendizado institucional. Sem retro cerimonial: o ciclo acontece **nos artefatos**.

## O ciclo (a cada tarefa fechada)

1. **Reporte do Doer** com evidências → 2. **Review do Thinker** (APPROVED/REJECTED + highlights) → 3. **Registro**: decisão nova → `DECISOES.md`; lição transversal → [MEMORY.md](MEMORY.md); quirk → memória do agente; bug de família → tarefa sistêmica; marcos → [CHANGELOG.md](CHANGELOG.md); entrada no `worklog.md`.

## Sinais que disparam iteração (watch-list)

| Sinal                                   | Ação                                                                                                                 |
| --------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| Mesmo erro 2× de causas iguais          | Tarefa de **família** (ex.: T108 fechou os traps sqlite de uma vez)                                                  |
| Review repetindo o mesmo comentário     | Virar regra em [RULES.md](../03-development-process/RULES.md) ou lint quando der                                     |
| Brief ambíguo levou a retrabalho        | Ajustar template de brief ([TASK_BREAKING_DOWN.md](../03-development-process/TASK_BREAKING_DOWN.md))                 |
| Docs apontando para arquivo inexistente | Corrigir no PR que mudou (checklist docs do `AGENTS.md`)                                                             |
| Dependência com CVE/major               | Inventário → bump planejado (padrão T094/T095)                                                                       |
| Dev slow / quirk de ambiente            | Receita em [SETUP.md](../03-development-process/SETUP.md)/[DEVELOPMENT.md](../03-development-process/DEVELOPMENT.md) |

## Dívida conhecida (snapshot 2026-09)

- Cobertura subindo 5%/trimestre até 80% por módulo (Codecov gate).
- Filtros de resultados in-memory com `take` 2000 — migrar para o banco se catálogo crescer 10×.
- `CSP_REPORT_ONLY` → enforce (#23).
- TS7 em hold (typescript-eslint ≥ 7.1); PR #11 com o fix pronto.
- Flags a retirar quando 100%: ver catálogo em `docs/02-architecture-design/ARCHITECTURE.md` (remoção via Knip).

## Retros trimestral (leve)

1. Percorrer `worklog.md` do trimestre: o que demorou além do previsto e por quê.
2. Percorrer `PENDENCIAS_OPERADOR.md`: o que travou em decisão/credencial (cobrar com evidência de impacto).
3. Métricas do PRD (conversão, p95, cobertura, webhook error) — rumo certo?
4. Saída: no máximo 3 ajustes de processo, cada um com dono e onde ficou registrado.
