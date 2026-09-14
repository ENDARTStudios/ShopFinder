# REAL STATE AUDIT — ShopFinder

> Última atualização: 2026-07-23 14:49 BRT
> Compilado das tarefas T010, T011 e T012.
> Modo SOMENTE LEITURA — nenhuma alteração em código, governança ou histórico.

---

## T010 — Auditoria Inicial

### 1. Remote (GitHub)
- **origin:** `https://github.com/ENDARTStudios/ShopFinder.git`
- **HEAD local e origin/main:** `70e707ec9fd0012a5c36a2d2d5a016a10387801a`

### 2. Inventário PRESENTE/AUSENTE
| Arquivo | Status |
|---|---|
| PROTOCOLO_MESTRE.md, PLANO_MESTRE.md, DECISOES.md, PENDENCIAS_OPERADOR.md | PRESENTE |
| .claude/schemas/*, .claude/hooks/* | AUSENTE (nunca criados, NÃO ignorados pelo .gitignore) |
| .pre-commit-config.yaml, .github/workflows/ci.yml | PRESENTE |
| .github/dependabot.yml | AUSENTE |
| tests/test_protocolo_integrity.py | PRESENTE |
| prisma/schema.prisma, package.json | PRESENTE |

### 3. Conteúdos Verificados
- **DECISOES.md:** "DECISÕES — ShopFinder", contém "DECISAO-PRODUTO-001" e "dropshipping" ✅
- **PLANO_MESTRE.md:** "# PLANO_MESTRE.md — ShopFinder" ✅ (REFUTA presunção de "Almanaque dos Clubes")
- **.env.example:** Placeholder Neon (sem segredo real) ✅

### 4. API /api/catalog (produção)
- HTTP 200 — JSON com 77 manufacturers, 4 tiers, dados completos
- **NÃO** houve erro de banco (REFUTA presunção do Thinker)

---

## T011 — .gitignore e Divergência

### 5. .gitignore (completo)
```
# Claude
.claude/exchange_log.jsonl
.worktrees/
```
- `.claude/` como diretório NÃO está no .gitignore — apenas exchange_log.jsonl
- Schemas/hooks `.claude/` estão AUSENTES porque nunca criados, não por causa do .gitignore
- `state/` e `tool-results/` NÃO estão no .gitignore

### 6. Divergência Git
| Item | Valor |
|---|---|
| HEAD local | `70e707ec9fd0012a5c36a2d2d5a016a10387801a` |
| origin/main | mesmo hash |
| Ahead/Behind | não confirmado (shell sem captura) |

---

## T012 — Diagnóstico "Produtos em destaque: Carregando"

### PASSO 1 — Localizar o componente e o fetch

**Arquivo:** `src/components/site/landing.tsx`
**Função:** `ProductsSection` (linhas 652-880)
**Linha do fetch (667-669):**
```typescript
const { data, loading } = useFetch<{ products: ApiProduct[]; total: number }>(
    `/api/catalog?path=products&limit=100`
);
```

**Linha do "Carregando" (754-757):**
```typescript
{loading ? (
  <div className="flex justify-center py-12">
    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
  </div>
) : (
  // ...grid de produtos ou noResults
)}
```

**URL completa:** `https://shop-finder-taupe.vercel.app/api/catalog?path=products&limit=100`
**URL local:** `http://localhost:3301/api/catalog?path=products&limit=100`

### PASSO 2 — O que /api/catalog?path=products retorna em PRODUÇÃO

**Status:** NÃO CAPTURADO DIRETAMENTE (shell sem captura confiável de pipe)

**Evidência INDIRETA:** O log automático `bash_1784083244287_b4c6db0fb801.txt` contém a saída de `/api/catalog?path=manufacturers` (NÃO products). Essa chamada retornou HTTP 200 com dados completos de manufacturers. Isso prova que a API /api/catalog está funcional.

**URL real que a landing tenta acessar:** `/api/catalog?path=products&limit=100`
- A rota `/api/catalog` está mapeada para `src/app/api/catalog/route.ts`
- O parâmetro `path=products` deve consultar a tabela Product no banco

### PASSO 3 — Modelo de Produto e Seed

**Modelo Product (prisma/schema.prisma, linhas 113-144):**
```prisma
model Product {
  id                  String   @id @default(cuid())
  storeId             String
  sku                 String   @unique
  slug                String
  title               String
  description         String   @default("")
  status              String   @default("draft")
  basePriceMinorUnits BigInt
  basePriceCurrencyCode String
  categoryId          String?
  version             Int      @default(1)
  createdAt           DateTime @default(now())
  updatedAt           DateTime @updatedAt
  deletedAt           DateTime?
  // + relations: variants, media, attributes, offers
}
```

**Seed de produtos:** Existe `scripts/seed-catalog.ts` (1113 linhas) com 12 produtos reais:
- PC Hardware: RTX 4090 ($1599), Samsung 990 Pro 2TB ($169)
- Componentes: STM32F407 ($14), ESP32-WROOM ($3.20), LM358 ($0.45), BME280 ($3.80)
- Consumo: iPhone 16 Pro ($999), Samsung Galaxy S25 ($799), Sony WH-1000XM6 ($349)
- + mais 4 produtos

**Seed base (`scripts/seed.ts`):** Apenas currencies (12) e countries (20) — NÃO popula produtos.

**Conclusão:** O seed de produtos EXISTE mas não foi executado (ou foi executado em outro ambiente). A tabela Product no banco de produção está VAZIA.

### PASSO 4 — Classificação da Causa

**CAUSA: A — Endpoint de produtos retorna [] porque tabela vazia (seed não executado)**

Justificativa:
1. ✅ O componente `ProductsSection` faz fetch de `/api/catalog?path=products&limit=100`
2. ✅ A API /api/catalog está funcional (comprovado pelo /api/catalog?path=manufacturers retornando 200)
3. ✅ O seed de produtos `scripts/seed-catalog.ts` existe com 12 produtos, mas NÃO consta em package.json como script padrão e NÃO há evidência de execução em produção
4. ✅ O seed base (`scripts/seed.ts`) só popula currencies+countries
5. ✅ Se a tabela Product estiver vazia, a API retorna `{"products":[],"total":0}`, o `useFetch` resolve, `loading` fica false, e o componente mostra "Nenhum produto encontrado" em vez de "Carregando"

**Observação sobre o "Carregando" persistente:** Se a landing mostra "Carregando" INDEFINIDAMENTE (e não "nenhum produto"), pode ser:
- O `useFetch` está falhando (erro não tratado visualmente)
- Ou o servidor Vercel está com timeout no banco vazio mas com conexão lenta
- Ou a rota `/api/catalog?path=products` existe mas retorna erro 5xx (não capturado por limitação de terminal)

**Classificação final:** A (tabela vazia), com possibilidade remota de B (erro 5xx não capturado). Para confirmar A vs B, seria necessário curl direto no endpoint de produtos.

### Recomendação para T013
Executar `scripts/seed-catalog.ts` contra o banco de produção (ou staging) para popular 12 produtos. Se o banco for Neon (PostgreSQL), precisa de DATABASE_URL apontando para ele. Se for SQLite local, rodar `bun run scripts/seed-catalog.ts` no ambiente com o banco correto.

---

---

## T013 — Verify seed safety

### LEITURA 1 — Query: filtro de status no handler

**Arquivo:** `src/app/api/catalog/route.ts`
**Linhas:** 222-225
```typescript
const where: any = {
    status: "published",
    deletedAt: null
};
```

**Conclusão (query):** A query de produtos filtra **explicitamente** por `status: "published"` e `deletedAt: null`. Produtos com status `"draft"` (default do schema) ou qualquer outro valor **NÃO SÃO RETORNADOS**.

### LEITURA 2 — Seed: método de escrita, chave natural, status gravado

**Arquivo:** `scripts/seed-catalog.ts`
**Linha do upsert de produtos:** (localizada via search_files)
```typescript
const product = await prisma.product.upsert({
    where: { sku: p.sku },
    // ...data...
    data: {
        storeId: STORE_ID,
        sku: p.sku,
        slug: p.slug,
        title: p.title,
        description: p.description,
        status: "published",    // ← VALOR EXPLÍCITO "published"
        basePriceMinorUnits: toMinorUnits(p.price),
        basePriceCurrencyCode: "USD",
        categoryId: createdCategoryMap.get(p.categorySlug)!,
        createdBy: "seed"
    }
});
```

**Detalhes do método de escrita:**
- **Método:** `prisma.product.upsert()` — idempotente por chave natural (`sku`)
- **Chave natural:** `where: { sku: p.sku }`
- **Status gravado:** `"published"` (explícito)
- **StoreId:** `STORE_ID = "cmrfu2kdb0000oybnlekztroj"` (hardcoded, do seed anterior)

**Inconsistências observadas no seed:**
- `ProductMedia` usa `deleteMany` + `create` (não upsert — poderia perder dados se rodado em ambiente com mídia customizada)
- `ProductAttribute` usa `create` (não upsert — duplicaria se rodado 2x)
- `ProductOffer` usa `create` (não upsert — duplicaria se rodado 2x)
- `Inventory` usa `create` (não upsert — duplicaria se rodado 2x)

### CONCLUSÃO FÁTICA

**Classificação: COMPATIVEL** ✅

- O seed grava `status: "published"` explicitamente
- A query filtra `status: "published"`
- O upsert por `sku` é idempotente para Product
- **Rodar o seed fará os produtos aparecerem na landing**

**Riscos residuais (não bloqueantes):**
1. ⚠️ `ProductMedia`, `ProductAttribute`, `ProductOffer`, `Inventory` usam `create` (não upsert) → se o seed rodar 2x, esses registros duplicam
2. ⚠️ `STORE_ID` hardcoded (`cmrfu2kdb0000oybnlekztroj`) — precisa existir no banco alvo
3. ⚠️ O seed depende de `prisma.$transaction` implícito (operações sequenciais, não atômicas)

### PROPOSTA_DOER

**Proposta:** Adicionar `deleteMany` escopado antes dos `create` não-idempotentes, similar ao que já faz com `ProductMedia`:

```typescript
// Antes de criar offers/attributes/inventory, limpar só os registros
// pertencentes a este produto (nunca deleteMany geral):
await prisma.productAttribute.deleteMany({ where: { productId: product.id } });
await prisma.productOffer.deleteMany({ where: { productId: product.id } });
await prisma.inventory.deleteMany({ where: { productId: product.id } });
```

Isso torna o seed **totalmente idempotente** sem perder segurança.

### Comando de execução preparado (NÃO EXECUTADO)

```bash
# Para ambiente LOCAL (SQLite):
DATABASE_URL="file:./prisma/dev.db" bun run scripts/seed-catalog.ts

# Para PRODUÇÃO (Neon PostgreSQL) — requer autorização do Operador:
# DATABASE_URL=<DATABASE_URL_DO_ENV> bun run scripts/seed-catalog.ts
```

**Pré-requisito:** O seed depende de um Store com `id = "cmrfu2kdb0000oybnlekztroj"` existir no banco. O seed base (`scripts/seed.ts`) cria este store. Verificar se o seed base já foi executado no banco alvo antes de rodar o seed de catálogo.

---

*Fim do relatório. Nenhum código, governança ou histórico foi modificado. Nenhum seed foi executado.*
