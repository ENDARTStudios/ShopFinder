#!/usr/bin/env bash
#
# ShopFinder — Smoke test automatizado dos 9 cenários do DEMO_CHECKLIST.md
#
# Uso:
#   DEPLOY_URL=https://shopfinder-xxx.vercel.app bash scripts/smoke-test.sh
#   bash scripts/smoke-test.sh  # usa http://localhost:3000 por padrão
#
# Cobre:
#   1. Landing page
#   2. Catálogo API (ontological search — indireto: catalog API retorna produtos com specs AM5/750W)
#   3. Detail page com trilha de autoridade
#   4. Página /compare (empty state)
#   5. Página /compare?slugs= (matriz)
#   6. /admin (auth gate — retorna 200 com prompt de login, não 200 com dashboard)
#   7. /api/admin/pipeline/status (proteção — 401 sem auth)
#   8. i18n (cookie locale=en muda a tagline)
#   9. 404 handling
#
# Exit codes:
#   0 — todos os cenários passaram
#   1 — pelo menos um cenário falhou
#
# Saída: linha por cenário, ✓ ou ✗, com detalhe do que falhou.

set -euo pipefail

BASE="${DEPLOY_URL:-http://localhost:3000}"
PASS=0
FAIL=0
FAILURES=()

check() {
  local description="$1"
  local condition="$2"
  local detail="${3:-}"
  if eval "$condition"; then
    echo "  ✓ $description"
    PASS=$((PASS + 1))
  else
    echo "  ✗ $description${detail:+ — $detail}"
    FAIL=$((FAIL + 1))
    FAILURES+=("$description")
  fi
}

echo "ShopFinder — Smoke Test dos 9 cenários de demonstração"
echo "Alvo: $BASE"
echo "--------------------------------------------------------"

# ── 1. Landing page ───────────────────────────────────────
echo ""
echo "Cenário 1 — Landing page"
LANDING_HTML=$(curl -sS -o /tmp/sf-landing.html -w "%{http_code}" "$BASE/") || true
check "HTTP 200"            "[ '$LANDING_HTML' = '200' ]"                         "status=$LANDING_HTML"
check "Contém 'ShopFinder'" "grep -q 'ShopFinder' /tmp/sf-landing.html"            "marca ausente"
check "Tagline PT default"  "grep -q 'compra inteligente' /tmp/sf-landing.html"    "tagline ausente"
check "Form de busca (role=search)" "grep -q 'role=\"search\"' /tmp/sf-landing.html" "form ausente"
check "Seção de nichos"     "grep -q 'id=\"nichos\"' /tmp/sf-landing.html"        "seção ausente"

# ── 2. Catálogo API (busca ontológica) ────────────────────
echo ""
echo "Cenário 2 — Catálogo API (base da busca ontológica)"
CATALOG_HTTP=$(curl -sS -o /tmp/sf-catalog.json -w "%{http_code}" "$BASE/api/catalog?path=products&limit=1000") || true
check "HTTP 200"            "[ '$CATALOG_HTTP' = '200' ]"                          "status=$CATALOG_HTTP"
PRODUCT_COUNT=$(bun -e "const d = await Bun.stdin.json(); console.log(d.products?.length ?? 0)" < /tmp/sf-catalog.json 2>/dev/null || echo "0")
check "Retorna produtos"    "[ '$PRODUCT_COUNT' -gt 0 ]"                          "count=$PRODUCT_COUNT"
AM5_COUNT=$(bun -e "const d = await Bun.stdin.json(); console.log(d.products?.filter(p => p.specs?.some(s => s.value === 'AM5')).length ?? 0)" < /tmp/sf-catalog.json 2>/dev/null || echo "0")
check "Produtos AM5 (ontológico)" "[ '$AM5_COUNT' -gt 0 ]"                        "count=$AM5_COUNT"
PSU750_COUNT=$(bun -e "const d = await Bun.stdin.json(); console.log(d.products?.filter(p => p.specs?.some(s => s.value === '750W')).length ?? 0)" < /tmp/sf-catalog.json 2>/dev/null || echo "0")
check "PSUs 750W (ontológico)" "[ '$PSU750_COUNT' -gt 0 ]"                        "count=$PSU750_COUNT"

