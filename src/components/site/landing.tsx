"use client";

import * as React from "react";
import {
  Boxes,
  CheckCircle2,
  CircleDashed,
  CircleDot,
  Database,
  Github,
  GitBranch,
  Layers,
  Package,
  Palette,
  Rocket,
  ScrollText,
  Settings2,
  Shield,
  Sparkles,
  Wrench
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger
} from "@/components/ui/accordion";

import { ModeToggle } from "@/components/site/mode-toggle";
import {
  ADRS,
  BACKLOG,
  DESIGN_SYSTEM,
  DOMAIN_CONTEXTS,
  DOMAIN_ENHANCEMENTS,
  DOMAIN_EVENTS,
  MODULES,
  PACKAGES,
  PERSISTENCE_CONVENTIONS,
  PERSISTENCE_LAYERS,
  PERSISTENCE_TABLES,
  PRINCIPLES,
  PROJECT_META,
  STACK,
  SUPPLIERS,
  type ItemStatus,
  type PackageItem
} from "@/components/site/data";

const STATUS_META: Record<ItemStatus, { label: string; icon: React.ReactNode; className: string }> =
  {
    done: {
      label: "Concluído",
      icon: <CheckCircle2 className="h-3.5 w-3.5" />,
      className: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20"
    },
    in_progress: {
      label: "Em progresso",
      icon: <CircleDot className="h-3.5 w-3.5" />,
      className: "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20"
    },
    pending: {
      label: "Pendente",
      icon: <CircleDashed className="h-3.5 w-3.5" />,
      className: "bg-muted text-muted-foreground border-border"
    }
  };

function StatusBadge({ status }: { status: ItemStatus }) {
  const meta = STATUS_META[status];
  return (
    <Badge variant="outline" className={`gap-1 font-medium ${meta.className}`}>
      {meta.icon}
      {meta.label}
    </Badge>
  );
}

function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 w-full border-b border-border/60 bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-foreground text-background">
            <Layers className="h-4 w-4" />
          </div>
          <div className="flex flex-col leading-none">
            <span className="text-sm font-semibold tracking-tight">{PROJECT_META.name}</span>
            <span className="text-[10px] uppercase tracking-widest text-muted-foreground">
              v{PROJECT_META.version} · Modular Monolith
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" asChild className="hidden sm:inline-flex">
            <a href="https://github.com" target="_blank" rel="noreferrer noopener">
              <Github className="mr-1.5 h-4 w-4" />
              GitHub
            </a>
          </Button>
          <ModeToggle />
        </div>
      </div>
    </header>
  );
}

function Hero() {
  const done = BACKLOG.filter((b) => b.status === "done").length;
  const inProgress = BACKLOG.filter((b) => b.status === "in_progress").length;
  const progress = Math.round(((done + inProgress * 0.5) / BACKLOG.length) * 100);

  return (
    <section className="relative isolate overflow-hidden border-b border-border/60">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 opacity-60"
        style={{
          backgroundImage:
            "radial-gradient(60rem 30rem at 80% -10%, rgba(16,185,129,0.18), transparent 60%), radial-gradient(40rem 20rem at 0% 100%, rgba(245,158,11,0.12), transparent 60%)"
        }}
      />
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-20 lg:px-8 lg:py-24">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <Badge
              variant="outline"
              className="mb-4 gap-1 border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
            >
              <Sparkles className="h-3.5 w-3.5" />
              Iteração: {PROJECT_META.iteration}
            </Badge>
            <h1 className="text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
              {PROJECT_META.name}
            </h1>
            <p className="mt-3 text-lg text-muted-foreground sm:text-xl">{PROJECT_META.tagline}</p>
            <p className="mt-6 max-w-2xl text-base leading-relaxed text-foreground/80">
              {PROJECT_META.summary}
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button asChild>
                <a href="#backlog">
                  <Rocket className="mr-1.5 h-4 w-4" />
                  Ver backlog
                </a>
              </Button>
              <Button variant="outline" asChild>
                <a href="#packages">
                  <Package className="mr-1.5 h-4 w-4" />
                  Explorar packages
                </a>
              </Button>
            </div>
          </div>

          <Card className="w-full max-w-sm border-border/60 bg-background/60 backdrop-blur">
            <CardHeader className="pb-3">
              <CardDescription>Progresso do backlog</CardDescription>
              <CardTitle className="text-3xl tabular-nums">{progress}%</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Progress value={progress} className="h-2" />
              <div className="grid grid-cols-3 gap-2 text-center">
                <Stat label="Concluído" value={done} />
                <Stat label="Em curso" value={inProgress} />
                <Stat label="Total" value={BACKLOG.length} />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-md border border-border/60 bg-muted/30 px-2 py-2">
      <div className="text-lg font-semibold tabular-nums">{value}</div>
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
    </div>
  );
}

