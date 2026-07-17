/**
 * ShopFinder — Create admin user script.
 *
 * Creates or updates a user with the "admin" role in the database.
 * Used for production setup after deploy (the dev database has test users,
 * but production Neon starts empty).
 *
 * Usage:
 *   bun run scripts/create-admin.ts --email "admin@endart.com" --password "securePass123"
 *
 * With production DATABASE_URL:
 *   DATABASE_URL="<NEON_CONNECTION_STRING>" bun run scripts/create-admin.ts --email "admin@endart.com" --password "securePass123"
 *
 * The script is idempotent — if the email already exists, it updates the
 * password hash and ensures the "admin" role is present.
 */
import { PrismaClient } from "@prisma/client";
import { hashPassword } from "@workspace/auth/password";

const prisma = new PrismaClient();

const STORE_ID = "cmrfu2kdb0000oybnlekztroj"; // Default Store

function parseArgs(): { email?: string; password?: string } {
  const args = process.argv.slice(2);
  const result: { email?: string; password?: string } = {};
  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--email" && args[i + 1]) {
      result.email = args[i + 1];
      i++;
    } else if (args[i] === "--password" && args[i + 1]) {
      result.password = args[i + 1];
      i++;
    }
  }
  return result;
}

async function main() {
  const { email, password } = parseArgs();

  if (!email || !password) {
    console.error("Uso: bun run scripts/create-admin.ts --email <email> --password <senha>");
    console.error("");
    console.error("Exemplo:");
    console.error('  bun run scripts/create-admin.ts --email "admin@endart.com" --password "securePass123"');
    console.error("");
    console.error("Com production DATABASE_URL:");
    console.error('  DATABASE_URL="<NEON_STRING>" bun run scripts/create-admin.ts --email "admin@endart.com" --password "securePass123"');
    process.exit(1);
  }

  if (password.length < 8) {
    console.error("✗ A senha deve ter pelo menos 8 caracteres.");
    process.exit(1);
  }

  console.log(`Criando/atualizando usuário admin: ${email}`);

  const passwordHash = await hashPassword(password);

  // Parse existing roles and ensure "admin" is present
  const existing = await prisma.user.findUnique({
    where: { email: email.toLowerCase() },
    select: { roles: true }
  });

  let roles: string[] = ["admin"];
  if (existing) {
    try {
      const parsed = JSON.parse(existing.roles);
      if (Array.isArray(parsed)) {
        roles = Array.from(new Set([...parsed, "admin"]));
      }
    } catch {
      // keep default ["admin"]
    }
  }

  const user = await prisma.user.upsert({
    where: { email: email.toLowerCase() },
    update: {
      passwordHash,
      roles: JSON.stringify(roles),
      status: "active"
    },
    create: {
      email: email.toLowerCase(),
      passwordHash,
      roles: JSON.stringify(roles),
      storeId: STORE_ID,
      status: "active"
    }
  });

  console.log(`✓ Usuário admin criado/atualizado: ${user.email}`);
  console.log(`  Roles: ${roles.join(", ")}`);
  console.log(`  Store ID: ${user.storeId ?? STORE_ID}`);
  console.log("");
  console.log("Você já pode fazer login em /admin com este email e senha.");
}

main()
  .catch((e) => {
    console.error("✗ Erro ao criar usuário admin:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
