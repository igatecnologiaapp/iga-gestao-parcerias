import { createFileRoute, Link } from "@tanstack/react-router";
import { FileClock, KeySquare, Layers, Lock, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "IGA Network BR — Fundação, Segurança e Governança" },
      {
        name: "description",
        content:
          "Plataforma multiempresa da IGA Network BR: autenticação, RBAC com vigência, isolamento entre empresas, auditoria imutável e governança.",
      },
      { property: "og:title", content: "IGA Network BR — Fundação, Segurança e Governança" },
      {
        property: "og:description",
        content:
          "Fase 1: estrutura multiempresa, autorização server-side, trilha de auditoria e políticas versionadas.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Landing,
});

const PILLARS = [
  {
    icon: Layers,
    title: "Multiempresa",
    text: "Isolamento efetivo entre empresas em banco, API e interface. Empresa A nunca alcança dados da Empresa B.",
  },
  {
    icon: KeySquare,
    title: "RBAC com vigência",
    text: "Papel + permissão + escopo + período de validade, com histórico completo de concessão e revogação.",
  },
  {
    icon: Lock,
    title: "Default deny",
    text: "Sem autorização válida, o acesso é negado. Nenhuma regra crítica depende de esconder botão na tela.",
  },
  {
    icon: FileClock,
    title: "Auditoria imutável",
    text: "Ator, empresa, ação, objeto, estado anterior e posterior. Usuário operacional não altera nem apaga.",
  },
];

function Landing() {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-6 w-6 text-primary" />
            <span className="font-semibold tracking-tight">IGA Network BR</span>
          </div>
          <Button asChild size="sm">
            <Link to="/auth">Entrar</Link>
          </Button>
        </div>
      </header>

      <main>
        <section className="mx-auto max-w-6xl px-6 py-20">
          <p className="mb-4 inline-flex rounded-full bg-secondary px-3 py-1 text-xs font-medium text-secondary-foreground">
            Fase 1 — Fundação, Segurança e Governança
          </p>
          <h1 className="max-w-3xl text-4xl font-semibold leading-tight md:text-5xl">
            A fundação técnica, segura e auditável da IGA Network BR
          </h1>
          <p className="mt-5 max-w-2xl text-base text-muted-foreground">
            Estrutura multiempresa, autenticação, autorização aplicada no servidor, trilha de auditoria,
            políticas versionadas, anexos privados, idempotência e numeração segura. Escopo restrito à
            Fase 1: nenhuma funcionalidade das fases seguintes foi implementada.
          </p>
          <div className="mt-8 flex gap-3">
            <Button asChild size="lg">
              <Link to="/auth">Acessar o sistema</Link>
            </Button>
          </div>
        </section>

        <section className="border-t border-border bg-card">
          <div className="mx-auto grid max-w-6xl gap-6 px-6 py-16 md:grid-cols-2 lg:grid-cols-4">
            {PILLARS.map((p) => {
              const Icon = p.icon;
              return (
                <article key={p.title} className="rounded-lg border border-border bg-background p-5">
                  <Icon className="h-5 w-5 text-accent" />
                  <h2 className="mt-3 text-sm font-semibold">{p.title}</h2>
                  <p className="mt-2 text-sm text-muted-foreground">{p.text}</p>
                </article>
              );
            })}
          </div>
        </section>
      </main>

      <footer className="border-t border-border">
        <div className="mx-auto max-w-6xl px-6 py-8 text-xs text-muted-foreground">
          IGA Network BR · Baseline R1 · Fase 2 bloqueada até autorização formal.
        </div>
      </footer>
    </div>
  );
}
