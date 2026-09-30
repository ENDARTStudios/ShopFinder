# Auditoria Jurídica Externa — 2ª rodada (2026-09-30)

> **Procedência:** revisão de seguimento da auditoria de 29/09, conduzida por agente externo a pedido do Operador, sobre main pós-PR #82/#83.
> **Reclassificações:** J-001 (ex-LGPD-01) deixa de ser P0 — canal manual atende o art. 18; falta governança/workflow (P1). J-003, J-004 e J-005 são achados NOVOS confirmados no código e corrigidos no PR `fix/81-j003-j005-webhook-integridade`.
> Encerrados nesta rodada: SEC-01, COOKIE-01, supply-chain, honestidade do COMPLIANCE.md.

---

## Nova auditoria jurídica — ShopFinder

**Base técnica:** `main`, considerando as correções já incorporadas pelos PRs #82 e #83. O PR #82 corrigiu o log de e-mail do webhook e sincronizou o inventário de cookies; o PR #83 corrigiu o ecossistema do Dependabot para Bun. [ShopFinder — repositório](https://github.com/ENDARTStudios/ShopFinder?utm_source=chatgpt.com)

**Critério:** somente fatos verificáveis no código/documentação atual. Não considerei uma obrigação como “implementada” apenas porque existe no documento jurídico.

### Resultado executivo

**A auditoria anterior não deve ser simplesmente encerrada.** O estado atual eliminou alguns achados, mas encontrei **novos problemas objetivos** que não estavam contemplados no Issue #81.

| ID        | Área                                       | Classificação | Estado                                                                |
| --------- | ------------------------------------------ | ------------: | --------------------------------------------------------------------- |
| **J-001** | LGPD — direitos do titular                 |            P1 | Processo manual existe; automação não existe                          |
| **J-002** | LGPD — aceite da Privacidade               |        **P1** | **Confirmado**                                                        |
| **J-003** | Checkout — exposição de e-mail             |        **P1** | **Confirmado — novo**                                                 |
| **J-004** | Checkout/Webhook — valor e itens do pedido |     **P0/P1** | **Confirmado — novo**                                                 |
| **J-005** | Webhook — falha tratada como sucesso       |        **P1** | **Confirmado — novo**                                                 |
| **J-006** | CDC — moeda cobrada × moeda declarada      |            P1 | **Confirmado**                                                        |
| **J-007** | Modelo comercial                           |         P1/P2 | Divergência documental/operacional confirmada                         |
| **J-008** | Cookies/localStorage                       |            P2 | Inventário corrigido; implementação ainda merece ajuste de governança |
| **J-009** | Direitos autorais — imagens                |         P1/P2 | Lacuna de rastreabilidade confirmada                                  |
| **J-010** | Transferências internacionais              |         P1/P2 | Evidência contratual não localizada                                   |
| **J-011** | Encarregado/DPO                            |            P2 | Designação/dispensa não comprovada                                    |
| **J-012** | Observabilidade/Sentry                     |            P2 | Transparência contratual insuficientemente específica                 |

---

# 1. J-001 — Direitos dos titulares

### Situação atual

A auditoria anterior tratava a ausência de um portal automatizado como P0.

**Essa conclusão precisa ser corrigida.**

A LGPD não exige necessariamente um “portal”. O direito pode ser exercido por canal de atendimento. O código/documentação atual declara o canal:

`endart.studios@gmail.com`

e o `COMPLIANCE.md` agora afirma expressamente que o atendimento é **manual enquanto o portal não existir**.

A LGPD assegura, entre outros, confirmação, acesso, correção, eliminação, portabilidade e demais direitos do art. 18; o art. 19 disciplina as formas e prazos de resposta. ([Presidência da República][1])

### Resultado

**Não confirmo mais “violação P0 por ausência de portal”.**

O que permanece objetivamente não comprovado é:

- sistema formal de registro das solicitações;
- workflow de atendimento;
- evidência de SLA;
- mecanismo interno para localizar todos os dados do titular;
- procedimento documentado para correção/eliminação/anonymização;
- controle de exceções de retenção.

**Classificação: P1 de governança operacional**, não P0 exclusivamente pela inexistência do portal.

---

# 2. J-002 — Aceite da Política de Privacidade

**Confirmado.**

O formulário de cadastro apresenta Termos e Privacidade, mas o POST envia:

```text
termsAccepted: true
```

O modelo `User` possui:

```text
termsAcceptedAt
termsVersion
```

mas não possui:

```text
privacyAcceptedAt
privacyVersion
```

E `CURRENT_PRIVACY_VERSION = "2.0"` continua apenas reservado para rastreamento futuro.

Portanto, há uma diferença objetiva entre:

> documento apresentado ao usuário

