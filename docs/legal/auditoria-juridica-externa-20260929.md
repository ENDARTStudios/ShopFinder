# Auditoria Jurídica Externa — 2026-09-29

> **Procedência:** auditoria conduzida por agente externo a pedido do Operador (29/09/2026), sobre o HEAD `4e2f225` da main.
> **Verificação interna (30/09):** todos os achados objetivos foram CONFIRMADOS no código: SEC-01 (`src/app/api/webhook/route.ts:55`), COOKIE-01 (`shopfinder:history:*`, `shopfinder:results-view` em `results-view.tsx:56`, `sidebar_state` em `sidebar.tsx:23` fora do inventário), CDC-02 (`checkout-session/route.ts:44-56` usa `priceCurrencyCode` sem conversão BRL), LGPD-01 (sem endpoints de exportação/exclusão), LGPD-02 (registro grava só `termsAcceptedAt`).
> **Ações:** correções objetivas no PR de registro (SEC-01, COOKIE-01, COMPLIANCE.md) + issue de triagem com o plano priorizado. Ver `docs/05-security-compliance/COMPLIANCE.md` e issue de tracking.

---

# Auditoria Jurídica — ShopFinder

**Base auditada:** repositório público `ENDARTStudios/ShopFinder`, branch `main`, HEAD `4e2f2253f690145c784bcb4c9104a13e896e0243`, consultado em **29/09/2026**.
[Repositório ShopFinder](https://github.com/ENDARTStudios/ShopFinder?utm_source=chatgpt.com)

A análise abaixo cruza **implementação efetiva + documentos jurídicos versionados + schema de dados + configurações de segurança + legislação brasileira vigente e atos da ANPD**. Não considerei como implementado aquilo que aparece apenas como intenção documental.

---

## 1. Resultado executivo

| Área                        | Resultado da auditoria                                                                                                   |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| Termos de Uso               | **Adequados com inconsistências operacionais**                                                                           |
| Política de Privacidade     | **Estruturalmente adequada, mas com lacunas de implementação**                                                           |
| LGPD                        | **Parcialmente conforme**                                                                                                |
| Direitos dos titulares      | **Documentados, mas não encontrei implementação correspondente no código**                                               |
| Cookies                     | **Inconsistência comprovada entre política e implementação**                                                             |
| Segurança                   | **Boa estrutura técnica, com pontos jurídicos/documentais pendentes**                                                    |
| Incidentes                  | **Procedimento documental compatível, mas precisa refletir operação real**                                               |
| Transferência internacional | **Tratada genericamente; falta evidência contratual**                                                                    |
| Direitos autorais           | **Proteção da propriedade própria bem definida; governança de conteúdo de terceiros insuficiente**                       |
| Comércio eletrônico/CDC     | **Termos bem estruturados, porém a implementação do checkout não corresponde integralmente ao modelo jurídico descrito** |
| Afiliados                   | **Disclosure Amazon implementado**                                                                                       |
| Encarregado/DPO             | **Canal existente; designação formal não comprovada**                                                                    |

### Achado mais importante

Há uma diferença material entre o que os documentos jurídicos afirmam e o que o código efetivamente implementa, principalmente em:

1. **direitos dos titulares / exportação / exclusão**;
2. **inventário de cookies e armazenamento local**;
3. **aceite da Política de Privacidade**;
4. **modelo jurídico da intermediação/venda**;
5. **governança de imagens e conteúdo de terceiros**.

---

# 2. Termos de Uso

O documento canônico é o `docs/legal/termos-de-uso-v2.md`, versão 2.0, atualizado em 02/09/2026. A versão publicada também está em `messages/*.json`.
[Termos de Uso — fonte canônica](https://github.com/ENDARTStudios/ShopFinder/blob/main/docs/legal/termos-de-uso-v2.md?utm_source=chatgpt.com)

### Pontos juridicamente bem estruturados

Os Termos:

- identificam a operadora e CNPJ;
- estabelecem canal de contato;
- distinguem ShopFinder, fornecedor e conteúdo de terceiros;
- tratam de formação contratual;
- tratam de preço, estoque, câmbio, frete e atualização;
- preservam direitos do consumidor;
- incorporam arrependimento de 7 dias;
- tratam de pagamentos;
- tratam de fornecedores terceiros;
- possuem regras de propriedade intelectual;
- possuem regras para conteúdo gerado pelo usuário;
- tratam de IA;
- incorporam LGPD, Marco Civil e CDC;
- evitam uma renúncia geral de direitos do consumidor;
- preservam foro do domicílio do consumidor.

Isso é compatível, em linhas gerais, com o CDC e com o Decreto nº 7.962/2013, que exigem informação clara sobre fornecedor, produto, preço, condições da oferta, entrega e atendimento. ([Presidência da República][1])

### Achado T-01 — **P1: modelo jurídico do negócio não está perfeitamente alinhado ao código**

Os Termos atuais dizem que:

> o fornecedor indicado na oferta é quem vende, entrega e presta garantia, salvo quando a ShopFinder assumir expressamente essas funções.

Entretanto, o código do checkout efetivamente cria uma **Checkout Session diretamente na Stripe**, e o webhook cria o `Order` dentro do banco da ShopFinder.

[Checkout Stripe — implementação](https://github.com/ENDARTStudios/ShopFinder/blob/main/src/app/api/checkout-session/route.ts?utm_source=chatgpt.com)
[Webhook Stripe — implementação](https://github.com/ENDARTStudios/ShopFinder/blob/main/src/app/api/webhook/route.ts?utm_source=chatgpt.com)

Existe ainda documentação arquitetural anterior que descreve a plataforma como **seller of record**, enquanto os Termos publicados adotam uma estrutura de intermediadora/comparadora.

[ADR de arquitetura comercial](https://github.com/ENDARTStudios/ShopFinder/blob/main/docs/adr/0024-ai-commerce-platform-vision.md?utm_source=chatgpt.com)

**Conclusão auditável:** é necessário escolher juridicamente qual é o papel real da ShopFinder em cada fluxo:

- mera comparadora/redirecionadora;
- intermediadora;
- marketplace;
- ou efetivamente fornecedora/vendedora.

O código atual comprova participação direta no checkout e registro da venda. Os Termos não devem atribuir ao fornecedor responsabilidades que, na operação concreta, possam estar sendo exercidas pela END ART Studios.

---

# 3. LGPD — Política de Privacidade

A Política v2.0 possui 16 seções e cobre:

- controlador;
- dados tratados;
- finalidades;
- bases legais;
- compartilhamentos;
- transferências internacionais;
- cookies;
- retenção;
- segurança;
- incidentes;
- IA;
- direitos dos titulares;
- crianças/adolescentes;
- terceiros;
- alterações;
- contato.

[Política de Privacidade v2.0](https://github.com/ENDARTStudios/ShopFinder/blob/main/docs/legal/politica-de-privacidade-v2.md?utm_source=chatgpt.com)

A estrutura é compatível com os princípios de finalidade, adequação, necessidade, transparência, segurança e responsabilização do art. 6º da LGPD. ([Presidência da República][2])

---

## 4. Achado LGPD-01 — **P0: direitos dos titulares documentados, mas fluxo técnico não comprovado**

A Política declara expressamente que o titular pode solicitar:

- confirmação;
- acesso;
- correção;
- anonimização;
- bloqueio;
- eliminação;
- portabilidade;
- informação sobre compartilhamentos;
- revogação;
- oposição;
- revisão de decisões automatizadas.

Isso está alinhado ao art. 18 da LGPD. ([Presidência da República][2])

Porém, a auditoria do código não encontrou endpoints ou interface correspondente para:

- exportação de dados;
- portabilidade;
- exclusão de conta/dados;
- anonimização;
- correção centralizada;
- gestão formal de solicitações LGPD.

O documento interno `COMPLIANCE.md` afirma:

> “exportação/remoção via fluxo de conta”

mas a busca no código não encontrou esse fluxo.

[COMPLIANCE.md](https://github.com/ENDARTStudios/ShopFinder/blob/main/docs/05-security-compliance/COMPLIANCE.md?utm_source=chatgpt.com)

**Resultado:** há uma inconsistência objetiva entre documentação de compliance e implementação.

O art. 18 garante esses direitos e o art. 19 estabelece mecanismos e prazos para acesso. ([Presidência da República][2])

**Classificação: P0.**

---

# 5. Achado LGPD-02 — **P1: aceite da Política de Privacidade não é armazenado**

O cadastro exige visualmente o aceite simultâneo dos Termos e da Política:

[Tela de registro](https://github.com/ENDARTStudios/ShopFinder/blob/main/src/app/%28auth%29/register/page.tsx?utm_source=chatgpt.com)

Mas o endpoint de registro grava somente:

```text
termsAcceptedAt
termsVersion
```

Não existe `privacyAcceptedAt` nem `privacyVersion` no modelo `User`.

[Endpoint de registro](https://github.com/ENDARTStudios/ShopFinder/blob/main/src/app/api/auth/register/route.ts?utm_source=chatgpt.com)
[Schema User](https://github.com/ENDARTStudios/ShopFinder/blob/main/prisma/schema.prisma?utm_source=chatgpt.com)

Além disso, `CURRENT_PRIVACY_VERSION = "2.0"` está declarado como:

> “Reservado para rastreio futuro”

[Configuração jurídica](https://github.com/ENDARTStudios/ShopFinder/blob/main/src/config/legal.ts?utm_source=chatgpt.com)

Portanto, **o sistema não registra a versão da Política de Privacidade apresentada/aceita no cadastro**, apesar de a interface declarar que o usuário aceita ambos os documentos.

Isso é uma inconsistência concreta de governança e prova do consentimento.

---

# 6. Achado LGPD-03 — **P1: base legal de legítimo interesse está genérica demais**

A Política usa legítimo interesse para diversas finalidades:

- catálogo;
- comparação;
- segurança;
- melhoria;
- recomendações;
- organização;
- análise.

O texto afirma que haverá avaliação de finalidade, necessidade, expectativa razoável, impacto e salvaguardas.

Isso é juridicamente correto como metodologia, mas **não encontrei no repositório um LIA/registro operacional correspondente às operações declaradas**.

A LGPD exige registro das operações, especialmente quando fundamentadas em legítimo interesse. ([Presidência da República][2])

**Conclusão:** a Política descreve o procedimento, mas não há evidência auditável no repositório de que essa documentação exista para cada tratamento relevante.

**Classificação: P1.**

---

# 7. Encarregado / DPO

A Política informa:

> `endart.studios@gmail.com`

como canal de privacidade e diz que o canal funciona para comunicação com o encarregado ou responsável designado.

Entretanto, **não há nome ou identificação formal de uma pessoa jurídica/natural como encarregado**.

A LGPD prevê a indicação do encarregado e divulgação pública de sua identidade e contato. ([Presidência da República][2])

Existe, contudo, uma exceção relevante: agentes de tratamento de pequeno porte podem ser dispensados da indicação formal do encarregado, desde que mantenham canal de comunicação com os titulares. ([Serviços e Informações do Brasil][3])

### Resultado

Não classifico automaticamente como irregularidade porque **não foi comprovado no repositório que a END ART Studios esteja fora do regime de pequeno porte**.

**Status: P1 condicional.**

---

# 8. Cookies — achado objetivo

A Política de Cookies v2.0 possui inventário formal de 12 chaves.

[Política de Cookies v2.0](https://github.com/ENDARTStudios/ShopFinder/blob/main/docs/legal/politica-de-cookies-v2.md?utm_source=chatgpt.com)

Entretanto, a implementação utiliza **mais armazenamento do que o inventário jurídico declara**.

Foram encontrados, entre outros:

- `shopfinder:results-view`;
- `shopfinder:history:views`;
- `shopfinder:history:searches`;
- `sidebar_state`;
- `sf:cookie-consent`.

[Histórico local](https://github.com/ENDARTStudios/ShopFinder/blob/main/src/lib/history.ts?utm_source=chatgpt.com)
[Preferência de visualização](https://github.com/ENDARTStudios/ShopFinder/blob/main/src/components/site/results-view.tsx?utm_source=chatgpt.com)
[Cookie sidebar_state](https://github.com/ENDARTStudios/ShopFinder/blob/main/src/components/ui/sidebar.tsx?utm_source=chatgpt.com)
[Painel de consentimento](https://github.com/ENDARTStudios/ShopFinder/blob/main/src/components/site/cookie-preferences.tsx?utm_source=chatgpt.com)

### Classificação: **P1**

O próprio documento jurídico afirma que o inventário deve refletir a implementação real. Portanto, aqui existe uma divergência documental comprovada.

A ANPD trata cookies e tecnologias semelhantes sob os princípios da LGPD e enfatiza transparência, finalidade, necessidade e controle do titular. ([Serviços e Informações do Brasil][4])

---

# 9. Cookies — segundo problema

O componente `CookiePreferences` começa com:

```text
preferences = true
```

e somente grava a escolha depois que o usuário interage.

Ao mesmo tempo, a política afirma que tecnologias não essenciais somente serão ativadas após manifestação positiva quando o consentimento for necessário.

[CookiePreferences.tsx](https://github.com/ENDARTStudios/ShopFinder/blob/main/src/components/site/cookie-preferences.tsx?utm_source=chatgpt.com)

Há uma distinção jurídica importante:

- uma preferência necessária à funcionalidade solicitada pelo usuário pode ter tratamento próprio;
- uma tecnologia não necessária baseada em consentimento não pode simplesmente ser ativada por padrão.

A própria ANPD recomenda opt-in para cookies baseados em consentimento e rejeição dos não necessários. ([Serviços e Informações do Brasil][5])

**Conclusão:** a arquitetura é defensável para armazenamento estritamente funcional, mas a classificação “preferências” precisa ser corrigida e individualizada. O estado padrão `true` não pode ser usado como autorização genérica para tecnologias não essenciais.

---

# 10. Analytics

O ShopFinder implementa analytics próprio:

- sem cookie;
- sem IP armazenado na tabela;
- sem user-agent armazenado;
- somente `path`, `referrerHost`, `device` e timestamp.

[Analytics endpoint](https://github.com/ENDARTStudios/ShopFinder/blob/main/src/app/api/analytics/track/route.ts?utm_source=chatgpt.com)
[PageViewTracker](https://github.com/ENDARTStudios/ShopFinder/blob/main/src/components/analytics/page-view-tracker.tsx?utm_source=chatgpt.com)

A arquitetura realmente implementa a premissa declarada de **cookieless first-party analytics**.

### Porém

A requisição HTTP chega ao servidor e passa pelo middleware, que também usa IP para rate limiting.

Isso não significa que o banco `AnalyticsPageView` armazene IP — ele não armazena — mas demonstra que a declaração:

> “sem IP”

deve ser interpretada como **“sem armazenamento do IP no analytics”**, e não como ausência absoluta de tratamento técnico do IP durante a requisição.

A Política de Privacidade já declara IP como dado técnico, portanto existe coerência suficiente nesse ponto.

---

# 11. Sentry / observabilidade

Existe Sentry client-side e server-side.

[Sentry client](https://github.com/ENDARTStudios/ShopFinder/blob/main/src/sentry.client.config.ts?utm_source=chatgpt.com)
[Sentry server](https://github.com/ENDARTStudios/ShopFinder/blob/main/src/sentry.server.config.ts?utm_source=chatgpt.com)

O Sentry é inicializado com `tracesSampleRate`, e o sistema possui encaminhamento de exceções.

Isso é relevante porque **Sentry é um destinatário potencial de dados técnicos e possivelmente pessoais**, mas a Política somente o agrupa genericamente em:

> “provedores de e-mail, suporte e observabilidade”.

Não há:

- entidade jurídica;
- país;
- categorias específicas;
- retenção;
- mecanismo internacional;
- contrato/DPA;
- suboperadores.

A Política reconhece genericamente que prestadores podem estar fora do Brasil, mas também diz que os mecanismos concretos devem refletir os contratos vigentes.

**Classificação: P1 documental/contratual.**

---

# 12. Transferência internacional

A Política possui seção específica e cita corretamente a necessidade de enquadramento em hipótese válida da LGPD.

[Seção de transferências internacionais](https://github.com/ENDARTStudios/ShopFinder/blob/main/docs/legal/politica-de-privacidade-v2.md?utm_source=chatgpt.com#6-transferências-internacionais)

A LGPD estabelece hipóteses específicas para transferência internacional no art. 33. ([Presidência da República][2])

Entretanto, a Política diz que Stripe, Vercel, Neon, IA, e-mail etc. **podem** estar envolvidos, sem identificar efetivamente:

- entidade contratada;
- país;
- mecanismo utilizado;
- suboperador;
- contrato aplicável.

Isso não pode ser tratado como plenamente auditado somente pela redação da Política.

**Classificação: P1.**

---

# 13. Segurança

A arquitetura técnica apresenta controles relevantes:

- HSTS;
- `X-Content-Type-Options`;
- `X-Frame-Options`;
- CSP;
- nonce;
- `frame-ancestors`;
- `object-src none`;
- rate limiting;
- NextAuth;
- bcrypt;
- MFA para administração;
- segregação de permissões;
- webhook Stripe com assinatura;
- idempotência;
- tratamento de segredos via variáveis de ambiente.

[Middleware de segurança](https://github.com/ENDARTStudios/ShopFinder/blob/main/src/middleware.ts?utm_source=chatgpt.com)
[Configuração CSP](https://github.com/ENDARTStudios/ShopFinder/blob/main/src/lib/csp.ts?utm_source=chatgpt.com)
[Configuração Next.js/headers](https://github.com/ENDARTStudios/ShopFinder/blob/main/next.config.ts?utm_source=chatgpt.com)

A LGPD exige medidas técnicas e administrativas compatíveis com o risco e desde a concepção do produto. ([Presidência da República][2])

### Achado SEC-01 — **P1**

O webhook registra no log:

```text
email
customer
order number
```

O código contém explicitamente:

```text
console.info("[webhook] customer", { email, criado: !existingCustomer });
```

[Webhook Stripe](https://github.com/ENDARTStudios/ShopFinder/blob/main/src/app/api/webhook/route.ts?utm_source=chatgpt.com)

Isso transforma logs operacionais em **repositório adicional de dados pessoais**.

A Política deveria refletir isso, incluindo:

- finalidade dos logs;
- destinatários;
- retenção;
- controle de acesso;
- eliminação;
- eventual transferência internacional.

---

# 14. Incidentes de segurança

A Política está atualizada ao mencionar a Resolução CD/ANPD nº 15/2024.

A ANPD atualmente informa que a comunicação de incidente que possa acarretar risco ou dano relevante deve ser realizada em **3 dias úteis**, nos termos da regulamentação. ([Serviços e Informações do Brasil][6])

A documentação do ShopFinder prevê comunicação à ANPD e aos titulares.

Portanto:

**Status: adequado documentalmente.**

Não há, porém, como certificar nesta auditoria se o procedimento operacional, contatos internos e registros de incidentes estão realmente funcionando, porque isso depende de documentação operacional não demonstrada no código.

---

# 15. Direitos autorais

A proteção dos ativos próprios está muito bem delimitada.

O `LICENSE` estabelece:

- copyright;
- todos os direitos reservados;
- código proprietário;
- proibição de cópia;
- modificação;
- distribuição;
- sublicenciamento;
- publicação;
- engenharia reversa.

[LICENSE](https://github.com/ENDARTStudios/ShopFinder/blob/main/LICENSE?utm_source=chatgpt.com)
[NOTICE](https://github.com/ENDARTStudios/ShopFinder/blob/main/NOTICE?utm_source=chatgpt.com)

Isso é juridicamente coerente com a Lei nº 9.610/1998: o autor possui direitos patrimoniais exclusivos e determinadas utilizações dependem de autorização prévia e expressa. ([Presidência da República][7])

---

# 16. Achado COPYRIGHT-01 — **P1: conteúdo de terceiros sem trilha jurídica suficiente**

O banco `ProductMedia` possui essencialmente:

```text
url
altText
position
isPrimary
```

Não há campos específicos para:

- titular;
- licença;
- URL da licença;
- autor;
- atribuição;
- origem jurídica;
- data de verificação;
- fundamento de uso;
- expiração da licença.

[Schema ProductMedia](https://github.com/ENDARTStudios/ShopFinder/blob/main/prisma/schema.prisma?utm_source=chatgpt.com)

Isso é particularmente relevante porque o sistema importa imagens de fornecedores e possui integração com fontes externas.

O `COMPLIANCE.md` afirma que existe atribuição, mas o schema não fornece uma estrutura para controlar juridicamente essa atribuição por ativo.

**Conclusão:** não encontrei evidência suficiente no repositório para afirmar que **cada imagem de terceiro exibida está licenciada ou autorizada**.

Não afirmo que exista infração — a auditoria não comprovou isso. O achado é a **ausência de mecanismo verificável de controle de licença**.

---

# 17. Conteúdo gerado pelo usuário

Os Termos concedem à END ART Studios licença:

- não exclusiva;
- mundial;
- gratuita;
- limitada;
- revogável quando juridicamente cabível;
- para hospedagem, armazenamento, reprodução técnica, moderação e exibição.

Isso está adequadamente delimitado e evita uma cessão patrimonial genérica.

[Termos — conteúdo de usuários](https://github.com/ENDARTStudios/ShopFinder/blob/main/docs/legal/termos-de-uso-v2.md?utm_source=chatgpt.com#14-conteúdo-enviado-por-usuários)

**Status: adequado.**

---

# 18. Amazon / publicidade

O código implementa a tag de afiliado Amazon no servidor.

[Amazon Affiliate implementation](https://github.com/ENDARTStudios/ShopFinder/blob/main/src/lib/amazon-affiliate.ts?utm_source=chatgpt.com)

Também existe disclosure permanente no footer e na página de produto.

[Footer/disclosure](https://github.com/ENDARTStudios/ShopFinder/blob/main/src/components/site/site-footer.tsx?utm_source=chatgpt.com)

Isso está alinhado ao princípio do CDC de que publicidade deve ser identificável imediatamente. ([Presidência da República][1])

**Status: adequado quanto ao disclosure identificado no código.**

---

# 19. Direito de arrependimento

Os Termos preveem expressamente:

- 7 dias;
- contagem legal;
- cancelamento;
- protocolo;
- restituição;
- comunicação ao fornecedor;
- comunicação ao processador;
- ausência de necessidade de justificar.

O CDC estabelece o prazo de 7 dias para contratações fora do estabelecimento comercial. ([Presidência da República][8])

**Status documental: adequado.**

### Mas existe uma ressalva técnica

O código de checkout atualmente não demonstra um fluxo completo de:

- endereço de entrega capturado antes da cobrança;
- fornecedor responsável;
- fulfillment;
- cálculo de frete;
- cancelamento;
- refund Stripe;
- encaminhamento automatizado ao fornecedor.

Portanto, os Termos descrevem uma operação **mais completa que a implementação comprovada no HEAD auditado**.

---

# 20. Ponto crítico do checkout

Há uma inconsistência concreta no valor monetário.

O checkout seleciona a oferta mais barata e usa:

```text
priceCurrencyCode
```

diretamente para o Stripe.

Não existe, nesse endpoint, conversão obrigatória para BRL, apesar de os Termos e a interface apresentarem BRL como moeda prioritária.

[Checkout-session route](https://github.com/ENDARTStudios/ShopFinder/blob/main/src/app/api/checkout-session/route.ts?utm_source=chatgpt.com)

O próprio sistema possui infraestrutura de conversão USD/BRL, mas o checkout mostrado não utiliza essa conversão.

**Classificação jurídica: P1**, porque pode afetar:

- informação de preço;
- transparência da oferta;
- formação contratual;
- correspondência entre preço exibido e preço efetivamente cobrado.

O CDC exige informação correta, clara, precisa e ostensiva sobre preço, e o Decreto nº 7.962/2013 exige discriminação das despesas e condições da oferta. ([Presidência da República][1])

---

# 21. Síntese dos achados

| ID            | Área                                                                               |          Gravidade | Evidência                                   |
| ------------- | ---------------------------------------------------------------------------------- | -----------------: | ------------------------------------------- |
| **LGPD-01**   | Direitos dos titulares documentados sem fluxo técnico localizado                   |             **P0** | Política + COMPLIANCE vs código             |
| **LGPD-02**   | Aceite da Privacidade não possui versão/data própria no `User`                     |             **P1** | Registro grava somente Terms                |
| **LGPD-03**   | Legitimate Interest sem LIA/registro operacional comprovado                        |             **P1** | Política vs ausência de documentação        |
| **COOKIE-01** | Inventário não corresponde ao armazenamento real                                   |             **P1** | `sidebar_state`, history, results-view etc. |
| **COOKIE-02** | Preferências iniciam habilitadas                                                   |             **P1** | `CookiePreferences`                         |
| **PRIV-01**   | Sentry/logs não estão suficientemente especificados                                |             **P1** | código + Política                           |
| **TRANS-01**  | Transferências internacionais descritas genericamente                              |             **P1** | Política                                    |
| **SEC-01**    | Logs contêm e-mail de cliente                                                      |             **P1** | webhook                                     |
| **COPY-01**   | Não existe trilha estruturada de licença por imagem                                |             **P1** | `ProductMedia`                              |
| **CDC-01**    | Checkout efetivo não corresponde integralmente ao modelo jurídico da intermediação |             **P1** | Terms vs checkout/webhook                   |
| **CDC-02**    | Fluxo de checkout não demonstra integralmente BRL conforme política/oferta         |             **P1** | checkout                                    |
| **DPO-01**    | Encarregado não identificado nominalmente                                          | **P1 condicional** | Política + LGPD/Res. ANPD                   |

---

# 22. O que está efetivamente sólido

Não encontrei fundamento para classificar como problema, no estado auditado:

- inexistência de Termos;
- inexistência de Política de Privacidade;
- ausência de Política de Cookies;
- ausência de canal de privacidade;
- venda de dados pessoais;
- analytics de terceiros identificado no código;
- publicidade comportamental identificada;
- ausência de disclosure Amazon;
- ausência de controles básicos de segurança;
- tentativa de eliminar direitos do consumidor por contrato;
- exclusão contratual genérica de responsabilidade por atos próprios;
- renúncia genérica ao direito de arrependimento;
- licença abusivamente ampla sobre conteúdo dos usuários.

Esses pontos estão tratados de forma expressa nos documentos e/ou código.

---

# 23. Conclusão da auditoria

**O ShopFinder possui uma estrutura jurídica documental significativamente mais completa que a média de um projeto em desenvolvimento, mas não está juridicamente fechado para produção comercial sem correções.**

O problema principal **não é falta de Termos ou Política**. É a diferença entre **“o documento diz que existe” e “o sistema realmente executa e registra isso”**.

Os quatro pontos que precisam ser corrigidos antes de considerar o pacote jurídico tecnicamente consistente são:

1. **Implementar o fluxo real de direitos dos titulares** — acesso/exportação/exclusão/correção e respectivos registros.
2. **Corrigir o inventário de cookies/localStorage/sessionStorage** para refletir exatamente o código.
3. **Separar e versionar o aceite dos Termos e da Política de Privacidade**, se ambos continuarem sendo apresentados como aceites contratuais.
4. **Alinhar os Termos ao modelo comercial efetivamente implementado no Stripe/webhook**, principalmente quem é vendedor/fornecedor, quem cobra, quem entrega e quem responde pelo pós-venda.

A LGPD exige transparência, livre acesso, segurança e responsabilização, e o CDC exige coerência entre oferta, publicidade e contratação. ([Presidência da República][2])

**Status jurídico/técnico atual: `NÃO APROVADO PARA FECHAMENTO JURÍDICO` — existem 1 achado P0 e 10 achados P1/condicionais identificáveis no HEAD auditado.**

Sugestão: corrigir primeiro **LGPD-01, LGPD-02, COOKIE-01 e CDC-01/02**; são os pontos em que a divergência entre documentação e implementação é objetivamente demonstrável.

[1]: https://www.planalto.gov.br/ccivil_03/leis/l8078compilado.htm?ltclid=undefined&ponto=&s=p%C3%B3s-venda&utm_source=chatgpt.com "L8078compilado"
[2]: https://planalto.gov.br/ccivil_03/_ato2015-2018/2018/lei/L13709.htm "L13709"
[3]: https://www.gov.br/anpd/pt-br/acesso-a-informacao/institucional/atos-normativos/regulamentacoes_anpd/resolucao-cd-anpd-no-2-de-27-de-janeiro-de-2022?utm_source=chatgpt.com "Resolução CD/ANPD nº 2, de 27 de janeiro de 2022"
[4]: https://www.gov.br/anpd/pt-br/centrais-de-conteudo/materiais-educativos-e-publicacoes/guia_orientativo_cookies_e_protecao_de_dados_pessoais?trk=article-ssr-frontend-pulse_little-text-block&utm_source=chatgpt.com "Guia orientativo Cookies e proteção de dados pessoais"
[5]: https://www.gov.br/anpd/pt-br/assuntos/noticias/anpd-emite-recomendacoes-para-adequacao-da-pratica-de-coleta-de-cookies-do-portal-gov.br?utm_source=chatgpt.com "ANPD emite recomendações para adequação da prática de coleta de cookies do Portal Gov.br"
[6]: https://www.gov.br/anpd/pt-br/canais_atendimento/agente-de-tratamento/comunicado-de-incidente-de-seguranca-cis?utm_source=chatgpt.com "Comunicação de Incidente de Segurança"
[7]: https://planalto.gov.br/ccivil_03/leis/l9610.htm?utm_source=chatgpt.com "L9610"
[8]: https://www.planalto.gov.br/ccivil_03/leis/l8078compilado.htm?ltclid=acad39fc-61b9-4bfb-b2bd-a419efd207b1&mot=undefined&s=entrega&utm_source=chatgpt.com "L8078compilado"
