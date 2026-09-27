# CODE_REVIEW — Protocolo de Review

> Como revisamos (papel Thinker) e como preparamos o PR para passar (papel Doer). Checklist base: `AGENTS.md` §4.

## O PR precisa ter

- [ ] Issue referenciada (`Closes #N`)
- [ ] Testes do escopo adicionados/atualizados
- [ ] Sem segredos no diff
- [ ] Docs atualizadas se arquitetura/fluxo mudou (inclui esta pasta `docs/`)
- [ ] UI: skeletons + motion conforme `docs/02-architecture-design/DESIGN.md`
- [ ] Acessibilidade: foco visível, contraste, teclado ([ACCESSIBILITY.md](../07-operations-marketing/ACCESSIBILITY.md))
- [ ] i18n ×3 quando há texto novo
- [ ] Commits Conventional Commits com ID da tarefa; `bun.lock` se `package.json` mudou

## O que o reviewer procura (em ordem)

1. **Correção da regra de negócio** — o PR faz o que a issue pede (não o que o título diz)?
2. **Dinheiro** — minor units, currency, arredondamento, câmbio datado.
3. **Multi-tenant/segurança** — storeId, authZ, dados no server ([SECURITY_REVIEW.md](../05-security-compliance/SECURITY_REVIEW.md)).
4. **Estados de borda** — vazio, carregando (skeleton), erro upstream, `P2002`, cache frio.
5. **Honestidade de UI** — sem dado inventado (frete estimado, veredito sem base) — lição T100/T103.
6. **Manutenibilidade** — nomes, tamanho de componente, duplicação (extrair p/ `@workspace/ui` quando recorrente).
7. **Evidências** — o Doer anexou o que o brief pediu (greps, prints, respostas HTTP); screenshot de UI nova é obrigatório.

## Veredito

- **APPROVED** (com highlights seniores opcionais) ou **REJECTED** com itens acionáveis por arquivo/linha.
- Desvio de brief identificado no review → volta como PROPOSTA_DOER, não se corrige unilateralmente.
- Padrão sistêmico encontrado (ex.: 3× mesmo bug) → virar tarefa de família (como T108 fechou os traps sqlite) + entrada em [MEMORY.md](../08-knowledge-management/MEMORY.md).

## Tamanho/cadência

- PR pequeno e coerente mergeia rápido; PR grande exige quebra.
- "Merge com CI vermelho para não atrasar" **não existe** — nunca merge vermelho.
