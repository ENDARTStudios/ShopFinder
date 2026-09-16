"use client";

/**
 * T101 Commerce Utility — header compacto utilitário.
 * Logo + busca PERSISTENTE (vai para /produtos?q=) + ações
 * (comparar/carrinho/conta via SiteHeader existente no landing para a home;
 * este header é o padrão para páginas internas) + Breadcrumbs export.
 *
 * Alvos de toque ≥44px, foco visível, sem decoração.
 */
import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import { cn } from "@/lib/utils";

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

export function Breadcrumbs({ items }: { items: BreadcrumbItem[] }) {
  return (
    <nav aria-label="Breadcrumb" className="mb-4">
      <ol className="flex flex-wrap items-center gap-1 text-xs text-muted-foreground">
        {items.map((item, i) => (
          <li key={`${item.label}-${i}`} className="flex items-center gap-1">
            {i > 0 && <span aria-hidden>/</span>}
            {item.href ? (
              <Link href={item.href} className="hover:text-foreground hover:underline">
                {item.label}
              </Link>
            ) : (
              <span aria-current="page" className="font-medium text-foreground">
                {item.label}
              </span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}

export function UtilityHeader({ className }: { className?: string }) {
  const router = useRouter();
  const [query, setQuery] = React.useState("");

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const q = query.trim();
    router.push(q ? `/produtos?q=${encodeURIComponent(q)}` : "/produtos");
  }

  return (
    <header
      className={cn(
        "sticky top-0 z-40 w-full border-b border-border bg-background",
        className
      )}
    >
      <div className="mx-auto flex h-14 max-w-7xl items-center gap-3 px-4 sm:px-6 lg:px-8">
        <Link href="/" className="flex shrink-0 items-center gap-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/icon.svg" alt="ShopFinder" width={28} height={28} className="h-7 w-7 rounded" />
          <span className="hidden text-sm font-bold tracking-tight sm:inline">ShopFinder</span>
        </Link>

        <form onSubmit={submit} role="search" className="min-w-0 flex-1">
          <div className="relative">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden
            />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar produtos, MPN, marcas…"
              aria-label="Buscar produtos, MPN, marcas"
              className="h-10 w-full rounded-md border border-input bg-background pl-9 pr-3 text-sm outline-none focus:border-ring focus:ring-[3px] focus:ring-ring/30"
            />
          </div>
        </form>

        <Link
          href="/compare"
          className="hidden h-10 items-center rounded-md px-3 text-sm font-medium hover:bg-muted sm:inline-flex"
        >
          Comparar
        </Link>
        <Link
          href="/conta"
          className="inline-flex h-10 items-center rounded-md px-3 text-sm font-medium hover:bg-muted"
        >
          Conta
        </Link>
      </div>
    </header>
  );
}
