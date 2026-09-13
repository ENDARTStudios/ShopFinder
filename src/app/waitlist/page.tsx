import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { InstitutionalHeader } from "@/components/site/institutional-header";
import { WaitlistForm } from "@/components/waitlist/waitlist-form";

export const metadata: Metadata = {
  title: "ShopFinder — beta público"
};

export default async function WaitlistPage() {
  const t = await getTranslations("waitlist");

  return (
    <div className="min-h-screen">
      <InstitutionalHeader />
      <div className="mx-auto max-w-3xl px-4 py-20 text-center sm:px-6">
        <h1 className="mx-auto max-w-2xl text-4xl font-black tracking-tight sm:text-5xl">
          {t("title")}
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-lg text-muted-foreground">
          {t("subtitle")}
        </p>
        <div className="mt-10">
          <WaitlistForm />
        </div>
      </div>
    </div>
  );
}
