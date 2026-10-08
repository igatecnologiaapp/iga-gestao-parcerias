import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import {
  BriefcaseBusiness,
  ChevronDown,
  Handshake,
  Home,
  KeyRound,
  LogOut,
  Menu,
  PackageSearch,
  ScrollText,
  Settings,
  ShieldCheck,
  UserCircle,
  type LucideIcon,
} from "lucide-react";
import { useMemo, useState, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { useMyContext } from "@/hooks/use-foundation";

/**
 * Navegação por categorias. A visibilidade usa as permissões vindas do servidor
 * apenas para exibição — o banco (RLS/RPC) continua sendo a camada de segurança.
 * `perms` vazio = visível a qualquer membro ativo.
 */
type NavItem = { label: string; to: string; tab?: string; perms: string[] };
type NavGroup = { label: string; icon: LucideIcon; items: NavItem[] };

const NAV: NavGroup[] = [
  {
    label: "Início",
    icon: Home,
    items: [{ label: "Dashboard", to: "/painel", perms: [] }],
  },
  {
    label: "Parceiros",
    icon: Handshake,
    items: [
      { label: "Candidatos", to: "/candidatos", perms: ["candidate.read", "candidate.manage"] },
      { label: "Parceiros", to: "/parceiros", perms: ["partner.read", "partner.manage"] },
      { label: "Onboarding", to: "/parceiros", tab: "onboarding", perms: ["partner.read", "onboarding.manage"] },
      { label: "Treinamentos e certificações", to: "/parceiros", tab: "capacitacao", perms: ["partner.read", "training.manage", "certification.manage"] },
      { label: "Acompanhamento 90 dias", to: "/parceiros", tab: "acompanhamento", perms: ["partner.read", "partner.manage"] },
      { label: "Territórios", to: "/territorios", perms: ["territory.read", "territory.manage"] },
    ],
  },
  {
    label: "Comercial",
    icon: BriefcaseBusiness,
    items: [
      { label: "Leads", to: "/leads", perms: ["lead.read", "lead.manage"] },
      { label: "Proteção e conflitos", to: "/leads", tab: "protecao", perms: ["lead.read", "lead.protection.manage"] },
      { label: "Oportunidades e pipeline", to: "/oportunidades", perms: ["opportunity.read", "opportunity.manage"] },
      { label: "Atividades comerciais", to: "/oportunidades", tab: "atividades", perms: ["opportunity.read", "activity.create"] },
      { label: "Propostas", to: "/oportunidades", tab: "propostas", perms: ["proposal.read", "proposal.create"] },
    ],
  },
  {
    label: "Produtos e preços",
    icon: PackageSearch,
    items: [{ label: "Produtos, planos e preços", to: "/catalogo", perms: ["product.read", "product.manage", "price_policy.manage"] }],
  },
  {
    label: "Governança",
    icon: ScrollText,
    items: [
      { label: "Políticas, aceites e aprovações", to: "/governanca", perms: [] },
      { label: "Auditoria", to: "/auditoria", perms: ["audit.read"] },
    ],
  },
  {
    label: "Administração",
    icon: Settings,
    items: [
      { label: "Empresas e unidades", to: "/empresas", perms: ["company.update", "unit.manage", "settings.manage"] },
      { label: "Usuários, papéis e permissões", to: "/usuarios", perms: ["user.read", "membership.manage", "role.assign"] },
    ],
  },
];

function useVisibleNav() {
  const { data: me } = useMyContext();
  return useMemo(() => {
    const companyId = me?.memberships?.[0]?.company_id;
    const all = new Set(companyId ? me?.companyPermissions?.[companyId] ?? [] : []);
    const isMember = (me?.memberships?.length ?? 0) > 0 || me?.isPlatformAdmin;
    const allowed = (i: NavItem) =>
      me?.isPlatformAdmin || (i.perms.length === 0 ? isMember || i.to === "/painel" : i.perms.some((p) => all.has(p)));
    return NAV.map((g) => ({ ...g, items: g.items.filter(allowed) })).filter((g) => g.items.length > 0);
  }, [me]);
}

function NavTree({ onNavigate }: { onNavigate?: () => void }) {
  const groups = useVisibleNav();
  const { pathname, tab } = useRouterState({
    select: (s) => ({
      pathname: s.location.pathname,
      tab: (s.location.search as { tab?: string }).tab,
    }),
  });
  const activeGroup = groups.find((g) => g.items.some((i) => pathname.startsWith(i.to)))?.label;
  const [open, setOpen] = useState<Record<string, boolean>>({});

  return (
    <nav className="space-y-1" aria-label="Menu principal">
      {groups.map((g) => {
        const Icon = g.icon;
        const isOpen = open[g.label] ?? g.label === activeGroup;
        return (
          <div key={g.label}>
            <Button
              type="button"
              variant="ghost"
              aria-expanded={isOpen}
              onClick={() => setOpen((o) => ({ ...o, [g.label]: !isOpen }))}
              className={cn(
                "flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors hover:bg-sidebar-accent/60",
                g.label === activeGroup ? "text-sidebar-foreground" : "text-sidebar-foreground/75",
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              <span className="flex-1 text-left">{g.label}</span>
              <ChevronDown className={cn("h-4 w-4 transition-transform", isOpen && "rotate-180")} />
            </Button>
            {isOpen ? (
              <ul className="mb-2 ml-5 space-y-0.5 border-l border-sidebar-border pl-3">
                {g.items.map((i) => {
                  const active = pathname.startsWith(i.to) && (i.tab ? tab === i.tab : !tab);
                  return (
                    <li key={i.label}>
                      <Link
                        to={i.to}
                        search={i.tab ? { tab: i.tab } : {}}
                        onClick={onNavigate}
                        className={cn(
                          "block rounded-md px-3 py-2 text-sm transition-colors",
                          active
                            ? "bg-sidebar-accent text-sidebar-accent-foreground"
                            : "text-sidebar-foreground/70 hover:bg-sidebar-accent/60",
                        )}
                      >
                        {i.label}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            ) : null}
          </div>
        );
      })}
    </nav>
  );
}

function Brand() {
  return (
    <div className="flex items-center gap-2 px-2">
      <ShieldCheck className="h-6 w-6 text-sidebar-primary" />
      <div>
        <p className="text-sm font-semibold tracking-tight">IGA Network BR</p>
        <p className="text-xs text-sidebar-foreground/60">Gestão de Parcerias</p>
      </div>
    </div>
  );
}

function UserMenu({ onSignOut, compact }: { onSignOut: () => void; compact?: boolean }) {
  const { data: me } = useMyContext();
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant={compact ? "ghost" : "secondary"} size="sm" className={cn(!compact && "w-full justify-start")}>
          <UserCircle className="h-4 w-4" />
          {compact ? <span className="sr-only">Minha conta</span> : <span className="ml-2 truncate">{me?.profile?.full_name ?? "Minha conta"}</span>}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-60">
        <DropdownMenuLabel>
          <p className="truncate text-sm">{me?.profile?.full_name ?? "—"}</p>
          <p className="truncate text-xs font-normal text-muted-foreground">{me?.profile?.email}</p>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link to="/redefinir-senha">
            <KeyRound className="mr-2 h-4 w-4" /> Alterar senha
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={onSignOut}>
          <LogOut className="mr-2 h-4 w-4" /> Sair
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [mobileOpen, setMobileOpen] = useState(false);

  async function signOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  return (
    <div className="flex min-h-screen bg-background">
      <aside className="hidden w-64 shrink-0 flex-col justify-between bg-sidebar px-4 py-6 text-sidebar-foreground md:flex">
        <div className="space-y-8 overflow-y-auto">
          <Brand />
          <NavTree />
        </div>
        <div className="border-t border-sidebar-border pt-4">
          <UserMenu onSignOut={signOut} />
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-border bg-card px-3 py-2 md:hidden">
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" aria-label="Abrir menu">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-72 overflow-y-auto bg-sidebar p-4 text-sidebar-foreground">
              <SheetHeader className="mb-6 text-left">
                <SheetTitle className="sr-only">Menu</SheetTitle>
                <Brand />
              </SheetHeader>
              <NavTree onNavigate={() => setMobileOpen(false)} />
            </SheetContent>
          </Sheet>
          <span className="text-sm font-semibold">IGA Network BR</span>
          <UserMenu onSignOut={signOut} compact />
        </header>
        <main className="min-w-0 flex-1 px-4 py-6 md:px-8 md:py-8">{children}</main>
      </div>
    </div>
  );
}

export function PageHeader({ title, description }: { title: string; description?: string }) {
  return (
    <div className="mb-6">
      <h1 className="text-2xl font-semibold text-foreground">{title}</h1>
      {description ? <p className="mt-1 text-sm text-muted-foreground">{description}</p> : null}
    </div>
  );
}
