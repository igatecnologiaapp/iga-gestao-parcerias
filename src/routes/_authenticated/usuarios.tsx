import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { assignRole, revokeRole } from "@/lib/foundation.functions";
import {
  useActiveCompanyId,
  useCatalog,
  useCompanyPeople,
  useMyContext,
  usePermissions,
} from "@/hooks/use-foundation";

export const Route = createFileRoute("/_authenticated/usuarios")({
  head: () => ({
    meta: [
      { title: "Usuários e papéis — IGA Network BR" },
      { name: "description", content: "Concessão e revogação de papéis com escopo e vigência, sempre auditadas." },
      { property: "og:title", content: "Usuários e papéis — IGA Network BR" },
      { property: "og:description", content: "RBAC com escopo, vigência e histórico preservado." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Usuarios,
});

function Usuarios() {
  const companyId = useActiveCompanyId();
  const { data: me } = useMyContext();
  const { can } = usePermissions(companyId);
  const { data: people } = useCompanyPeople(companyId);
  const { data: catalog } = useCatalog();
  const queryClient = useQueryClient();
  const assignFn = useServerFn(assignRole);
  const revokeFn = useServerFn(revokeRole);

  const [userId, setUserId] = useState("");
  const [roleId, setRoleId] = useState("");
  const [validUntil, setValidUntil] = useState("");
  const [reason, setReason] = useState("");

  function refresh() {
    queryClient.invalidateQueries({ queryKey: ["company-people", companyId] });
    queryClient.invalidateQueries({ queryKey: ["audit", companyId] });
    queryClient.invalidateQueries({ queryKey: ["me"] });
  }

  const assignMutation = useMutation({
    mutationFn: () =>
      assignFn({
        data: {
          userId,
          roleId,
          companyId: companyId!,
          validUntil: validUntil ? new Date(validUntil).toISOString() : null,
          reason: reason || undefined,
        },
      }),
    onSuccess: () => {
      toast.success("Papel concedido e registrado na auditoria");
      setReason("");
      refresh();
    },
    onError: (e: Error) => toast.error(traduzir(e.message)),
  });

  const revokeMutation = useMutation({
    mutationFn: (assignmentId: string) => revokeFn({ data: { assignmentId, reason: "Revogado pela administração" } }),
    onSuccess: () => {
      toast.success("Papel revogado");
      refresh();
    },
    onError: (e: Error) => toast.error(traduzir(e.message)),
  });

  const companyRoles = (catalog?.roles ?? []).filter((r) => r.scope !== "platform");

  return (
    <div>
      <PageHeader
        title="Usuários e papéis"
        description="Papel + permissão + escopo + vigência. Concessões e revogações preservam histórico e geram auditoria."
      />

      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-sm font-medium">Pessoas vinculadas à empresa</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Pessoa</TableHead>
                <TableHead>E-mail</TableHead>
                <TableHead>Conta</TableHead>
                <TableHead>Vínculo</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {people?.memberships?.map((m) => {
                const p = m.profiles as { full_name: string | null; email: string | null; is_active: boolean } | null;
                return (
                  <TableRow key={m.id}>
                    <TableCell className="font-medium">{p?.full_name ?? "—"}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{p?.email}</TableCell>
                    <TableCell>
                      <Badge variant={p?.is_active ? "secondary" : "destructive"}>
                        {p?.is_active ? "ativa" : "desativada"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">{m.status}</Badge>
                    </TableCell>
                  </TableRow>
                );
              })}
              {!people?.memberships?.length ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-sm text-muted-foreground">
                    Sem pessoas visíveis neste escopo.
                  </TableCell>
                </TableRow>
              ) : null}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-sm font-medium">Atribuições de papel</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Papel</TableHead>
                <TableHead>Escopo</TableHead>
                <TableHead>Vigência</TableHead>
                <TableHead>Situação</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {people?.assignments?.map((a) => {
                const revoked = !!a.revoked_at;
                const expired = !!a.valid_until && new Date(a.valid_until) <= new Date();
                return (
                  <TableRow key={a.id}>
                    <TableCell className="font-medium">{(a.roles as { name: string } | null)?.name}</TableCell>
                    <TableCell className="text-xs uppercase text-muted-foreground">{a.scope}</TableCell>
                    <TableCell className="text-xs">
                      {new Date(a.valid_from).toLocaleDateString("pt-BR")} —{" "}
                      {a.valid_until ? new Date(a.valid_until).toLocaleDateString("pt-BR") : "indeterminado"}
                    </TableCell>
                    <TableCell>
                      <Badge variant={revoked || expired ? "destructive" : "secondary"}>
                        {revoked ? "revogado" : expired ? "expirado" : "vigente"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      {can("role.assign") && !revoked && a.user_id !== me?.userId ? (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => revokeMutation.mutate(a.id)}
                          disabled={revokeMutation.isPending}
                        >
                          Revogar
                        </Button>
                      ) : null}
                    </TableCell>
                  </TableRow>
                );
              })}
              {!people?.assignments?.length ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-sm text-muted-foreground">
                    Nenhuma atribuição registrada.
                  </TableCell>
                </TableRow>
              ) : null}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {can("role.assign") ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Conceder papel</CardTitle>
          </CardHeader>
          <CardContent>
            <form
              className="grid gap-4 md:grid-cols-2"
              onSubmit={(e) => {
                e.preventDefault();
                assignMutation.mutate();
              }}
            >
              <div className="space-y-2">
                <Label>Pessoa</Label>
                <Select value={userId} onValueChange={setUserId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    {people?.memberships?.map((m) => (
                      <SelectItem key={m.user_id} value={m.user_id}>
                        {(m.profiles as { full_name: string | null; email: string | null } | null)?.full_name ??
                          (m.profiles as { email: string | null } | null)?.email}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Papel</Label>
                <Select value={roleId} onValueChange={setRoleId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    {companyRoles.map((r) => (
                      <SelectItem key={r.id} value={r.id}>
                        {r.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="until">Fim de vigência (opcional)</Label>
                <Input id="until" type="date" value={validUntil} onChange={(e) => setValidUntil(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="reason">Motivo</Label>
                <Input id="reason" value={reason} onChange={(e) => setReason(e.target.value)} />
              </div>
              <div className="md:col-span-2">
                <Button type="submit" disabled={!userId || !roleId || assignMutation.isPending}>
                  Conceder papel
                </Button>
                <p className="mt-2 text-xs text-muted-foreground">
                  Autoelevação é bloqueada no banco: não é possível conceder papel para a própria conta.
                </p>
              </div>
            </form>
          </CardContent>
        </Card>
      ) : (
        <p className="text-sm text-muted-foreground">
          Você não possui a permissão <code>role.assign</code>.
        </p>
      )}
    </div>
  );
}

function traduzir(message: string) {
  if (message.includes("Autoelevação")) return "Autoelevação negada pelo servidor";
  if (message.includes("administrador ativo")) return "A empresa deve manter ao menos um administrador ativo";
  if (message.toLowerCase().includes("row-level")) return "Acesso negado pelas regras do banco";
  return message;
}