e

> evidência armazenada do aceite.

### Classificação

**P1 — LGPD/comprovação de transparência e governança.**

O Issue #81 já identifica corretamente este ponto.

---

# 3. J-003 — Endpoint de checkout expõe e-mail do cliente

## Novo achado confirmado

`src/app/api/checkout-status/route.ts` é acessível sem autenticação.

Ele recebe:

```text
session_id
```

e retorna:

```text
status
payment_status
amount_total
currency
customer_email
```

O problema não termina no endpoint.

A própria página:

`/checkout/success?session_id=...`

chama esse endpoint e exibe:

```text
Email: cliente@...
```

Portanto, **qualquer pessoa que possua um `session_id` válido consegue consultar o e-mail associado à sessão**.

O `session_id` também é colocado na URL de sucesso pelo checkout.

### Impacto jurídico/técnico

O e-mail é dado pessoal.

A exposição é desnecessária porque a página de sucesso não precisa receber o e-mail do Stripe para demonstrar o pagamento.

O endpoint deveria, no mínimo:

- não retornar `customer_email`;
- retornar somente os dados necessários à página;
- ou exigir autenticação/vínculo verificável com o pedido.

### Classificação

**P1 — exposição desnecessária de dado pessoal.**

Este achado **não estava no Issue #81**.

---

# 4. J-004 — Webhook reconstrói o pedido com o catálogo atual

## Novo achado mais grave

O checkout cria a sessão Stripe usando o preço existente naquele momento.

Entretanto, quando o Stripe chama:

`src/app/api/webhook/route.ts`

o código **não utiliza os valores efetivamente presentes na sessão Stripe para reconstruir os `OrderItem`s**.

Ele consulta novamente o banco:

```text
product
→ offers
→ orderBy priceMinorUnits asc
→ cheapest
```

e calcula:

```text
unitPrice
lineTotal
subtotal
```

com base no **preço atual do catálogo**.

Isso cria uma janela objetiva:

### Exemplo

1. Produto custa R$ 500 no momento do checkout.
2. Stripe cobra R$ 500.
3. Antes do webhook processar, o catálogo passa a indicar R$ 450.
4. Webhook consulta o catálogo.
5. `OrderItem` pode ser registrado por R$ 450.
6. `grandTotal` vem do Stripe, R$ 500.

Resultado: **o pedido armazenado pode não representar a composição monetária efetivamente contratada/paga.**

Existe ainda o inverso.

Se o preço subir entre checkout e webhook, o pedido poderá registrar valor superior ao efetivamente cobrado.

### Problema adicional

Se um produto desaparecer do catálogo antes do webhook:

```text
if (!product) {
    ... continue;
}
```

o item é simplesmente ignorado.

Se todos forem ignorados:

```text
Nenhum item válido
```

o webhook retorna sucesso.

Isso pode produzir uma transação Stripe paga sem correspondente integral no pedido interno.

### Classificação

**P0/P1 técnico-jurídico.**

Não é apenas uma questão de documentação. Afeta diretamente:

- preço;
- composição do pedido;
- prova da contratação;
- conciliação financeira;
- atendimento;
- reembolso;
- pós-venda;
- prova documental do negócio.

**Esse é o principal novo achado da auditoria.**

---

# 5. J-005 — Falha do webhook pode retornar HTTP 200

O webhook contém:

```text
try {
   ...
} catch (e) {
   console.error(...)
}

return NextResponse.json({ received: true });
```

Ou seja, uma falha na criação do pedido pode ser capturada e, mesmo assim, a rota retornar:

```text
200
```

para o Stripe.

Isso pode impedir o mecanismo normal de retry do provedor.

### Consequência

Há risco de:

**pagamento confirmado → criação do pedido falha → webhook responde sucesso → evento não ser reprocessado automaticamente.**

Isso é particularmente grave em conjunto com J-004.

### Classificação

**P1 — integridade transacional / consumidor / operação.**

---

# 6. J-006 — Moeda cobrada × moeda apresentada

O checkout continua fazendo:

```text
currency = cheapest.priceCurrencyCode
```

e passa essa moeda diretamente ao Stripe.

Não existe conversão obrigatória para BRL nesse fluxo.

Portanto, se a oferta estiver em USD, EUR etc., o Stripe poderá cobrar nessa moeda.

Isso permanece incompatível com a documentação que descreve a experiência como preço em BRL/cotação.

### Classificação

**P1 — CDC/transparência comercial.**

O problema não é utilizar moeda estrangeira em si.

O problema é **apresentar uma condição monetária e efetivamente cobrar outra** sem correspondência clara.

---

# 7. J-007 — Modelo comercial

Aqui há uma situação mais clara do que na auditoria anterior.

