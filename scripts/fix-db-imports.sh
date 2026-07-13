#!/usr/bin/env bash
# Fix systematic issues in database package
set -euo pipefail
ROOT="/home/z/my-project/packages/database/src"

# 1. Fix imports: branded IDs should come from @workspace/domain/shared, not from context modules
sed -i 's|import type { Product, ProductId } from "@workspace/domain/catalog"|import type { Product } from "@workspace/domain/catalog"\nimport type { ProductId } from "@workspace/domain/shared"|g' "$ROOT/mappers/product-mapper.ts"
sed -i 's|import type { ProductId, CategoryId } from "@workspace/domain/shared"|import type { ProductId, CategoryId } from "@workspace/domain/shared"|g' "$ROOT/mappers/product-mapper.ts"

# Fix product-mapper: remove duplicate ProductId import from catalog
sed -i '/import type { Product } from "@workspace\/domain\/catalog";/{n;/import type { ProductId } from "@workspace\/domain\/catalog";/d}' "$ROOT/mappers/product-mapper.ts"

# 2. Fix cart imports
sed -i 's|import type { Cart, CartId } from "@workspace/domain/cart"|import type { Cart } from "@workspace/domain/cart"\nimport type { CartId } from "@workspace/domain/shared"|g' "$ROOT/repositories/cart-repository.ts"
sed -i 's|import type { Cart, CartId } from "@workspace/domain/cart"|import type { Cart } from "@workspace/domain/cart"\nimport type { CartId } from "@workspace/domain/shared"|g' "$ROOT/mappers/cart-mapper.ts"

# 3. Fix category imports  
sed -i 's|import type { Category, CategoryId } from "@workspace/domain/catalog"|import type { Category } from "@workspace/domain/catalog"\nimport type { CategoryId } from "@workspace/domain/shared"|g' "$ROOT/repositories/category-repository.ts"

# 4. Fix checkout-session imports
sed -i 's|import type { CheckoutSession, CheckoutSessionId } from "@workspace/domain/checkout"|import type { CheckoutSession } from "@workspace/domain/checkout"\nimport type { CheckoutSessionId } from "@workspace/domain/shared"|g' "$ROOT/repositories/checkout-session-repository.ts"

# 5. Fix orderBy: add 'as const' 
sed -i 's|orderBy: { createdAt: "asc" }|orderBy: { createdAt: "asc" as const }|g' "$ROOT/repositories/cart-repository.ts"

# 6. Fix isolatedModules: use export type for re-exporting types
sed -i 's|^export type {$|export type {|g' "$ROOT/index.ts"

echo "Fixes applied"
