import type { Metadata } from "next";
import { SessionProvider } from "@/components/site/session-provider";

export const metadata: Metadata = {
  title: "Dashboard · ShopFinder"
};

export const dynamic = "force-dynamic";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <SessionProvider>{children}</SessionProvider>;
}
