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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { createUnit } from "@/lib/foundation.functions";
import { useActiveCompanyId, useMyContext, usePermissions, useUnits } from "@/hooks/use-foundation";

export const Route = createFileRoute("/_authenticated/empresas")({
  head: () => ({
    meta: [
      { title: "Empresas e unidades — IGA Network BR" },
      { name: "description", content: "Gestão das empresas com vínculo ativo e de suas unidades operacionais." },
      { property: "og:title", content: "Empresas e unidades — IGA Network BR" },
      { property: "og:description", content: "Estrutura multiempresa isolada por regras de acesso no banco." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Empresas,
});

function Empresas() {
  const { data: me } = useMyContext();
  const companyId = useActiveCompanyId();
  const { can } = usePermissions(companyId);
  const { data: units } = useUnits(companyId);
  const queryClient = useQueryClient();
  const createUnitFn = useServerFn(createUnit);
  const [name, setName] = useState("");
  const [code, setCode] = useState("");

  const mutation = useMutation({
    mutationFn: () => createUnitFn({ data: { companyId: companyId!, name, code: code || undefined } }),
    onSuccess: () => {
      setName("");
      setCode("");
      toast.success("Unidade criada");
      queryClient.invalidateQueries({ queryKey: ["units", companyId] });
      queryClient.invalidateQueries({ queryKey: ["audit", companyId] });
    },
    onError: (e: Error) => toast.error(e.message.includes("row-level") ? "Acesso negado pelo servidor" : e.message),
  });

  return (
    <div>
      <PageHeader
        title="Empresas e unidades"
        description="Somente empresas com vínculo ativo aparecem aqui — o filtro é aplicado no banco, não na interface."
      />

      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-sm font-medium">Empresas</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Empresa</TableHead>
                <TableHead>Situação do vínculo</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {me?.memberships?.map((m) => {
                const company = m.companies as { id: string; name: string; status: string } | null;
                return (
                  <TableRow key={m.id}>
                    <TableCell className="font-medium">{company?.name}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">{m.status}</Badge>
                    </TableCell>
                  </TableRow>
                );
              })}
              {!me?.memberships?.length ? (
                <TableRow>
                  <TableCell colSpan={2} className="text-sm text-muted-foreground">
                    Nenhuma empresa acessível.
                  </TableCell>
                </TableRow>
              ) : null}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Unidades da empresa em contexto</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Unidade</TableHead>
                <TableHead>Código</TableHead>
                <TableHead>Situação</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {units?.map((u) => (
                <TableRow key={u.id}>
                  <TableCell className="font-medium">{u.name}</TableCell>
                  <TableCell className="font-mono text-xs">{u.code ?? "—"}</TableCell>
                  <TableCell>
                    <Badge variant="secondary">{u.status}</Badge>
                  </TableCell>
                </TableRow>
              ))}
              {!units?.length ? (
                <TableRow>
                  <TableCell colSpan={3} className="text-sm text-muted-foreground">
                    Nenhuma unidade cadastrada.
                  </TableCell>
                </TableRow>
              ) : null}
            </TableBody>
          </Table>

          {can("unit.manage") ? (
            <form
              className="grid gap-3 border-t border-border pt-5 md:grid-cols-[1fr_180px_auto] md:items-end"
              onSubmit={(e) => {
                e.preventDefault();
                mutation.mutate();
              }}
            >
              <div className="space-y-2">
                <Label htmlFor="unit-name">Nova unidade</Label>
                <Input id="unit-name" value={name} onChange={(e) => setName(e.target.value)} required minLength={2} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="unit-code">Código</Label>
                <Input id="unit-code" value={code} onChange={(e) => setCode(e.target.value)} />
              </div>
              <Button type="submit" disabled={!companyId || mutation.isPending}>
                Cadastrar
              </Button>
            </form>
          ) : (
            <p className="border-t border-border pt-5 text-sm text-muted-foreground">
              Você não possui a permissão <code>unit.manage</code>. Mesmo se este formulário fosse exibido, o banco
              recusaria a gravação.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