O PRD declara que o produto é uma plataforma de **e-commerce/dropshipping**, com fornecedores invisíveis ao cliente e pedidos repassados após pagamento.

Ao mesmo tempo, os Termos dizem que a ShopFinder pode ser comparadora/intermediadora e atribuem ao fornecedor responsabilidades pelo produto, entrega e pós-venda.

O código:

- cria Checkout Session própria;
- recebe o pagamento através do Stripe;
- cria Customer;
- cria Order;
- mantém endereço;
- mantém itens;
- registra pagamento;
- possui fluxo de cancelamento/reembolso.

### Conclusão

Existe uma **inconsistência material entre o modelo operacional documentado e a arquitetura jurídica dos Termos**.

Não é possível concluir somente pelo código que a END ART Studios seja juridicamente a vendedora em todas as operações.

Mas também não é mais adequado tratar o fluxo como mero comparador/redirecionador.

**A classificação do papel jurídico da ShopFinder precisa ser formalizada antes do fechamento dos Termos.**

---

# 8. J-008 — Cookies e armazenamento local

### O que foi corrigido

O inventário jurídico agora contempla:

- `shopfinder:history:views`
- `shopfinder:history:searches`
- `shopfinder:results-view`
- `sidebar_state`
- `sf:cookie-consent`

Isso elimina o achado anterior de inventário incompleto.

### O que permanece

O código possui múltiplos mecanismos de armazenamento:

- carrinho;
- comparação;
- histórico;
- preferências;
- notificações;
- moeda;
- idioma;
- cookie `locale`;
- consentimento.

A política atual já descreve a maior parte deles.

Portanto:

**COOKIE-01: encerrado.**

Não o considero novamente um achado material.

Há apenas uma questão de governança P2: o componente `CookiePreferences` inicia visualmente `preferences = true`, enquanto a especificação jurídica determina estado inicial desativado para categorias opcionais. Como a ativação efetiva das preferências ocorre por funcionalidades escolhidas pelo usuário e não pelo simples carregamento desse componente, **não considero isso, isoladamente, prova de consentimento ilícito**.

---

# 9. J-009 — Direitos autorais sobre imagens

O schema continua:

```text
ProductMedia
- id
- productId
- url
- altText
- position
- isPrimary
```

Não há:

```text
sourceUrl
license
author
licenseUrl
verifiedAt
expirationAt
```

Isso é relevante porque `scripts/import-products.ts` efetivamente importa:

```text
hit.imageUrl
```

de fontes externas para `ProductMedia`.

Portanto existe uma **trilha técnica de ingestão de imagens de terceiros sem uma trilha jurídica equivalente de licença/origem/autorização**.

### Importante

Isso **não prova infração de direitos autorais**.

Prova uma deficiência de governança e auditabilidade da titularidade/licença.

### Classificação

**P1/P2**, dependendo do volume e da origem efetivamente utilizada em produção.

---

# 10. J-010 — Transferências internacionais

A Política de Privacidade fala genericamente em:

- Stripe;
- Vercel;
- Neon;
- IA;
- e-mail;
- suporte;
- segurança.

Mas não há, no repositório auditado, evidência equivalente de:

- entidade jurídica contratada;
- país efetivo;
- papel controlador/operador;
- suboperadores relevantes;
- DPA;
- mecanismo jurídico específico de transferência.

A Resolução ANPD nº 19/2024 exige que a transferência internacional esteja amparada por hipótese legal e mecanismo válido; quando utilizadas cláusulas-padrão, elas devem ser incorporadas aos instrumentos contratuais conforme o regulamento. A norma também exige transparência sobre forma, duração, finalidade, destino, agentes e salvaguardas. ([Serviços e Informações do Brasil][2])

### Resultado

Não afirmo que exista transferência ilícita.

A conclusão auditável é:

> **não há evidência documental suficiente no repositório para comprovar o mecanismo utilizado em cada transferência.**

### Classificação

**P1/P2 — documentação/contratos.**

---

# 11. J-011 — Encarregado/DPO

A Política identifica apenas:

```text
endart.studios@gmail.com
```

como canal.

Não encontrei no repositório:

- ato formal de designação;
- nome do encarregado;
- pessoa jurídica encarregada;
- documento formal de dispensa.

A ANPD mantém a possibilidade de dispensa para determinados agentes de tratamento de pequeno porte, mas essa condição depende do enquadramento aplicável; nesse caso, permanece obrigatório um canal de comunicação. ([Serviços e Informações do Brasil][3])

A Resolução CD/ANPD nº 18/2024 atualmente disciplina a atuação do encarregado. ([Serviços e Informações do Brasil][4])

### Resultado

**Não é possível concluir pela obrigatoriedade da nomeação sem confirmar o enquadramento da END ART Studios.**

