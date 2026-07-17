# ShopFinder — Demonstration Checklist

**Purpose**: Ready-to-run script for demonstrating the ShopFinder platform to stakeholders. Each scenario is timed, has clear narration cues, and verifies a specific value proposition.

**Estimated duration**: 12-15 minutes (excluding Q&A).

---

## Pre-demo setup (5 minutes before)

- [ ] Dev server running: `bun run dev` (verify `http://localhost:3000/` returns 200)
- [ ] Pipeline populated: `bun run scripts/run-pipeline.ts`
- [ ] Optional: bulk load for scale demo: `bun run scripts/generate-bulk-products.ts --count=500 --clean`
- [ ] Browser zoom set to 100%, theme set to light
- [ ] Test admin login: `test-admin@shopfinder.test` / `testAdminPass123`
- [ ] Open DevTools Network tab (filter by `api/`)
- [ ] Close other tabs

---

## Scenario 1 — Landing & first impression (1 min)

**Narration**: "ShopFinder is a Catalog Intelligence Platform — it transforms fragmented product data from multiple sources into a single, trustworthy, searchable catalog."

**Actions**:
1. Open `http://localhost:3000/`
2. Point to the hero: name, tagline "compra inteligente", search bar
3. Scroll to **Niches** section
4. Scroll to **Manufacturers** — tiers, country flags, authority scores
5. Scroll to **Products** — featured grid with brand, rating, price, supplier offers

---

## Scenario 2 — Ontological search (1.5 min)

**Narration**: "The search is ontology-aware — it understands that 'soquete' means 'socket'."

**Actions**:
1. Type `soquete AM5` in the search bar
2. Show AMD Ryzen CPUs and AM5 motherboards appear
3. Try `fonte 750W` — Seasonic/Corsair PSUs
4. Try `STM32` — microcontrollers

---

## Scenario 3 — Filter refinement (1.5 min)

**Actions**:
1. With search results visible, scroll to the **FilterBar** sidebar
2. Check a manufacturer checkbox (e.g., Intel)
3. Set price range: min `$80`, max `$150`
4. Click "+ Adicionar filtro" → select an attribute → type a value
5. Show result count updating live
6. Click "Limpar filtros"

---

## Scenario 4 — Product detail with authority trail (2 min)

**Actions**:
1. Click any product card
2. Point to **Especificações com Autoridade** section
3. Each attribute has source badge + confidence bar
4. Expand evidence trail — show 3 sources (manufacturer 1.0, datasheet 0.99, marketplace 0.72)
5. Scroll to **Ofertas de Fornecedores** — multiple suppliers, "Melhor preço" badge
6. Scroll to **Produtos Compatíveis** — knowledge graph

---

## Scenario 5 — Product comparison (2 min)

**Actions**:
1. Go back to landing, click "Comparar" on 2-3 product cards
2. Show header badge: "Comparar (3)"
3. Click badge → navigate to `/compare?slugs=...`
4. Show spec matrix — each row is a unified attribute, each column a product
5. Point to source badges + confidence bars in cells
6. Scroll to **Ofertas** matrix — best price highlighted
7. Click "Adicionar produto" to search and add a 4th
8. Copy the URL — show it's shareable

---

## Scenario 6 — Operator dashboard (2 min)

**Actions**:
1. Open `/admin` (sign in if prompted)
2. Show 7 summary cards
3. Filter by "Low confidence"
4. Click **Pipeline** button → navigate to `/admin/pipeline`
5. Show connectors (eBay replay, DigiKey/Amazon not_configured)
6. Show execution timeline with stage timings
7. Click **NotificationsBell** — shows alerts

---

## Scenario 7 — Pipeline observability (1.5 min)

**Actions**:
1. On `/admin/pipeline`, show **Stage Timings** table with share bars
2. Point to `10.catalog_materialization` — bulk of the time
3. Show **Run Statistics** — success rate, avg duration

---

## Scenario 8 — Internationalization (30 sec)

**Actions**:
1. Click **PT | EN** toggle in header
2. Page reloads with English text
3. Toggle back to Portuguese

---

## Scenario 9 — Connector activation (1 min, optional)

**Narration**: "eBay connector is ready for live data — just set env vars."

**Actions**:
1. Show connector card with REPLAY badge
2. Narration: "Set `EBAY_APP_ID` + `EBAY_CERT_ID` → restart → live mode"

---

## Q&A backup

- **Architecture**: `docs/architecture.md`
- **ADR list**: 30+ ADRs in `docs/adr/`
- **Test coverage**: 57 integration tests
- **Engineering guides**: `docs/engineer-guide.md`, `docs/operator-guide.md`

---

## Post-demo cleanup

```bash
bun run scripts/generate-bulk-products.ts --count=0 --clean
bun run scripts/run-pipeline.ts
```

---

## Demo timing summary

| Scenario | Duration |
|---|---|
| 1. Landing | 1 min |
| 2. Search | 1.5 min |
| 3. Filters | 1.5 min |
| 4. Detail | 2 min |
| 5. Compare | 2 min |
| 6. Admin | 2 min |
| 7. Pipeline | 1.5 min |
| 8. i18n | 0.5 min |
| 9. Connectors | 1 min |
| **Total** | **~13 min** |
