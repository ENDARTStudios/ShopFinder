/**
 * ShopFinder — Direito de arrependimento (T061)
 *
 * POST /api/orders/[id]/cancelamento
 *
 * Art. 49 do CDC: desistência de compra realizada fora do estabelecimento
 * comercial em até 7 dias, pelo mesmo canal da contratação, com protocolo.
 * Grava somente a SOLICITAÇÃO no pedido (protocolo + timestamp + status
 * "requested") — a integração com pagamento/estorno é trabalho futuro (T065+).
 *
 * Autorização: só o dono do pedido (Customer vinculado ao e-mail da sessão).
 */
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@workspace/auth";
import { prisma } from "@workspace/database";

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "nao_autenticado" }, { status: 401 });
  }

  const { id } = await params;

  const order = await prisma.order.findFirst({
    where: { id, deletedAt: null }
  });
  if (!order) {
    return NextResponse.json({ error: "pedido_nao_encontrado" }, { status: 404 });
  }

  // Autorização por dono: o Customer da sessão precisa ser o do pedido.
  const customer = await prisma.customer.findFirst({
    where: { email: session.user.email },
    select: { id: true }
  });
  if (!customer || order.customerId !== customer.id) {
    return NextResponse.json({ error: "nao_dono_do_pedido" }, { status: 403 });
  }

  // Estado imutável após a solicitação (prova do exercício no prazo).
  if (order.cancellationRequestedAt) {
    return NextResponse.json(
      { error: "ja_solicitado", protocolo: order.cancellationProtocol },
      { status: 400 }
    );
  }

  if (order.status !== "paid") {
    return NextResponse.json({ error: "status_nao_cancelavel" }, { status: 400 });
  }

  if (Date.now() - order.createdAt.getTime() > SEVEN_DAYS_MS) {
    return NextResponse.json({ error: "prazo_expirado" }, { status: 400 });
  }

  const protocolo = `AR-${Date.now()}-${order.id.slice(0, 8)}`;
  const updated = await prisma.order.update({
    where: { id },
    data: {
      cancellationRequestedAt: new Date(),
      cancellationProtocol: protocolo,
      cancellationStatus: "requested"
    }
  });

  return NextResponse.json(
    { protocolo, cancellationRequestedAt: updated.cancellationRequestedAt },
    { status: 200 }
  );
}
