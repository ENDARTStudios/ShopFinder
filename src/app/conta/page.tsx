import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@workspace/auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata: Metadata = {
  title: "Minha conta — ShopFinder"
};

/**
 * T043 — esqueleto da área do usuário. Conteúdo completo chega na T045;
 * /conta/pedidos é a T044.
 */
export default async function ContaPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    redirect("/login?callbackUrl=/conta");
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-16">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl">Minha conta</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm text-muted-foreground">
          <p>Área do usuário em construção. Em breve: perfil, idioma, moeda e notificações.</p>
          <div className="flex flex-col gap-2">
            <Button asChild variant="outline" className="justify-start">
              <Link href="/conta/pedidos">Meus pedidos</Link>
            </Button>
            <Button asChild variant="outline" className="justify-start">
              <Link href="/conta/configuracoes">Configurações</Link>
            </Button>
          </div>
          <p className="text-xs">
            <Link href="/" className="text-emerald-500 hover:underline">
              ← Voltar ao catálogo
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
