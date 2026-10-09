import { Link, useRouterState } from "@tanstack/react-router";
import {
  Bell,
  Building2,
  ChevronDown,
  Compass,
  GaugeCircle,
  LifeBuoy,
  Lightbulb,
  Menu,
  MessageSquareText,
  Settings,
  ShieldAlert,
  SlidersHorizontal,
  Sparkles,
} from "lucide-react";
import { useState, type ReactNode } from "react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { notifications } from "@/lib/mock-data";
import { useIdentity } from "@/hooks/use-identity";
import { profileInitials } from "@/lib/api/identity";
import { cn } from "@/lib/utils";

const navItems = [
  { to: "/", label: "Visão Geral", icon: GaugeCircle },
  { to: "/linha-do-tempo", label: "Linha do Tempo", icon: Compass },
  { to: "/riscos", label: "Riscos", icon: ShieldAlert },
  { to: "/oportunidades", label: "Oportunidades", icon: Lightbulb },
  { to: "/simulador", label: "Simulações", icon: SlidersHorizontal },
  { to: "/assistente", label: "Assistente", icon: MessageSquareText },
  { to: "/configuracoes", label: "Configurações", icon: Settings },
] as const;

function Brand() {
  return (
    <div className="flex items-center gap-2.5">
      <div className="grid size-9 place-items-center rounded-xl bg-[image:var(--gradient-brand)]">
        <Sparkles className="size-4.5 text-primary-foreground" />
      </div>
      <div className="leading-tight">
        <p className="font-display text-base font-semibold tracking-tight text-sidebar-accent-foreground">
          NEXORA
        </p>
        <p className="text-[11px] text-sidebar-foreground/60">Inteligência operacional</p>
      </div>
    </div>
  );
}

