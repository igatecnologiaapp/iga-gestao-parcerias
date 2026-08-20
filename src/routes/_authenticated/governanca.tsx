import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { generateSequence, listPolicyVersions, runIdempotentOperation } from "@/lib/foundation.functions";
import { useActiveCompanyId } from "@/hooks/use-foundation";

export const Route = createFileRoute("/_authenticated/governanca")({
  head: () => ({
    meta: [
      { title: "Governança e políticas — IGA Network BR" },
      { name: "description", content: "Versões de política vigentes, sequências seguras e operações idempotentes." },
      { property: "og:title", content: "Governança e políticas — IGA Network BR" },
      { property: "og:description", content: "Políticas versionadas, sequências sem lacunas e idempotência." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Governanca,
});

function Governanca() {
  const companyId = useActiveCompanyId();
  const policiesFn = useServerFn(listPolicyVersions);
  const sequenceFn = useServerFn(generateSequence);
  const idempotentFn = useServerFn(runIdempotentOperation);

  const { data: versions } = useQuery({
    queryKey: ["policy-versions", companyId],
    enabled: !!companyId,
    queryFn: () => policiesFn({ data: { companyId: companyId! } }),
  });

  const [scopeKey, setScopeKey] = useState("protocolo");
  const [lastValue, setLastValue] = useState<string | null>(null);
  const [idemKey, setIdemKey] = useState("");
  const [idemResult, setIdemResult] = useState<string | null>(null);

  const seqMutation = useMutation({
    mutationFn: () => sequenceFn({ data: { companyId: companyId!, scopeKey } }),
    onSuccess: (r) => setLastValue(String(r.value)),
    onError: (e: Error) => toast.error(e.message),
  });

  const idemMutation = useMutation({
    mutationFn: () =>
      idempotentFn({ data: { companyId: companyId!, key: idemKey, operation: "demo.operation", payload: {} } }),
    onSuccess: (r) => setIdemResult(r.status === "created" ? "executada agora" : "reaproveitada (sem duplicidade)"),
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div>
      <PageHeader
        title="Governança"
        description="Políticas versionadas com vigência, numeração sequencial segura e proteção contra execuções duplicadas."
      />

      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-sm font-medium">Versões de política</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Política</TableHead>
                <TableHead>Versão</TableHead>
                <TableHead>Vigência</TableHead>
                <TableHead>Situação</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {versions?.map((v) => {
                const vigente = !v.effective_to || new Date(v.effective_to) > new Date();
                return (
                  <TableRow key={v.id}>
                    <TableCell className="font-medium">
                      {(v.policies as { name: string } | null)?.name ?? "—"}
                    </TableCell>
                    <TableCell className="font-mono text-xs">v{v.version}</TableCell>
                    <TableCell className="text-xs">
                      {new Date(v.effective_from).toLocaleDateString("pt-BR")} —{" "}
                      {v.effective_to ? new Date(v.effective_to).toLocaleDateString("pt-BR") : "indeterminado"}
                    </TableCell>
                    <TableCell>
                      <Badge variant={vigente ? "secondary" : "destructive"}>
                        {vigente ? "vigente" : "encerrada"}
                      </Badge>
                    </TableCell>
                  </TableRow>
                );
              })}
              {!versions?.length ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-sm text-muted-foreground">
                    Nenhuma versão registrada. Versões publicadas são imutáveis: mudanças geram uma nova versão.
                  </TableCell>
                </TableRow>
              ) : null}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Sequência segura</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Numeração por empresa gerada no banco com bloqueio, evitando duplicidade sob concorrência.
            </p>
            <div className="space-y-2">
              <Label htmlFor="scope">Escopo</Label>
              <Input id="scope" value={scopeKey} onChange={(e) => setScopeKey(e.target.value)} />
            </div>
            <Button onClick={() => seqMutation.mutate()} disabled={!companyId || seqMutation.isPending}>
              Gerar próximo número
            </Button>
            {lastValue ? <p className="font-mono text-sm">{lastValue}</p> : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Operação idempotente</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Repetir a mesma chave não executa a operação novamente — a resposta original é reaproveitada.
            </p>
            <div className="space-y-2">
              <Label htmlFor="idem">Chave de idempotência</Label>
              <Input id="idem" value={idemKey} onChange={(e) => setIdemKey(e.target.value)} placeholder="ex.: teste-001" />
            </div>
            <Button
              onClick={() => idemMutation.mutate()}
              disabled={!companyId || idemKey.length < 4 || idemMutation.isPending}
            >
              Executar
            </Button>
            {idemResult ? <p className="text-sm">Resultado: {idemResult}</p> : null}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