# ── 3. Detail page com trilha de autoridade ───────────────
echo ""
echo "Cenário 3 — Detail page com trilha de autoridade"
# Pega o primeiro slug do catálogo para evitar hardcode
FIRST_SLUG=$(bun -e "const d = await Bun.stdin.json(); console.log(d.products?.[0]?.slug ?? '')" < /tmp/sf-catalog.json 2>/dev/null || echo "")
if [ -n "$FIRST_SLUG" ]; then
  DETAIL_HTTP=$(curl -sS -o /tmp/sf-detail.html -w "%{http_code}" "$BASE/produtos/$FIRST_SLUG") || true
  check "Detail page HTTP 200" "[ '$DETAIL_HTTP' = '200' ]"                       "status=$DETAIL_HTTP slug=$FIRST_SLUG"
  check "Seção de especificações" "grep -qi 'especifica' /tmp/sf-detail.html || grep -qi 'specification' /tmp/sf-detail.html" "section ausente"
  check "Botão Comparar presente" "grep -qi 'Comparar\|Compare' /tmp/sf-detail.html" "botão ausente"
  # Verifica enrichedSpecs via API slugs filter (detail page usa server component, dados não estão no HTML inicial)
  ENRICHED_HTTP=$(curl -sS -o /tmp/sf-enriched.json -w "%{http_code}" "$BASE/api/catalog?path=products&slugs=$FIRST_SLUG&limit=1") || true
  ENRICHED_COUNT=$(bun -e "const d = await Bun.stdin.json(); console.log(d.products?.[0]?.enrichedSpecs?.length ?? 0)" < /tmp/sf-enriched.json 2>/dev/null || echo "0")
  check "API retorna enrichedSpecs" "[ '$ENRICHED_COUNT' -gt 0 ]"                  "enrichedSpecs.length=$ENRICHED_COUNT"
else
  echo "  ✗ Detail page — não foi possível obter slug do catálogo"
  FAIL=$((FAIL + 1)); FAILURES+=("Detail page — sem slug")
fi

# ── 4. Página /compare (empty state) ───────────────────────
echo ""
echo "Cenário 4 — /compare empty state"
COMPARE_EMPTY_HTTP=$(curl -sS -o /tmp/sf-compare-empty.html -w "%{http_code}" "$BASE/compare") || true
check "HTTP 200"            "[ '$COMPARE_EMPTY_HTTP' = '200' ]"                    "status=$COMPARE_EMPTY_HTTP"
check "Estado vazio (PT)"   "grep -q 'Nenhum produto selecionado' /tmp/sf-compare-empty.html" "mensagem ausente"

# ── 5. Página /compare?slugs= (matriz) ────────────────────
echo ""
echo "Cenário 5 — /compare?slugs= (matriz)"
COMPARE_SLUGS_HTTP=$(curl -sS -o /tmp/sf-compare-slugs.html -w "%{http_code}" "$BASE/compare?slugs=$FIRST_SLUG") || true
check "HTTP 200"            "[ '$COMPARE_SLUGS_HTTP' = '200' ]"                    "status=$COMPARE_SLUGS_HTTP"
check "Título 'Comparar Produtos'" "grep -q 'Comparar Produtos' /tmp/sf-compare-slugs.html" "título ausente"

# ── 6. /admin (auth gate) ─────────────────────────────────
echo ""
echo "Cenário 6 — /admin (auth gate)"
ADMIN_HTTP=$(curl -sS -o /tmp/sf-admin.html -w "%{http_code}" "$BASE/admin") || true
check "HTTP 200 ou 307 (gate ou redirect)" "[ '$ADMIN_HTTP' = '200' ] || [ '$ADMIN_HTTP' = '307' ]" "status=$ADMIN_HTTP"
# Se 200, deve ter gate client-side (não dashboard exposto sem auth)
if [ "$ADMIN_HTTP" = "200" ]; then
  check "Gate de auth (não expõe dashboard sem sessão)" "grep -qi 'login\|sign in\|entrar' /tmp/sf-admin.html" "ausente — possível bypass"
fi

# ── 7. /api/admin/pipeline/status (proteção) ──────────────
echo ""
echo "Cenário 7 — /api/admin/pipeline/status (proteção sem auth)"
PIPELINE_HTTP=$(curl -sS -o /dev/null -w "%{http_code}" "$BASE/api/admin/pipeline/status") || true
check "HTTP 401 sem auth"   "[ '$PIPELINE_HTTP' = '401' ]"                         "status=$PIPELINE_HTTP (esperado 401)"

# ── 8. i18n (cookie locale=en) ────────────────────────────
echo ""
echo "Cenário 8 — Internacionalização (cookie locale=en)"
EN_HTML=$(curl -sS -o /tmp/sf-en.html -w "%{http_code}" -H "Cookie: locale=en" "$BASE/") || true
check "HTTP 200 com cookie EN" "[ '$EN_HTML' = '200' ]"                           "status=$EN_HTML"
check "Tagline EN ('smart shopping')" "grep -q 'smart shopping' /tmp/sf-en.html"  "tagline EN ausente"

# ── 9. 404 handling ───────────────────────────────────────
echo ""
echo "Cenário 9 — 404 handling"
NOT_FOUND_HTTP=$(curl -sS -o /dev/null -w "%{http_code}" "$BASE/esta-rota-nao-existe-12345") || true
check "HTTP 404 para rota inexistente" "[ '$NOT_FOUND_HTTP' = '404' ]"            "status=$NOT_FOUND_HTTP (esperado 404)"

# ── Resumo ─────────────────────────────────────────────────
echo ""
echo "--------------------------------------------------------"
echo "Resumo: $PASS passaram, $FAIL falharam"
if [ "$FAIL" -gt 0 ]; then
  echo ""
  echo "Falhas:"
  for f in "${FAILURES[@]}"; do
    echo "  - $f"
  done
  exit 1
fi
echo ""
echo "✅ Todos os cenários passaram. Pronto para demonstração."
exit 0
