import type { Metadata } from "next";
import { SessionProvider } from "@/components/site/session-provider";
import { buildMetadata } from "@workspace/seo/metadata";

// Área autenticada — nunca indexável.
export const metadata: Metadata = buildMetadata({
  title: "Dashboard",
  description: "Painel de operação do catálogo.",
  path: "/admin",
  noIndex: true
});

export const dynamic = "force-dynamic";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <SessionProvider>{children}</SessionProvider>;
}
