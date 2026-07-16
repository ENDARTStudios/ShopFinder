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
import { getServerAuthSession } from "@workspace/auth";

function hasAdminRole(roles: string[] | undefined): boolean {
  if (!roles) return false;
  return roles.includes("admin") || roles.includes("operator");
}

const VALID_STATUSES = ["draft", "published", "review", "archived"];

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // Check auth
  const session = await getServerAuthSession();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = session.user as any;
  if (!hasAdminRole(user.roles)) {
    return NextResponse.json({ error: "Forbidden — requires admin or operator role" }, { status: 403 });
  }

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
        updatedBy: user.id
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
