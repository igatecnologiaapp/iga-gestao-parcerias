import { createFileRoute } from "@tanstack/react-router";
import { AlertTriangle, Building2, KeySquare, ShieldCheck } from "lucide-react";
import { PageHeader } from "@/components/app-shell";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useActiveCompanyId, useAudit, useMyContext, usePermissions } from "@/hooks/use-foundation";

export const Route = createFileRoute("/_authenticated/painel")({
  head: () => ({
    meta: [
      { title: "Painel da Fundação — IGA Network BR" },
      { name: "description", content: "Visão do escopo de acesso, papéis vigentes e eventos recentes de auditoria." },
      { property: "og:title", content: "Painel da Fundação — IGA Network BR" },
      { property: "og:description", content: "Escopo de acesso, papéis vigentes e auditoria recente." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Painel,
});

function Painel() {
  const { data: me, isLoading } = useMyContext();
  const companyId = useActiveCompanyId();
  const { list } = usePermissions(companyId);
  const { data: audit } = useAudit(companyId);

  if (isLoading) return <p className="text-sm text-muted-foreground">Carregando escopo de acesso…</p>;

  const noAccess = !me?.memberships?.length;

  return (
    <div>
      <PageHeader
        title="Painel da Fundação"
        description="Escopo resolvido no servidor. A interface apenas reflete o que o banco já autoriza."
      />

      {noAccess ? (
        <Card className="border-warning/40">
          <CardContent className="flex items-start gap-3 pt-6">
            <AlertTriangle className="mt-0.5 h-5 w-5 text-warning" />
            <div>
              <p className="text-sm font-medium">Nenhum vínculo ativo</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Sua conta está autenticada, mas ainda não possui vínculo com nenhuma empresa. Autenticação não
                equivale a autorização: nenhum dado é liberado até que um administrador conceda vínculo e papel.
              </p>
            </div>
          </CardContent>
        </Card>
      ) : null}

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-medium">
              <Building2 className="h-4 w-4 text-accent" /> Empresas com vínculo ativo
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">{me?.memberships?.length ?? 0}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {me?.memberships?.map((m) => (m.companies as { name: string } | null)?.name).join(", ") || "—"}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-medium">
              <KeySquare className="h-4 w-4 text-accent" /> Papéis vigentes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">{me?.roleAssignments?.length ?? 0}</p>
            <div className="mt-2 flex flex-wrap gap-1">
              {me?.roleAssignments?.map((a) => (
                <Badge key={a.id} variant="secondary">
                  {(a.roles as { name: string } | null)?.name}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-medium">
              <ShieldCheck className="h-4 w-4 text-accent" /> Permissões efetivas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">{list.length}</p>
            <p className="mt-1 text-xs text-muted-foreground">na empresa em contexto</p>
          </CardContent>
        </Card>
      </div>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="text-sm font-medium">Eventos recentes de auditoria</CardTitle>
        </CardHeader>
        <CardContent>
          {audit?.length ? (
            <ul className="divide-y divide-border text-sm">
              {audit.slice(0, 8).map((e) => (
                <li key={e.id} className="flex items-center justify-between py-2">
                  <span className="font-mono text-xs">
                    {e.action} · {e.object_type}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {new Date(e.created_at).toLocaleString("pt-BR")}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">
              Nenhum evento visível. A leitura da auditoria exige a permissão <code>audit.read</code>.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
