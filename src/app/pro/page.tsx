import type { Metadata } from "next";
import Link from "next/link";
import { Check, Zap } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { WaitlistForm } from "@/components/waitlist/waitlist-form";
import { buildMetadata } from "@workspace/seo/metadata";

export const metadata: Metadata = buildMetadata({
  title: "ShopFinder Pro — plano com recursos avançados",
  description: "Alertas ilimitados, histórico sincronizado e prioridade de novos fornecedores.",
  path: "/pro"
});

const PERKS = [
  {
    title: "Alertas de preço ilimitados",
    description: "Acompanhe quantos produtos quiser, sem limite de alertas ativos."
  },
  {
    title: "Histórico sincronizado",
    description: "Seu histórico de buscas e visualizações segue sua conta em qualquer dispositivo."
  },
  {
    title: "Prioridade em novos fornecedores",
    description: "Novos marketplaces e distribuidores aparecem primeiro para assinantes."
  },
  {
    title: "Relatórios de queda de preço",
    description: "Resumo semanal das maiores quedas nos produtos que você acompanha."
  }
];

export default function ProPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
      <div className="mb-8 flex items-center gap-2">
        <Zap className="h-6 w-6 text-emerald-500" aria-hidden />
        <h1 className="text-3xl font-black tracking-tight">ShopFinder Pro</h1>
      </div>

      <p className="mb-8 text-muted-foreground">
        Plano pago <strong>em desenvolvimento</strong> — sem preço ou data definidos. Registre
        interesse abaixo e avisaremos quando houver novidades.
      </p>

      <p className="mb-4 text-xs uppercase tracking-wide text-muted-foreground">
        Recursos previstos (proposta — sujeitos a mudança):
      </p>
      <div className="mb-8 grid gap-4 sm:grid-cols-2">
        {PERKS.map((perk) => (
          <Card key={perk.title}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-sm">
                <Check className="h-4 w-4 text-emerald-500" aria-hidden />
                {perk.title}
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">{perk.description}</CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Quero ser avisado do Pro</CardTitle>
        </CardHeader>
        <CardContent>
          <WaitlistForm />
        </CardContent>
      </Card>

      <p className="mt-6 text-xs text-muted-foreground">
        Sem cartão de crédito agora. O plano gratuito continua existindo —{" "}
        <Link href="/" className="underline underline-offset-4">
          voltar ao catálogo
        </Link>
        .
      </p>
    </div>
  );
}
