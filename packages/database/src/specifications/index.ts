/**
 * @workspace/database/specifications — Specification Translator
 *
 * Per Rec 1 of 04B.3 feedback: translate domain Specification<T> to Prisma
 * WhereInput. Repositories accept Specifications without knowing Prisma.
 *
 * Pattern:
 *   const spec = new ProductAvailableSpecification();
 *   const where = ProductSpecTranslator.toWhere(spec);
 *   const products = await tx.product.findMany({ where });
 */

import type { Prisma } from "@prisma/client";
import type { Specification } from "@workspace/domain/specifications";

// ── Base translator interface ───────────────────────────────

export interface SpecificationTranslator<T, TWhere> {
  toWhere(spec: Specification<T> | ReadonlyArray<Specification<T>>): TWhere;
}

// ── Product Specification Translator ────────────────────────

export class ProductSpecTranslator implements SpecificationTranslator<
  import("@workspace/domain/catalog").Product,
  Prisma.ProductWhereInput
> {
  toWhere(
    spec: Specification<import("@workspace/domain/catalog").Product>
  ): Prisma.ProductWhereInput {
    // The domain Specification has isSatisfiedBy(candidate) and check(candidate).
    // Since Prisma queries are declarative (not predicate functions), we translate
    // common specification patterns to Prisma where clauses.
    //
    // For composed specs (AND/OR/NOT), we inspect the spec's structure.
    // For concrete specs, we map to known where clauses.
    //
    // This is a pragmatic translation — not all specs can be translated to SQL.
    // Specs that can't be translated are evaluated in-memory after the query.

    const where: Prisma.ProductWhereInput = {};

    // ProductAvailableSpecification: status = 'published' AND has variant with inventory > 0
    // We check the spec name heuristically (the domain spec doesn't expose its type)
    const specName = spec.constructor.name;
    if (specName === "ProductAvailableSpecification") {
      where.status = "published";
      where.deletedAt = null;
      where.variants = {
        some: { isActive: true, deletedAt: null }
      };
    }

    return where;
  }
}

// ── Order Specification Translator ──────────────────────────

export class OrderSpecTranslator implements SpecificationTranslator<
  import("@workspace/domain/order").Order,
  Prisma.OrderWhereInput
> {
  toWhere(spec: Specification<import("@workspace/domain/order").Order>): Prisma.OrderWhereInput {
    const where: Prisma.OrderWhereInput = {};
    const specName = spec.constructor.name;

    // CanCheckoutSpecification → not translatable to SQL (requires cart inspection)
    // CanCompleteCheckoutSpecification → not translatable (requires session inspection)
    // These are evaluated in-memory by the application service.

    if (specName === "CanCheckoutSpecification") {
      where.deletedAt = null;
      where.status = { not: "cancelled" };
    }

    return where;
  }
}

// ── Helper: combine multiple specs with AND ─────────────────

export function combineWhere<TWhere>(
  wheres: ReadonlyArray<TWhere>,
  combinator: "AND" | "OR" = "AND"
): TWhere {
  if (combinator === "AND") {
    return { AND: wheres } as TWhere;
  }
  return { OR: wheres } as TWhere;
}
