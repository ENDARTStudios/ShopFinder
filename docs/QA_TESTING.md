# QA_TESTING — QA Funcional e Evidências

> QA manual/semiautomático da casa: **evidência ou não aconteceu**. Checklist de demo: `docs/DEMO_CHECKLIST.md`. Automatizado: [TESTING.md](TESTING.md).

## Roteiro padrão de smoke (pós-deploy/preview)

1. Home carrega com skeleton → conteúdo (sem layout shift violento).
2. Busca header com termo comum (ex.: `i9`, `stm32`) → resultados com preço BRL e NBSP correto.
3. Filtros de resultados: supplier/marca/preço/estoque + sort + densidade — URL reflete estado; reload mantém; voltar funciona (T102/T107).
4. PDP: melhor preço + alternativas; frete **só** quando existir; histórico honesto (veredito ou "acompanhando desde…"); specs; reviews (ou estado vazio com CTA).
5. Compare: adicionar 2–4 itens (barra sticky conta, valida slugs, cap com aviso), comparar, limpar tudo com confirmação (T104).
6. Locale: trocar pt-BR/en/es-ES — chaves novas traduzidas (sem chave crua na tela).
7. Admin (se escopo): bell com flagged; reviews approve/remove.
8. PWA (se escopo): offline em rota pública estática funciona; `/api`, `/conta`, `/admin` nunca cacheados.

## Ferramentas e técnicas

- **Browser-use (GUI black-box)** para cliques/preenchimentos com screenshot por passo — igual usuário, sem pular render.
- **Playwright** para regressão automatizada; quirks: `window.confirm` síncrono trava `evaluate` (try/catch + `getJsDialog`); screenshot com timeout → reabrir aba.
- **Greps de prova** no HTML servido: contar com `grep -o … | wc -l` (não `grep -c` — HTML minificado é 1 linha); lembrar do NBSP (`\xa0`) nos preços e das mensagens i18n embutidas no HTML (filtrar).
- Full-page screenshot com header fixo glitcha — capturar por seções.

## Registro de evidência

- Screenshot/URL/HTTP response anexado ao PR (ou reporte do Doer) com legenda do que prova.
- Falha: passo exato, ambiente (preview/prod), console/network, data — reproduzível ou não, mas sempre registrado.

## Critério de aceite de QA

Zero erro de console novo · jornadas do escopo completas · estados de borda honestos · i18n íntegro · a11y navegável por teclado nas telas tocadas.