Mas também não é possível considerar a situação documental encerrada.

### Classificação

**P2 — decisão corporativa/documental.**

---

# 12. J-012 — Sentry/observabilidade

O código efetivamente inicializa Sentry client/server com tracing:

```text
tracesSampleRate
```

e captura exceções.

A Política, entretanto, trata observabilidade genericamente, sem especificar adequadamente:

- entidade jurídica efetivamente contratada;
- localização;
- papel;
- retenção;
- suboperadores;
- mecanismo de transferência.

Isso se conecta diretamente ao J-010.

### Classificação

**P2**, salvo se os contratos e configurações externas comprovarem as informações que faltam no repositório.

---

# Pontos que considero encerrados

### SEC-01

O webhook deixou de registrar o e-mail do cliente no log.

**Encerrado.**

### COOKIE-01

O inventário foi sincronizado com as chaves efetivamente encontradas.

**Encerrado.**

### Supply-chain

PR #82 corrigiu vulnerabilidades do lockfile e PR #83 corrigiu o ecossistema do Dependabot para Bun.

**Encerrado como questão de manutenção de segurança**, não como pendência jurídica.

### Documentação de compliance

O `COMPLIANCE.md` deixou de afirmar que existe um fluxo automatizado de exportação/exclusão que não existe.

**Corrigido.**

---

# Reclassificação final

O Issue #81 precisa ser **atualizado**, porque a auditoria atual encontrou problemas que não estão nele.

### Prioridade imediata

**1. J-004 — Integridade do pedido Stripe/Webhook**
**2. J-005 — Webhook retornando sucesso após falha**
**3. J-003 — Exposição de e-mail pelo `/api/checkout-status`**
**4. J-002 — Registro separado do aceite da Privacidade**
**5. J-006 — Moeda efetivamente cobrada**
**6. J-007 — definição do papel comercial/jurídico**

### Depois

**7. J-001 — formalização do workflow de direitos dos titulares**
**8. J-009 — trilha de licenciamento das imagens**
**9. J-010 — DPAs/transferências internacionais**
**10. J-011 — DPO ou dispensa formal**
**11. J-012 — transparência específica sobre Sentry/processadores**

## Conclusão

**Status atual: NÃO APROVADO PARA FECHAMENTO JURÍDICO.**

A auditoria anterior estava correta quanto aos achados que confirmou, mas **não é suficiente para representar o estado atual**.

O ponto mais relevante descoberto nesta revisão é o conjunto **J-003/J-004/J-005**:

> **o sistema pode expor e-mail de cliente através de um endpoint público e, simultaneamente, reconstruir o pedido com preços do catálogo atual em vez dos valores efetivamente pagos pelo Stripe, além de poder confirmar o recebimento do webhook mesmo quando a criação do pedido falha.**

Isso deve ser tratado **antes** de considerar a camada CDC/comercial e a documentação LGPD encerradas.

A ausência de um portal automatizado de direitos, isoladamente, **não deve mais ser classificada como P0**: o canal manual existe e pode atender aos direitos legais; o problema atual é demonstrar que existe um processo operacional controlado e auditável. A LGPD prevê os direitos e os respectivos procedimentos/prazos, não uma obrigação específica de portal web. ([Presidência da República][1])

**Base normativa verificada:** LGPD e regulamentações atuais da ANPD, incluindo transferência internacional, encarregado e comunicação de incidentes. Para incidentes relevantes, a regulamentação da ANPD estabelece prazo de 3 dias úteis para comunicação nas hipóteses aplicáveis. ([Serviços e Informações do Brasil][2])

[1]: https://planalto.gov.br/ccivil_03/_ato2015-2018/2018/lei/l13709.htm?utm_source=chatgpt.com "L13709"
[2]: https://www.gov.br/anpd/pt-br/acesso-a-informacao/institucional/atos-normativos/regulamentacoes_anpd/resolucao-cd-anpd-no-19-de-23-de-agosto-de-2024?utm_source=chatgpt.com "Resolução CD/ANPD nº 19, de 23 de agosto de 2024"
[3]: https://www.gov.br/anpd/pt-br/acesso-a-informacao/institucional/atos-normativos/regulamentacoes_anpd/resolucao-cd-anpd-no-2-de-27-de-janeiro-de-2022?utm_source=chatgpt.com "Resolução CD/ANPD nº 2, de 27 de janeiro de 2022"
[4]: https://www.gov.br/anpd/pt-br/acesso-a-informacao/institucional/atos-normativos/regulamentacoes_anpd/encarregado-completo_ocultado.pdf?utm_source=chatgpt.com "DIÁRIO OFICIAL DA UNIÃO - Seção 1"