function NavList({ onNavigate }: { onNavigate?: (() => void) | undefined }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <nav className="flex flex-col gap-1">
      {navItems.map((item) => {
        const active = item.to === "/" ? pathname === "/" : pathname.startsWith(item.to);
        return (
          <Link
            key={item.to}
            to={item.to}
            onClick={onNavigate}
            className={cn(
              "group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200",
              active
                ? "bg-sidebar-accent text-sidebar-accent-foreground shadow-[inset_2px_0_0_0_var(--sidebar-primary)]"
                : "text-sidebar-foreground/75 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground",
            )}
          >
            <item.icon
              className={cn(
                "size-4.5 transition-colors",
                active ? "text-sidebar-primary" : "text-sidebar-foreground/55",
              )}
            />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

function SidebarFooterCard() {
  const { company } = useIdentity();
  return (
    <div className="rounded-2xl border border-sidebar-border/70 bg-sidebar-accent/45 p-4">
      <div className="flex items-center gap-2 text-sidebar-accent-foreground">
        <LifeBuoy className="size-4 text-sidebar-primary" />
        <p className="text-sm font-semibold">Ambiente de demonstração</p>
      </div>
      <p className="mt-1.5 text-xs leading-relaxed text-sidebar-foreground/65">
        Explore riscos e oportunidades de {company.name}. Algumas áreas permanecem em demonstração.
      </p>
      <Button asChild variant="secondary" size="sm" className="mt-3 w-full">
        <Link to="/simulador" search={{}}>
          Simular uma decisão
        </Link>
      </Button>
    </div>
  );
}

function SidebarContent({ onNavigate }: { onNavigate?: (() => void) | undefined }) {
  return (
    <div className="flex h-full flex-col gap-6 bg-sidebar p-5">
      <Brand />
      <div className="flex-1 overflow-y-auto">
        <p className="px-3 pb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-sidebar-foreground/40">
          Operação
        </p>
        <NavList onNavigate={onNavigate} />
      </div>
      <SidebarFooterCard />
    </div>
  );
}

function CompanySwitcher() {
  const { company, companySource } = useIdentity();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          aria-label="Empresa atual"
          data-company-source={companySource}
          className="flex items-center gap-2.5 rounded-xl border border-border bg-card px-3 py-2 text-left transition-colors hover:border-primary/40 hover:bg-accent"
        >
          <span className="grid size-7 place-items-center rounded-lg bg-primary-soft text-primary">
            <Building2 className="size-4" />
          </span>
          <span className="hidden leading-tight sm:block">
            <span className="block text-sm font-semibold">
              {companySource === "loading" ? "Carregando empresa…" : company.name}
            </span>
            <span className="block text-[11px] text-muted-foreground">{company.segment}</span>
          </span>
          <ChevronDown className="size-4 text-muted-foreground" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-64">
        <DropdownMenuLabel>Empresa atual</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {[company].map((c) => (
          <DropdownMenuItem key={c.id} disabled>
            <div>
              <p className="text-sm font-medium">{c.name}</p>
              <p className="text-xs text-muted-foreground">{c.segment}</p>
            </div>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function NotificationsMenu() {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          aria-label="Notificações"
          className="relative grid size-10 place-items-center rounded-xl border border-border bg-card text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
        >
          <Bell className="size-4.5" />
          <span className="absolute right-2.5 top-2.5 size-2 rounded-full bg-danger ring-2 ring-card" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <DropdownMenuLabel>Notificações</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {notifications.map((n) => (
          <DropdownMenuItem key={n.title} asChild>
            <Link to={n.to} className="items-start gap-3 py-2.5">
              <span
                className={cn(
                  "mt-1.5 size-2 shrink-0 rounded-full",
                  n.tone === "danger" && "bg-danger",
                  n.tone === "warning" && "bg-warning",
                  n.tone === "insight" && "bg-insight",
                )}
              />
              <span>
                <span className="block text-sm font-medium">{n.title}</span>
                <span className="block text-xs text-muted-foreground">{n.hint}</span>
              </span>
            </Link>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function UserMenu() {
  const { settings: profile } = useIdentity();
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="flex items-center gap-2.5 rounded-xl border border-border bg-card py-1.5 pl-1.5 pr-3 transition-colors hover:border-primary/40">
          <span className="grid size-8 place-items-center rounded-lg bg-[image:var(--gradient-brand)] text-xs font-semibold text-primary-foreground">
            {profileInitials(profile.name)}
          </span>
          <span className="hidden leading-tight md:block">
            <span className="block text-sm font-semibold">{profile.name}</span>
            <span className="block text-[11px] text-muted-foreground">{profile.role}</span>
          </span>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>
          <p className="text-sm font-medium">{profile.name}</p>
          <p className="text-xs font-normal text-muted-foreground">{profile.email}</p>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link to="/configuracoes">Configurações</Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link to="/apresentacao">Voltar à apresentação</Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const identity = useIdentity();

  return (
    <div className="flex min-h-screen bg-background">
      <aside className="sticky top-0 hidden h-screen w-[264px] shrink-0 lg:block">
        <SidebarContent />
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-border bg-background/85 px-4 py-3 backdrop-blur-md md:px-8">
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <Button variant="outline" size="icon" className="lg:hidden">
                <Menu className="size-5" />
                <span className="sr-only">Abrir menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-[280px] border-sidebar-border p-0">
              <SheetTitle className="sr-only">Navegação</SheetTitle>
              <SidebarContent onNavigate={() => setOpen(false)} />
            </SheetContent>
          </Sheet>

          <CompanySwitcher />
          <div className="ml-auto flex items-center gap-2.5">
            <NotificationsMenu />
            <UserMenu />
          </div>
        </header>

        <div
          role="status"
          aria-live="polite"
          data-identity-source={identity.source}
          className="border-b bg-primary-soft/40 px-4 py-2 text-xs text-muted-foreground md:px-8"
        >
          {identity.source === "loading"
            ? "Carregando empresa, perfil e preferências…"
            : identity.source === "api"
              ? `Perfil e preferências carregados · ${identity.company.name}`
              : "Identidade indisponível · Perfil e preferências de demonstração"}{" "}
          {identity.source === "mock" ? (
            <button
              type="button"
              className="ml-2 font-semibold text-primary"
              disabled={identity.isFetching}
              onClick={identity.retry}
            >
              {identity.isFetching ? "Tentando novamente…" : "Tentar novamente"}
            </button>
          ) : null}
          <Link to="/apresentacao" className="ml-2 font-semibold text-primary">
            Conheça a Nexora
          </Link>
        </div>
        <main className="surface-canvas flex-1 px-4 py-6 md:px-8 md:py-8">{children}</main>
      </div>
    </div>
  );
}
