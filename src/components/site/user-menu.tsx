"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import { useTranslations } from "next-intl";
import { SessionProvider } from "./session-provider";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";

/**
 * UserMenu (T043) — reflete a sessão NextAuth no header da vitrine.
 *
 * - Sem sessão: botão "Entrar" → /login (comportamento anterior).
 * - Com sessão: avatar + email truncado + dropdown acessível (Radix:
 *   ARIA, navegação por teclado, Escape) com Minha conta / Meus pedidos /
 *   Sair. Após login na página /login, o router.refresh() de lá atualiza
 *   a sessão aqui sem refresh manual do navegador.
 */
function UserMenuInner() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const t = useTranslations("nav");

  if (status === "loading" || status === "unauthenticated" || !session?.user) {
    return (
      <Link href="/login" className="hidden sm:inline-flex">
        <Button variant="ghost" size="sm">
          {t("login")}
        </Button>
      </Link>
    );
  }

  const email = session.user.email ?? session.user.name ?? "conta";
  const initial = email.slice(0, 1).toUpperCase();

  const handleSignOut = async () => {
    await signOut({ redirect: false });
    router.push("/");
    router.refresh();
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="hidden gap-2 sm:inline-flex"
          aria-label={email}
        >
          <Avatar className="h-6 w-6">
            <AvatarFallback className="bg-emerald-500/90 text-[10px] font-bold text-white">
              {initial}
            </AvatarFallback>
          </Avatar>
          <span className="max-w-[120px] truncate">{email.split("@")[0]}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52">
        <DropdownMenuLabel className="truncate normal-case">{email}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/conta">{t("account")}</Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/conta/pedidos">{t("orders")}</Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => void handleSignOut()}>{t("signOut")}</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function UserMenu() {
  return (
    <SessionProvider>
      <UserMenuInner />
    </SessionProvider>
  );
}
