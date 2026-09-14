/**
 * ShopFinder — Admin Product Status Update
 *
 * PATCH /api/admin/products/[id]
 *   Body: { status: "draft" | "published" | "review" | "archived" }
 *
 * Requires admin or operator role.
 */
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@workspace/database";
import { requirePermissions } from "@/lib/admin-auth";

const VALID_STATUSES = ["draft", "published", "review", "archived"];

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // Authorization: mutação exige catalog.write (docs/eng/RBAC.md)
  const guard = await requirePermissions("catalog.write");
  if (!guard.ok) return guard.response;

  const { id } = await params;

  try {
    const body = await request.json();
    const { status } = body;

    if (!status || !VALID_STATUSES.includes(status)) {
      return NextResponse.json(
        { error: `Invalid status. Must be one of: ${VALID_STATUSES.join(", ")}` },
        { status: 400 }
      );
    }

    const product = await prisma.product.update({
      where: { id },
      data: {
        status,
        updatedBy: guard.auth.userId
      },
      select: {
        id: true,
        sku: true,
        title: true,
        status: true,
        updatedAt: true
      }
    });

    return NextResponse.json({
      product,
      message: `Product status updated to "${status}"`
    });
  } catch (error) {
    console.error("Admin product update error:", error);
    return NextResponse.json(
      { error: "Internal server error", details: String(error) },
      { status: 500 }
    );
  }
}
