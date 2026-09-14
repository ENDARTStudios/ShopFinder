"use client";
import Link from "next/link";
import { XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function CancelPage() {
  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="max-w-md text-center">
        <XCircle className="mx-auto h-16 w-16 text-amber-500" />
        <h1 className="mt-6 text-3xl font-black tracking-tight">Pagamento cancelado</h1>
        <p className="mt-2 text-muted-foreground">O pagamento não foi concluído. Seu carrinho continua salvo.</p>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Button asChild className="bg-emerald-500 hover:bg-emerald-600">
            <Link href="/checkout">Tentar de novo</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/">Ver produtos</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
