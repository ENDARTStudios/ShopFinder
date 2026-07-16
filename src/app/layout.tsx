import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { ThemeProvider } from "@/components/site/theme-provider";
import { SiteFooter } from "@/components/site/site-footer";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages, getTranslations } from "next-intl/server";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"]
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"]
});

// ── Brand metadata (single source of truth: PROJECT_META) ───
//
// All browser/PWA/share metadata derives from the same brand identity
// defined in @/components/site/data. Update PROJECT_META there to bump
// the brand everywhere (header, hero, footer, manifest, OG, Twitter).

const BRAND_NAME = "ShopFinder";
const BRAND_DESCRIPTION =
  "ShopFinder — Catalog Intelligence Platform baseada em IA. Transforma dados heterogêneos de produtos em um catálogo canônico, enriquecido, validado e pronto para distribuição em múltiplos canais.";
const BRAND_THEME_COLOR = "#0F172A"; // slate-900, matches icon.svg background

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("hero");
  const tagline = t("tagline");

  return {
    metadataBase: new URL("https://shopfinder.local"),
    title: {
      default: `${BRAND_NAME} — ${tagline}`,
      template: `%s · ${BRAND_NAME}`
    },
    description: BRAND_DESCRIPTION,
    applicationName: BRAND_NAME,
    keywords: [
      "ShopFinder",
      "Catalog Intelligence",
      "Compra inteligente",
      "Smart shopping",
      "Next.js 16",
      "TypeScript",
      "Tailwind CSS",
      "shadcn/ui",
      "Turborepo"
    ],
    authors: [{ name: "END ART" }],
    creator: "END ART",
    publisher: "END ART",
    manifest: "/manifest.webmanifest",
    appleWebApp: {
      capable: true,
      statusBarStyle: "default",
      title: BRAND_NAME
    },
    formatDetection: {
      telephone: false
    },
    openGraph: {
      title: `${BRAND_NAME} — ${tagline}`,
      description:
        "Catalog Intelligence Platform baseada em IA. Catálogo canônico, enriquecido e pronto para distribuição.",
      type: "website",
      siteName: BRAND_NAME,
      locale: "pt_BR"
    },
    twitter: {
      card: "summary_large_image",
      title: `${BRAND_NAME} — ${tagline}`,
      description: "Catalog Intelligence Platform baseada em IA."
    }
  };
}

export const viewport: Viewport = {
  themeColor: BRAND_THEME_COLOR,
  colorScheme: "light dark",
  width: "device-width",
  initialScale: 1
};

export default async function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = await getLocale();
  const messages = await getMessages();

  return (
    <html lang={locale} suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        <NextIntlClientProvider locale={locale} messages={messages}>
          <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange
          >
            <div className="flex min-h-screen flex-col">
              {children}
              <SiteFooter />
            </div>
            <Toaster />
          </ThemeProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
