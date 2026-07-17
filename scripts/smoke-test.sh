#!/usr/bin/env bash
#
# ShopFinder — Smoke test automatizado dos 9 cenários de demonstração.
#
# Uso:
#   DEPLOY_URL=https://shopfinder-xxx.vercel.app bash scripts/smoke-test.sh
#   bash scripts/smoke-test.sh  # usa http://localhost:3000 por padrão
#
# Cobre:
#   1. Landing page carrega e contém "ShopFinder"
#   2. API de catálogo retorna produtos
#   3. Página de detalhes de um produto retorna 200
#   4. Página de comparação retorna 200 com parâmetros
#   5. Troca de idioma (cookie locale=en)
#   6. API de administração retorna 401 sem autenticação
#   7. Página /admin carrega (gate de auth)
#   8. API pública não vaza dados internos (/api/admin/products retorna 401)
#   9. Página 404 retorna 404
#
# Exit codes: 0 = todos passaram, 1 = pelo menos um falhou

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
LANDING_HTTP=$(curl -sS -o /tmp/sf-landing.html -w "%{http_code}" "$BASE/") || true
check "HTTP 200" "[ '$LANDING_HTTP' = '200' ]" "status=$LANDING_HTTP"
check "Contém 'ShopFinder'" "grep -q 'ShopFinder' /tmp/sf-landing.html" "marca ausente"

# ── 2. API de catálogo retorna produtos ───────────────────
echo ""
echo "Cenário 2 — API de catálogo retorna produtos"
CATALOG_HTTP=$(curl -sS -o /tmp/sf-catalog.json -w "%{http_code}" "$BASE/api/catalog?path=products&limit=100") || true
check "HTTP 200" "[ '$CATALOG_HTTP' = '200' ]" "status=$CATALOG_HTTP"
PRODUCT_COUNT=$(bun -e "const d = await Bun.stdin.json(); console.log(d.products?.length ?? 0)" < /tmp/sf-catalog.json 2>/dev/null || echo "0")
check "Retorna produtos" "[ '$PRODUCT_COUNT' -gt 0 ]" "count=$PRODUCT_COUNT"

# ── 3. Página de detalhes de um produto ───────────────────
echo ""
echo "Cenário 3 — Página de detalhes"
FIRST_SLUG=$(bun -e "const d = await Bun.stdin.json(); console.log(d.products?.[0]?.slug ?? '')" < /tmp/sf-catalog.json 2>/dev/null || echo "")
if [ -n "$FIRST_SLUG" ]; then
  DETAIL_HTTP=$(curl -sS -o /tmp/sf-detail.html -w "%{http_code}" "$BASE/produtos/$FIRST_SLUG") || true
  check "Detail page HTTP 200" "[ '$DETAIL_HTTP' = '200' ]" "status=$DETAIL_HTTP slug=$FIRST_SLUG"
else
  echo "  ✗ Detail page — não foi possível obter slug do catálogo"
  FAIL=$((FAIL + 1)); FAILURES+=("Detail page — sem slug")
fi

# ── 4. Página de comparação com parâmetros ────────────────
echo ""
echo "Cenário 4 — Página de comparação"
COMPARE_EMPTY_HTTP=$(curl -sS -o /tmp/sf-compare-empty.html -w "%{http_code}" "$BASE/compare") || true
check "/compare (empty) HTTP 200" "[ '$COMPARE_EMPTY_HTTP' = '200' ]" "status=$COMPARE_EMPTY_HTTP"
if [ -n "$FIRST_SLUG" ]; then
  COMPARE_SLUGS_HTTP=$(curl -sS -o /tmp/sf-compare-slugs.html -w "%{http_code}" "$BASE/compare?slugs=$FIRST_SLUG") || true
  check "/compare?slugs= HTTP 200" "[ '$COMPARE_SLUGS_HTTP' = '200' ]" "status=$COMPARE_SLUGS_HTTP"
fi

# ── 5. Troca de idioma ────────────────────────────────────
echo ""
echo "Cenário 5 — Internacionalização (cookie locale=en)"
EN_HTML=$(curl -sS -o /tmp/sf-en.html -w "%{http_code}" -H "Cookie: locale=en" "$BASE/") || true
check "HTTP 200 com cookie EN" "[ '$EN_HTML' = '200' ]" "status=$EN_HTML"
check "Tagline EN ('smart shopping')" "grep -q 'smart shopping' /tmp/sf-en.html" "tagline EN ausente"

# ── 6. API de administração retorna 401 sem auth ──────────
echo ""
echo "Cenário 6 — API admin retorna 401 sem auth"
PIPELINE_HTTP=$(curl -sS -o /dev/null -w "%{http_code}" "$BASE/api/admin/pipeline/status") || true
check "HTTP 401 sem auth" "[ '$PIPELINE_HTTP' = '401' ]" "status=$PIPELINE_HTTP (esperado 401)"

# ── 7. Página /admin carrega (gate de auth) ───────────────
echo ""
echo "Cenário 7 — Página /admin carrega"
ADMIN_HTTP=$(curl -sS -o /dev/null -w "%{http_code}" "$BASE/admin") || true
check "HTTP 200 ou 307 (gate ou redirect)" "[ '$ADMIN_HTTP' = '200' ] || [ '$ADMIN_HTTP' = '307' ]" "status=$ADMIN_HTTP"

# ── 8. API pública não vaza dados internos ────────────────
echo ""
echo "Cenário 8 — /api/admin/products retorna 401 sem auth"
ADMIN_PRODUCTS_HTTP=$(curl -sS -o /dev/null -w "%{http_code}" "$BASE/api/admin/products") || true
check "HTTP 401 sem auth" "[ '$ADMIN_PRODUCTS_HTTP' = '401' ]" "status=$ADMIN_PRODUCTS_HTTP (esperado 401)"

# ── 9. Página 404 retorna 404 ─────────────────────────────
echo ""
echo "Cenário 9 — 404 handling"
NOT_FOUND_HTTP=$(curl -sS -o /dev/null -w "%{http_code}" "$BASE/esta-rota-nao-existe-12345") || true
check "HTTP 404 para rota inexistente" "[ '$NOT_FOUND_HTTP' = '404' ]" "status=$NOT_FOUND_HTTP (esperado 404)"

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
