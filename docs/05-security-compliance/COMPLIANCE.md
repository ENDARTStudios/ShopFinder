# COMPLIANCE — Conformidade Legal

> Documentos legais completos: `docs/legal/` (termos, privacidade, cookies — v2, revisão jurídica T053). Este arquivo é o mapa de obrigações.

## LGPD (Lei 13.709/2018)

- **Base legal:** consentimento (cookie banner v2) + execução de contrato (conta/pedidos).
- **Minimização:** analytics sem identificadores ([ANALYTICS.md](../07-operations-marketing/ANALYTICS.md)); personalização cookieless (histórico em localStorage, sem PII).
- **Direitos do titular (art. 18):** atendimento via canal de privacidade (e-mail na Política). **Canal manual atende os direitos legais** (2ª auditoria, 30/09/2026, J-001: não é exigido portal); pendência de **governança**: registro sistemático das solicitações, SLA e procedimento interno de correção/eliminação — P1. Auditorias: [29/09](../legal/auditoria-juridica-externa-20260929.md) · [30/09](../legal/auditoria-juridica-externa-20260930-rodada2.md).
- **Encarregado (DPO):** canal de privacidade designado; **designação formal nominal pendente** (J-011 — avaliar dispensa por porte de pequeno porte, Res. CD/ANPD nº 2/2022).
- **Cookies:** banner com consentimento granular, versão e registro; política dedicada publicada.
- **Vazamento:** plano de resposta incidente no `docs/05-security-compliance/SECURITY.md` + comunicação à ANPD quando aplicável.

## CDC (Lei 8.078/1990) — publicidade

- **Art. 37:** publicidade enganosa é proibida — todo claim público precisa de prova verificável (aplicado no T100: hero reescrito para claim auditável).
- Preço exibido = preço praticado no link do fornecedor; frete **nunca estimado** (só exibir se `shippingCostMinorUnits` existir).
- Veredito de "preço justo" só com base (≥ 7 dias de snapshot); abaixo disso, estado neutro honesto.

## Copyright

- Símbolo **©** em LICENSE, rodapé e textos (nunca "(c)") — preferência ratificada da casa.
- Conteúdo de fornecedores: título/imagem usados no escopo de indicação/afiliação com atribuição (`rel="sponsored"`).

## Internacional

- Idiomas: pt-BR (default), en, es-ES — **documentos legais canônicos em pt-BR**; páginas legais no app traduzidas via i18n mantendo o mesmo sentido jurídico.
- Moeda exibida em BRL com cotação datada; sem promessa de câmbio.

## Processo

- Mudança em coleta/tratamento de dado → revisar `docs/legal/` no mesmo PR + checklist de compliance no review ([SECURITY_REVIEW.md](SECURITY_REVIEW.md)).
- Revisão jurídica formal a cada mudança de escopo grande (última: T053).
