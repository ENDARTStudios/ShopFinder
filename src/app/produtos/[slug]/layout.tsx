/**
 * @workspace/app — Layout de /produtos/[slug]
 *
 * Verifica a existência do produto ANTES do flush do shell de streaming.
 * O loading.tsx do segmento faz o shell sair em HTTP 200 cedo demais — o
 * notFound() do Page Component chega tarde e vira soft-404 (T032). O layout
 * faz parte do shell: notFound() aqui produz 404 real.
 *
 * Query mínima de existência (id apenas) — os dados completos ficam na page.
 */
import { notFound } from "next/navigation";
import { prisma } from "@workspace/database/client";

export default async function ProductSlugLayout({
  children,
  params
}: {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const product = await prisma.product.findFirst({
    where: { slug, deletedAt: null, status: "published" },
    select: { id: true }
  });

  if (!product) {
    notFound();
  }

  return children;
}
