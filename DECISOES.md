# Decisões do Projeto

Criado em: 2026-07-16

## 2026-07-16 — Discovery

### 1. O que é o projeto, em uma frase?

Plataforma que coleta, organiza, verifica e entrega informações confiáveis de produtos para decisão de compra.

### 2. Quem vai usar, e mais ou menos quantas pessoas?

- Consumidores que pesquisam antes de comprar hardware/componentes.
- Profissionais de TI, montadores de PC, integradores.
- Operadores de catálogo que supervisionam o pipeline (hoje, o próprio Operador nos testes, mas com potencial para pequenas equipes de e-commerce).
- Escala inicial: pequena (dezenas de usuários internos/teste), com potencial de crescer para milhares de visitantes únicos/mês se for aberto ao público.

### 3. Existe algo parecido hoje que sirva de referência?

Sim:

- **PCPartPicker** — referência para compatibilidade de hardware e comparação de preços entre lojas.
- **Keepa/CamelCamelCamel** — referência para histórico de preços.
- **GSMArena** — referência para especificações técnicas detalhadas e comparativo lado a lado de smartphones.
- **Octopart** — referência para busca de componentes eletrônicos em múltiplos distribuidores.

Nenhum deles faz exatamente o que a ShopFinder propõe (grafo de conhecimento com autoridade por atributo, pipeline de enriquecimento, trilha de evidências).

### 4. Vai ter login? Pagamento? Dado sensível? Upload de arquivo?

- **Login:** Sim, já implementado (NextAuth, RBAC). Essencial para o dashboard do operador.
- **Pagamento:** Não processamos pagamentos. A monetização planejada é via comissão por indicação, APIs, assinatura — mas isso é externo à plataforma.
- **Dado sensível:** Hoje não armazenamos nada sensível de consumidores (sem documentos, saúde, financeiro). Senhas dos operadores são hasheadas com bcrypt (12 rounds). Se no futuro coletarmos dados de usuários finais (ex.: para assinatura), aí entra dado pessoal (email, nome) e possivelmente financeiro (cartão via Stripe — aí o PCI é do Stripe, não nosso).
- **Upload de arquivo:** Hoje não. No futuro, fabricantes/operadores podem enviar datasheets ou imagens de produtos.

**Conclusão:** Hoje temos login e senha (bcrypt). Nada de dado sensível de consumidor, pagamento ou upload. Isso pode mudar com assinatura profissional no futuro.

### 5. Existe prazo?

Não há prazo rígido. O MVP está concluído. O próximo passo é demonstrar a plataforma para validação de mercado. Não há data limite — o foco é qualidade e prontidão para quando surgir a oportunidade de apresentar.

### 6. Já existe nome, domínio ou marca decidida?

- **Nome:** ShopFinder
- **Slogan:** "compra inteligente" (pt-BR) / "smart shopping" (en)
- **Domínio:** Não adquirido ainda. O nome ShopFinder é comum (existem apps com nomes similares). A decisão de adquirir um domínio `.com` ou usar um TLD alternativo (`.app`, `.ai`) ainda não foi tomada.
- **Marca:** Identidade visual completa — logo (lupa emerald sobre slate-900), paleta de cores, tipografia, rodapé "ShopFinder - compra inteligente - V0.6.0 - Copyright © 2026 END ART".

### 7. O que "pronto" significa pra você?

"Pronto" significa três coisas, em ordem:

1. **Demonstrável** — a plataforma está no ar (deploy online), acessível via URL pública, com o catálogo de demonstração (564 produtos) funcionando: busca, comparação, detail page, troca de idioma.
2. **Operável com dados reais** — pelo menos um conector (eBay ou DigiKey) está ativado com credenciais reais, e o pipeline está gerando produtos a partir de dados vivos, com curadoria funcionando (operador analisa, publica, arquiva).
3. **Documentado** — qualquer pessoa com acesso ao repositório consegue: (a) subir a plataforma do zero seguindo o `DEPLOY.md`, (b) operar o dashboard seguindo o `operator-guide.md`, (c) adicionar um novo conector seguindo o `engineer-guide.md`.

Só depois desses três itens eu considero o projeto concluído como produto funcional.
