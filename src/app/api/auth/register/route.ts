/**
 * ShopFinder — User registration API
 */
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@workspace/database";
import { hashPassword } from "@workspace/auth";
import { z } from "zod";

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().optional()
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = registerSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { email, password } = parsed.data;

    // Check if user already exists
    const existing = await prisma.user.findFirst({
      where: { email: email.toLowerCase() }
    });

    if (existing) {
      return NextResponse.json(
        { error: "Email already registered" },
        { status: 409 }
      );
    }

    // Hash password
    const passwordHash = await hashPassword(password);

    // Create user
    const user = await prisma.user.create({
      data: {
        email: email.toLowerCase(),
        passwordHash,
        roles: JSON.stringify(["customer"]),
        storeId: "cmrfu2kdb0000oybnlekztroj",
        status: "active"
      }
    });

    return NextResponse.json({
      id: user.id,
      email: user.email,
      message: "User registered successfully"
    }, { status: 201 });
  } catch (error) {
    console.error("Registration error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
