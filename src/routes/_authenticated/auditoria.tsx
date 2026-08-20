import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { PageHeader } from "@/components/app-shell";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useActiveCompanyId, useAudit } from "@/hooks/use-foundation";

export const Route = createFileRoute("/_authenticated/auditoria")({
  head: () => ({
    meta: [
      { title: "Trilha de auditoria — IGA Network BR" },
      { name: "description", content: "Registro imutável de quem fez o quê, quando e sobre qual objeto." },
      { property: "og:title", content: "Trilha de auditoria — IGA Network BR" },
      { property: "og:description", content: "Eventos append-only, sem edição nem exclusão." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Auditoria,
});

function Auditoria() {
  const companyId = useActiveCompanyId();
  const { data: events, isLoading } = useAudit(companyId);
  const [filter, setFilter] = useState("");

  const rows = (events ?? []).filter((e) =>
    `${e.action} ${e.object_type} ${e.object_id ?? ""}`.toLowerCase().includes(filter.toLowerCase()),
  );

  return (
    <div>
      <PageHeader
        title="Trilha de auditoria"
        description="Eventos append-only: gravações são permitidas, alterações e exclusões são bloqueadas por gatilho no banco."
      />

      <Card>
        <CardHeader className="flex-row items-center justify-between gap-4 space-y-0">
          <CardTitle className="text-sm font-medium">Eventos</CardTitle>
          <Input
            className="max-w-xs"
            placeholder="Filtrar por ação ou objeto"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          />
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Quando</TableHead>
                <TableHead>Ação</TableHead>
                <TableHead>Objeto</TableHead>
                <TableHead>Identificador</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((e) => (
                <TableRow key={e.id}>
                  <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                    {new Date(e.created_at).toLocaleString("pt-BR")}
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary" className="font-mono text-xs">
                      {e.action}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm">{e.object_type}</TableCell>
                  <TableCell className="font-mono text-xs text-muted-foreground">{e.object_id ?? "—"}</TableCell>
                </TableRow>
              ))}
              {!rows.length ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-sm text-muted-foreground">
                    {isLoading
                      ? "Carregando…"
                      : "Nenhum evento visível neste escopo. A leitura exige a permissão audit.read."}
                  </TableCell>
                </TableRow>
              ) : null}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
