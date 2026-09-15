/**
 * NOVA_DIRECAO E3 — Webhook do bot Telegram (SCAFFOLD).
 *
 * O Operador cria o bot (@BotFather), seta TELEGRAM_BOT_TOKEN (server env) e
 * TELEGRAM_WEBHOOK_SECRET (usado na URL: /api/telegram/webhook?secret=<valor>
 * ou header x-telegram-bot-api-secret-token), e registra o webhook:
 *
 *   https://api.telegram.org/bot<TOKEN>/setWebhook?url=https://<domínio>/api/telegram/webhook
 *
 * Comandos implementados no v1: /start (boas-vindas) e /busca <texto>
 * (top 3 resultados do catálogo com link).
 */
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@workspace/database";

interface TelegramUpdate {
  message?: {
    chat: { id: number };
    text?: string;
  };
}

async function reply(chatId: number, text: string): Promise<void> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) return;
  await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text })
  });
}

async function searchProducts(query: string): Promise<string> {
  const products = await prisma.product.findMany({
    where: {
      status: "published",
      deletedAt: null,
      title: { contains: query, mode: "insensitive" }
    },
    orderBy: { updatedAt: "desc" },
    take: 3,
    select: { title: true, slug: true }
  });
  if (products.length === 0) return "Nenhum produto encontrado. Tente outro termo.";
  return (
    "Top resultados:\n" +
    products.map((p) => `• ${p.title}\n  https://shop-finder-end-art-studios.vercel.app/produtos/${p.slug}`).join("\n")
  );
}

export async function POST(request: NextRequest) {
  const secret = process.env.TELEGRAM_WEBHOOK_SECRET;
  const provided =
    request.headers.get("x-telegram-bot-api-secret-token") ??
    request.nextUrl.searchParams.get("secret");
  if (!secret || provided !== secret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let update: TelegramUpdate;
  try {
    update = (await request.json()) as TelegramUpdate;
  } catch {
    return NextResponse.json({ ok: true });
  }

  const chatId = update.message?.chat.id;
  const text = update.message?.text?.trim();
  if (!chatId || !text) return NextResponse.json({ ok: true });

  if (text.startsWith("/start")) {
    await reply(
      chatId,
      "Bem-vindo ao ShopFinder! Use /busca <termo> para procurar produtos no catálogo."
    );
  } else if (text.startsWith("/busca ")) {
    const query = text.slice("/busca ".length).trim();
    if (query.length < 2) {
      await reply(chatId, "Informe um termo: /busca rtx 4090");
    } else {
      const answer = await searchProducts(query);
      await reply(chatId, answer);
    }
  } else {
    await reply(chatId, "Comando não reconhecido. Use /busca <termo>.");
  }

  return NextResponse.json({ ok: true });
}