function SectionHeading({
  icon,
  eyebrow,
  title,
  description
}: {
  icon: React.ReactNode;
  eyebrow: string;
  title: string;
  description: string;
}) {
  return (
    <div className="mb-8 flex items-start gap-4">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-foreground text-background">
        {icon}
      </div>
      <div>
        <div className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
          {eyebrow}
        </div>
        <h2 className="mt-1 text-2xl font-bold tracking-tight sm:text-3xl">{title}</h2>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground sm:text-base">{description}</p>
      </div>
    </div>
  );
}

function BacklogSection() {
  return (
    <section id="backlog" className="scroll-mt-20">
      <SectionHeading
        icon={<Rocket className="h-5 w-5" />}
        eyebrow="Roadmap"
        title="Backlog macro"
        description="25 itens ordenados por dependência técnica. Cada item vira uma iteração incremental com entrega observável."
      />
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {BACKLOG.map((item) => (
          <Card key={item.id} className="border-border/60 transition-colors hover:border-border">
            <CardContent className="flex items-start justify-between gap-3 p-4">
              <div className="flex items-start gap-3">
                <span className="mt-0.5 font-mono text-xs text-muted-foreground">{item.id}</span>
                <div>
                  <div className="text-sm font-medium leading-tight">{item.title}</div>
                </div>
              </div>
              <StatusBadge status={item.status} />
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  );
}

function ModulesSection() {
  return (
    <section id="modules" className="scroll-mt-20">
      <SectionHeading
        icon={<Boxes className="h-5 w-5" />}
        eyebrow="Modular Monolith"
        title="Módulos planejados"
        description="Cada módulo possui domínio, serviços, repositórios e HTTP próprios. Comunicação cross-módulo apenas via interfaces explícitas ou eventos de domínio."
      />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {MODULES.map((m) => (
          <Card key={m.name} className="border-border/60">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between gap-2">
                <CardTitle className="text-base">{m.name}</CardTitle>
                <Badge variant="outline" className="font-mono text-[10px] text-muted-foreground">
                  #{m.backlogId}
                </Badge>
              </div>
              <CardDescription className="text-sm leading-relaxed">{m.description}</CardDescription>
            </CardHeader>
            <CardContent className="pt-0">
              <StatusBadge status={m.status} />
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  );
}

function PackagesSection() {
  const categories: Array<{ key: PackageItem["category"]; label: string; color: string }> = [
    { key: "domain", label: "Domain", color: "text-emerald-600 dark:text-emerald-400" },
    { key: "infrastructure", label: "Infrastructure", color: "text-sky-600 dark:text-sky-400" },
    { key: "integration", label: "Integration", color: "text-amber-600 dark:text-amber-400" },
    { key: "tooling", label: "Tooling", color: "text-violet-600 dark:text-violet-400" }
  ];
  return (
    <section id="packages" className="scroll-mt-20">
      <SectionHeading
        icon={<Package className="h-5 w-5" />}
        eyebrow="Workspaces"
        title="Packages @workspace/*"
        description="16 packages compartilhados via Bun workspaces, agrupados por categoria. Cada package tem barrel export, tsconfig próprio e path alias TypeScript."
      />
      <div className="space-y-8">
        {categories.map((cat) => {
          const items = PACKAGES.filter((p) => p.category === cat.key);
          if (items.length === 0) return null;
          return (
            <div key={cat.key}>
              <div className="mb-3 flex items-center gap-2">
                <h3 className={`text-sm font-semibold uppercase tracking-wider ${cat.color}`}>
                  {cat.label}
                </h3>
                <Badge variant="outline" className="font-mono text-[10px]">
                  {items.length}
                </Badge>
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {items.map((p) => (
                  <Card key={p.name} className="border-border/60">
                    <CardHeader className="pb-2">
                      <div className="flex items-center gap-2">
                        <div className="flex h-7 w-7 items-center justify-center rounded-md bg-muted text-xs font-mono">
                          {p.name.slice(0, 2)}
                        </div>
                        <CardTitle className="font-mono text-sm">{p.scope}</CardTitle>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm leading-relaxed text-muted-foreground">
                        {p.description}
                      </p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function DomainSection() {
  return (
    <section id="domain" className="scroll-mt-20 space-y-12">
      <div>
        <SectionHeading
          icon={<GitBranch className="h-5 w-5" />}
          eyebrow="DDD"
          title="Bounded Contexts"
          description="8 contextos delimitados com aggregate roots, entities, value objects e domain events. Comunicação cross-contexto apenas via interfaces explícitas ou eventos."
        />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {DOMAIN_CONTEXTS.map((ctx) => (
            <Card key={ctx.name} className="border-border/60">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between gap-2">
                  <CardTitle className="text-base">{ctx.name}</CardTitle>
                  <StatusBadge status={ctx.status} />
                </div>
                <CardDescription className="font-mono text-[10px]">{ctx.package}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                <p className="text-xs leading-relaxed text-muted-foreground">
                  {ctx.responsibility}
                </p>
                {ctx.aggregates.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {ctx.aggregates.map((a) => (
                      <Badge
                        key={a}
                        variant="outline"
                        className="bg-emerald-500/10 text-[10px] font-mono text-emerald-700 dark:text-emerald-400"
                      >
                        {a}
                      </Badge>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      <div>
        <SectionHeading
          icon={<GitBranch className="h-5 w-5" />}
          eyebrow="Eventos"
          title="Domain Events Catalog"
          description="Eventos que cruzam fronteiras de contexto. Cada evento tem schema Zod em @workspace/contracts/events para validação em trust boundaries."
        />
        <Card className="border-border/60">
          <CardContent className="p-0">
            <ScrollArea className="h-80">
              <div className="divide-y divide-border/60">
                {DOMAIN_EVENTS.map((evt) => (
                  <div
                    key={evt.type}
                    className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-6"
                  >
                    <div className="flex items-center gap-3">
                      <code className="rounded bg-muted px-2 py-0.5 font-mono text-xs">
                        {evt.type}
                      </code>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span className="font-medium text-foreground">{evt.emitter}</span>
                      <span aria-hidden>→</span>
                      <span>{evt.consumers.join(", ")}</span>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
    </section>
  );
}

function DesignSystemSection() {
  return (
    <section id="design-system" className="scroll-mt-20 space-y-12">
      <div>
        <SectionHeading
          icon={<Palette className="h-5 w-5" />}
          eyebrow="DDD UI"
          title="Domain-Driven Design System"
          description="Componentes que refletem a linguagem ubíqua do domínio. Cada camada mapeia conceitos de negócio — ProductCard reflete ProductListItemDTO, OrderStatusBadge reflete OrderStatus."
        />
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {DESIGN_SYSTEM.map((layer) => (
            <Card key={layer.name} className="border-border/60">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between gap-2">
                  <CardTitle className={`font-mono text-sm ${layer.color}`}>
                    @workspace/ui/{layer.name}
                  </CardTitle>
                  <Badge variant="outline" className="font-mono text-[10px]">
                    {layer.components.length}
                  </Badge>
                </div>
                <CardDescription className="text-sm leading-relaxed">
                  {layer.description}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-1.5">
                  {layer.components.map((c) => (
                    <code
                      key={c}
                      className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-mono text-muted-foreground"
                    >
                      {c}
                    </code>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      <div>
        <SectionHeading
          icon={<Shield className="h-5 w-5" />}
          eyebrow="Reforços"
          title="Domain Architecture Enhancements"
          description="6 reforços de arquitetura aplicados nesta iteração para evitar erosão estrutural e bugs de identity."
        />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {DOMAIN_ENHANCEMENTS.map((e) => (
            <Card key={e.name} className="border-border/60">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between gap-2">
                  <CardTitle className="text-base">{e.name}</CardTitle>
                  <StatusBadge status={e.status} />
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm leading-relaxed text-muted-foreground">{e.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}

function PersistenceSection() {
  const contexts = Array.from(new Set(PERSISTENCE_TABLES.map((t) => t.context)));
  const contextColors: Record<string, string> = {
    Catalog: "text-emerald-600 dark:text-emerald-400",
    Customer: "text-sky-600 dark:text-sky-400",
    Cart: "text-amber-600 dark:text-amber-400",
    Checkout: "text-violet-600 dark:text-violet-400",
    Order: "text-rose-600 dark:text-rose-400",
    Payment: "text-cyan-600 dark:text-cyan-400",
    Supplier: "text-orange-600 dark:text-orange-400",
    Store: "text-pink-600 dark:text-pink-400",
    Identity: "text-indigo-600 dark:text-indigo-400",
    Integration: "text-teal-600 dark:text-teal-400",
    "Cross-cutting": "text-fuchsia-600 dark:text-fuchsia-400",
    Lookup: "text-lime-600 dark:text-lime-400"
  };
  return (
    <section id="persistence" className="scroll-mt-20 space-y-12">
      {/* Tables */}
      <div>
        <SectionHeading
          icon={<Database className="h-5 w-5" />}
          eyebrow="04B.1 · Prisma + Seed"
          title="Tabelas (42)"
          description="Prisma schema completo — 42 tabelas em 11 contextos. Migration 0001_init gerada (933 linhas, 71 índices, 21 unique constraints). Seed executado: 12 currencies, 20 countries, 1 store, 1 admin. SQLite dev → PostgreSQL prod."
        />
        <div className="space-y-6">
          {contexts.map((ctx) => {
            const tables = PERSISTENCE_TABLES.filter((t) => t.context === ctx);
            return (
              <div key={ctx}>
                <div className="mb-3 flex items-center gap-2">
                  <h3
                    className={`text-sm font-semibold uppercase tracking-wider ${contextColors[ctx] ?? ""}`}
                  >
                    {ctx}
                  </h3>
                  <Badge variant="outline" className="font-mono text-[10px]">
                    {tables.length} {tables.length === 1 ? "tabela" : "tabelas"}
                  </Badge>
                </div>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {tables.map((t) => (
                    <Card key={t.name} className="border-border/60">
                      <CardHeader className="pb-2">
                        <CardTitle className="font-mono text-sm">{t.name}</CardTitle>
                        <CardDescription className="text-xs leading-relaxed">
                          {t.description}
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="pt-0">
                        <div className="flex flex-wrap gap-1">
                          {t.keyColumns.map((c) => (
                            <code
                              key={c}
                              className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-mono text-muted-foreground"
                            >
                              {c}
                            </code>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Conventions */}
      <div>
        <SectionHeading
          icon={<Shield className="h-5 w-5" />}
          eyebrow="Convenções"
          title="Persistência — Convenções (17)"
          description="17 convenções aplicadas: 10 originais + 7 dos ajustes (Multi-Store, User/Customer, Price History, Inventory Reservation, Secret References, Idempotency)."
        />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {PERSISTENCE_CONVENTIONS.map((c) => (
            <Card key={c.name} className="border-border/60">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">{c.name}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <p className="text-sm leading-relaxed text-muted-foreground">{c.description}</p>
                <pre className="overflow-x-auto rounded bg-muted px-3 py-2 text-[11px] font-mono text-muted-foreground">
                  {c.example}
                </pre>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Layers (Repository / QueryService / UnitOfWork) */}
      <div>
        <SectionHeading
          icon={<Layers className="h-5 w-5" />}
          eyebrow="Interfaces"
          title="Camadas de Acesso a Dados"
          description="Separação Query/Command (Rec 2). Repository escreve aggregates; QueryService lê DTOs; UnitOfWork abstrai transações (Rec 1)."
        />
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          {PERSISTENCE_LAYERS.map((layer) => (
            <Card key={layer.name} className="border-border/60">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between gap-2">
                  <CardTitle className="text-base">{layer.name}</CardTitle>
                  <Badge
                    variant="outline"
                    className={
                      layer.returnsAggregate
                        ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
                        : "border-sky-500/30 bg-sky-500/10 text-sky-700 dark:text-sky-400"
                    }
                  >
                    {layer.returnsAggregate ? "Aggregate" : "DTO"}
                  </Badge>
                </div>
                <CardDescription className="text-sm leading-relaxed">
                  {layer.description}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-1.5">
                  {layer.interfaces.map((iface) => (
                    <code
                      key={iface}
                      className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-mono text-muted-foreground"
                    >
                      {iface}
                    </code>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}

function AdrsSection() {
  return (
    <section id="adrs" className="scroll-mt-20">
      <SectionHeading
        icon={<ScrollText className="h-5 w-5" />}
        eyebrow="Decisões"
        title="Architecture Decision Records"
        description="Cada decisão arquitetural importante é registrada como um ADR imutável. Para reverter, cria-se um novo ADR que referencia o anterior."
      />
      <Card className="border-border/60">
        <CardContent className="p-0">
          <Accordion type="single" collapsible className="w-full">
            {ADRS.map((adr) => (
              <AccordionItem
                key={adr.id}
                value={adr.id}
                className="border-border/60 px-4 last:border-b-0 sm:px-6"
              >
                <AccordionTrigger className="hover:no-underline">
                  <div className="flex flex-1 items-center gap-3 pr-3 text-left">
                    <Badge variant="outline" className="font-mono text-[10px] tabular-nums">
                      ADR-{adr.id}
                    </Badge>
                    <span className="text-sm font-medium">{adr.title}</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="text-sm leading-relaxed text-muted-foreground">
                  <div className="mb-2 flex flex-wrap items-center gap-2 text-xs">
                    <Badge
                      variant="outline"
                      className="border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
                    >
                      {adr.status}
                    </Badge>
                    <span className="font-mono text-muted-foreground">{adr.date}</span>
                  </div>
                  <p>{adr.summary}</p>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </CardContent>
      </Card>
    </section>
  );
}

function StackSection() {
  return (
    <section id="stack" className="scroll-mt-20">
      <SectionHeading
        icon={<Settings2 className="h-5 w-5" />}
        eyebrow="Tech Stack"
        title="Stack tecnológico"
        description="Stack opinativa com prioridade Qualidade > Escalabilidade > Custo Zero > Simplicidade."
      />
      <Card className="border-border/60">
        <CardContent className="p-0">
          <div className="grid grid-cols-1 divide-y divide-border/60 sm:grid-cols-2 sm:divide-y-0 sm:divide-x">
            <div className="divide-y divide-border/60">
              {STACK.slice(0, Math.ceil(STACK.length / 2)).map((s) => (
                <StackRow key={s.concern} {...s} />
              ))}
            </div>
            <div className="divide-y divide-border/60">
              {STACK.slice(Math.ceil(STACK.length / 2)).map((s) => (
                <StackRow key={s.concern} {...s} />
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </section>
  );
}

function StackRow({ concern, choice }: { concern: string; choice: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4 px-4 py-3 sm:px-6">
      <span className="text-xs uppercase tracking-wider text-muted-foreground">{concern}</span>
      <span className="text-right text-sm font-medium">{choice}</span>
    </div>
  );
}

function PrinciplesSection() {
  return (
    <section id="principles" className="scroll-mt-20">
      <SectionHeading
        icon={<Shield className="h-5 w-5" />}
        eyebrow="Princípios"
        title="Princípios de engenharia"
        description="Princípios que governam decisões de implementação no dia-a-dia."
      />
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {PRINCIPLES.map((p) => (
          <div key={p.name} className="rounded-lg border border-border/60 bg-card/40 p-4">
            <div className="text-sm font-semibold">{p.name}</div>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{p.description}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function SuppliersSection() {
  const categories = Array.from(new Set(SUPPLIERS.map((s) => s.category)));
  return (
    <section id="suppliers" className="scroll-mt-20">
      <SectionHeading
        icon={<Wrench className="h-5 w-5" />}
        eyebrow="Integrações"
        title="Fornecedores (Dropshipping)"
        description="Cada fornecedor é integrado via Adapter Pattern em @workspace/integrations. Novos fornecedores são adicionados sem tocar nos módulos de negócio."
      />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {categories.map((cat) => (
          <Card key={cat} className="border-border/60">
            <CardHeader className="pb-2">
              <CardDescription>{cat}</CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-44 pr-3">
                <ul className="space-y-1.5">
                  {SUPPLIERS.filter((s) => s.category === cat).map((s) => (
                    <li key={s.name} className="flex items-center gap-2 text-sm">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                      {s.name}
                    </li>
                  ))}
                </ul>
              </ScrollArea>
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  );
}

function WorkspaceSection() {
  return (
    <section id="workspace" className="scroll-mt-20">
      <SectionHeading
        icon={<Layers className="h-5 w-5" />}
        eyebrow="Layout"
        title="Estrutura do workspace"
        description="Layout do monorepo conforme ADR-0002 e ADR-0003. A raiz atua como apps/web (adaptação ao sandbox)."
      />
      <Card className="border-border/60 overflow-hidden">
        <CardContent className="p-0">
          <ScrollArea className="h-96">
            <pre className="m-0 overflow-x-auto p-6 text-xs leading-relaxed text-foreground/90 sm:text-sm">
              {`.
├── src/                      ← apps/web (Next.js)
│   ├── app/                  ← App Router (página única visível: /)
│   ├── components/
│   │   ├── ui/               ← shadcn/ui primitives
│   │   └── site/             ← landing page composition
│   ├── lib/                  ← runtime singletons (db, auth, ...)
│   └── hooks/
│
├── packages/                 ← @workspace/*
│   ├── ui/                   ← design-system primitives
│   ├── shared/               ← cross-cutting utils
│   ├── types/                ← shared TS types
│   ├── config/               ← tsconfig / eslint / prettier presets
│   ├── database/             ← Prisma client & repositories
│   ├── auth/                 ← Auth.js config & adapters
│   ├── validation/           ← Zod schemas per domain
│   ├── analytics/            ← GA4 / GSC / Clarity / Sentry / UptimeRobot
│   ├── seo/                  ← JSON-LD, sitemap, robots, metadata
│   ├── ai/                   ← decoupled AI provider layer
│   └── integrations/         ← dropshipping supplier adapters
│
├── docs/                     ← architecture + ADRs
│   ├── README.md
│   ├── architecture.md
│   ├── decisions.md
│   └── adr/
│       ├── 0001-modular-monolith.md
│       ├── 0002-monorepo-workspaces.md
│       ├── 0003-sandbox-constraints-adaptation.md
│       └── 0004-ai-layer-decoupled.md
│
├── scripts/                  ← operational scripts
├── .github/workflows/        ← CI
│   └── ci.yml
│
├── prisma/                   ← schema & migrations
│
├── .husky/                   ← git hooks (pre-commit, commit-msg)
├── .env.example              ← env strategy (committed, no secrets)
├── .editorconfig
├── .prettierrc.mjs
├── .prettierignore
├── .lintstagedrc.mjs
├── commitlint.config.mjs
├── turbo.json                ← Turborepo pipelines
├── tsconfig.json             ← extends @workspace/config
└── package.json              ← workspaces + scripts`}
            </pre>
          </ScrollArea>
        </CardContent>
      </Card>
    </section>
  );
}

function SiteFooter() {
  return (
    <footer className="mt-auto border-t border-border/60 bg-muted/20">
      <div className="mx-auto flex max-w-7xl flex-col items-start justify-between gap-4 px-4 py-8 sm:flex-row sm:items-center sm:px-6 lg:px-8">
        <div>
          <div className="text-sm font-semibold">
            {PROJECT_META.name}
            <span className="ml-2 font-mono text-xs text-muted-foreground">
              v{PROJECT_META.version}
            </span>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">{PROJECT_META.tagline}</p>
        </div>
        <Separator orientation="vertical" className="hidden h-10 sm:block" />
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
          <span>Next.js 16</span>
          <span aria-hidden>·</span>
          <span>TypeScript 5</span>
          <span aria-hidden>·</span>
          <span>Tailwind v4</span>
          <span aria-hidden>·</span>
          <span>shadcn/ui</span>
          <span aria-hidden>·</span>
          <span>Turborepo</span>
          <span aria-hidden>·</span>
          <span>Bun</span>
        </div>
      </div>
    </footer>
  );
}

export function Landing() {
  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main className="flex-1">
        <Hero />

        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
          <Tabs defaultValue="persistence" className="w-full">
            <TabsList className="grid w-full grid-cols-2 sm:grid-cols-5 lg:grid-cols-10">
              <TabsTrigger value="persistence">Persistence</TabsTrigger>
              <TabsTrigger value="design-system">Design System</TabsTrigger>
              <TabsTrigger value="domain">Domain</TabsTrigger>
              <TabsTrigger value="backlog">Backlog</TabsTrigger>
              <TabsTrigger value="modules">Módulos</TabsTrigger>
              <TabsTrigger value="packages">Packages</TabsTrigger>
              <TabsTrigger value="adrs">ADRs</TabsTrigger>
              <TabsTrigger value="stack">Stack</TabsTrigger>
              <TabsTrigger value="principles">Princípios</TabsTrigger>
              <TabsTrigger value="more">+ Extras</TabsTrigger>
            </TabsList>

            <TabsContent value="persistence" className="mt-10">
              <PersistenceSection />
            </TabsContent>
            <TabsContent value="design-system" className="mt-10">
              <DesignSystemSection />
            </TabsContent>
            <TabsContent value="domain" className="mt-10">
              <DomainSection />
            </TabsContent>
            <TabsContent value="backlog" className="mt-10">
              <BacklogSection />
            </TabsContent>
            <TabsContent value="modules" className="mt-10">
              <ModulesSection />
            </TabsContent>
            <TabsContent value="packages" className="mt-10">
              <PackagesSection />
            </TabsContent>
            <TabsContent value="adrs" className="mt-10">
              <AdrsSection />
            </TabsContent>
            <TabsContent value="stack" className="mt-10">
              <StackSection />
            </TabsContent>
            <TabsContent value="principles" className="mt-10">
              <PrinciplesSection />
            </TabsContent>
            <TabsContent value="more" className="mt-10 space-y-16">
              <SuppliersSection />
              <WorkspaceSection />
            </TabsContent>
          </Tabs>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
