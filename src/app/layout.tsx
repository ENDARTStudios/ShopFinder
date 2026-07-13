import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { ThemeProvider } from "@/components/site/theme-provider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"]
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"]
});

export const metadata: Metadata = {
  title: "Dropshipping Platform — Modular Monolith",
  description:
    "Plataforma global de Dropshipping construída sobre Next.js 16, TypeScript, Tailwind v4, shadcn/ui e Turborepo. Modular Monolith com packages @workspace/*.",
  keywords: [
    "Dropshipping",
    "Next.js 16",
    "TypeScript",
    "Tailwind CSS",
    "shadcn/ui",
    "Turborepo",
    "Modular Monolith"
  ],
  authors: [{ name: "Dropshipping Platform Team" }],
  openGraph: {
    title: "Dropshipping Platform",
    description: "Plataforma global de Dropshipping — Modular Monolith",
    type: "website"
  },
  twitter: {
    card: "summary_large_image",
    title: "Dropshipping Platform",
    description: "Plataforma global de Dropshipping — Modular Monolith"
  }
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          {children}
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
