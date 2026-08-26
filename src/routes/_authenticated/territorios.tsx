import { createFileRoute } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { MapPin, Plus } from "lucide-react";
import { PageHeader } from "@/components/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useActiveCompanyId, useMyContext, usePermissions } from "@/hooks/use-foundation";
import { usePartners, useTerritories } from "@/hooks/use-partners";
import { assignTerritory, createTerritory, revokePartnerTerritory } from "@/lib/partners.functions";

export const Route = createFileRoute("/_authenticated/territorios")({
  head: () => ({
    meta: [
      { title: "Territórios — IGA Network BR" },
      { name: "description", content: "Estrutura territorial independente do parceiro, com modos e vigência controlada." },
      { property: "og:title", content: "Territórios — IGA Network BR" },
      { property: "og:description", content: "Aberto, base recomendada, preferencial e protegido — com aprovação e vigência." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Territorios,
});

const MODE_LABEL: Record<string, string> = {
  open: "Aberto",
  recommended_base: "Base recomendada",
  preferred: "Preferencial",
  protected: "Protegido",
};

const SCOPE_LABEL: Record<string, string> = {
  country: "País",
  state: "Estado",
  city: "Cidade",
  region: "Região",
  custom: "Personalizado",
};

function Territorios() {
  const companyId = useActiveCompanyId();
  const { can } = usePermissions(companyId);
  const { data: me } = useMyContext();
  const { data: territories, isLoading } = useTerritories(companyId);
  const canManage = can("territory.manage") || !!me?.isPlatformAdmin;

  return (
    <div>
      <PageHeader
        title="Territórios"
        description="Território é entidade própria: existe sem parceiro. Exclusividade é exceção — o modo protegido exige aprovação e vigência definida."
      />

      <div className="mb-4 flex justify-end">{canManage ? <NovoTerritorio companyId={companyId} /> : null}</div>

      <div className="grid gap-4 md:grid-cols-2">
        {(territories ?? []).map((t) => {
          const links = (t.partner_territories ?? []) as Array<{
            id: string;
            mode: string;
            status: string;
            valid_from: string;
            valid_until: string | null;
            partners: { display_name: string; code: string } | null;
          }>;
          const activeLinks = links.filter((l) => l.status === "active");
          return (
            <Card key={t.id}>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center justify-between gap-2 text-sm font-medium">
                  <span className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-accent" />
                    {t.name}
                  </span>
                  <Badge variant="secondary">{MODE_LABEL[t.default_mode] ?? t.default_mode}</Badge>
                </CardTitle>
                <p className="text-xs text-muted-foreground">
                  <span className="font-mono">{t.code}</span> · {SCOPE_LABEL[t.scope_type] ?? t.scope_type} ·{" "}
                  {t.status}
                </p>
              </CardHeader>
              <CardContent className="space-y-3">
                {activeLinks.length ? (
                  <ul className="space-y-2">
                    {activeLinks.map((l) => (
                      <li key={l.id} className="rounded-md border p-2 text-sm">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-medium">{l.partners?.display_name ?? "parceiro"}</span>
                          <Badge variant={l.mode === "protected" ? "default" : "outline"}>
                            {MODE_LABEL[l.mode] ?? l.mode}
                          </Badge>
                        </div>
                        <p className="mt-1 text-xs text-muted-foreground">
                          Vigência: {new Date(l.valid_from).toLocaleDateString("pt-BR")}
                          {l.valid_until ? ` → ${new Date(l.valid_until).toLocaleDateString("pt-BR")}` : " → sem término"}
                        </p>
                        {canManage ? (
                          <RevogarVinculo partnerTerritoryId={l.id} />
                        ) : null}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-muted-foreground">Nenhum vínculo ativo.</p>
                )}
                {canManage ? <AtribuirTerritorio companyId={companyId} territoryId={t.id} /> : null}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {!territories?.length ? (
        <p className="text-sm text-muted-foreground">
          {isLoading
            ? "Carregando…"
            : "Nenhum território visível. A leitura exige a permissão territory.read na empresa ativa."}
        </p>
      ) : null}
    </div>
  );
}

function NovoTerritorio({ companyId }: { companyId: string | null }) {
  const qc = useQueryClient();
  const fn = useServerFn(createTerritory);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    code: "",
    name: "",
    scopeType: "city" as "country" | "state" | "city" | "region" | "custom",
    defaultMode: "open" as "open" | "recommended_base" | "preferred",
    coverage: "",
    notes: "",
  });
  const [busy, setBusy] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" disabled={!companyId}>
          <Plus className="mr-2 h-4 w-4" /> Novo território
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Criar território</DialogTitle>
          <DialogDescription>
            O modo padrão nunca é protegido: exclusividade só pode ser concedida por atribuição aprovada.
          </DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="nt-code">Código</Label>
            <Input id="nt-code" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} />
          </div>
          <div>
            <Label htmlFor="nt-name">Nome</Label>
            <Input id="nt-name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>
          <div>
            <Label htmlFor="nt-scope">Escopo</Label>
            <Select value={form.scopeType} onValueChange={(v) => setForm({ ...form, scopeType: v as never })}>
              <SelectTrigger id="nt-scope">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(SCOPE_LABEL).map(([v, l]) => (
                  <SelectItem key={v} value={v}>
                    {l}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="nt-mode">Modo padrão</Label>
            <Select value={form.defaultMode} onValueChange={(v) => setForm({ ...form, defaultMode: v as never })}>
              <SelectTrigger id="nt-mode">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="open">Aberto</SelectItem>
                <SelectItem value="recommended_base">Base recomendada</SelectItem>
                <SelectItem value="preferred">Preferencial</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="col-span-2">
            <Label htmlFor="nt-cov">Abrangência (cidades/UFs, separadas por vírgula)</Label>
            <Input id="nt-cov" value={form.coverage} onChange={(e) => setForm({ ...form, coverage: e.target.value })} />
          </div>
          <div className="col-span-2">
            <Label htmlFor="nt-notes">Observações</Label>
            <Textarea id="nt-notes" rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          </div>
        </div>
        <DialogFooter>
          <Button
            disabled={busy || !companyId || form.code.length < 2 || form.name.length < 2}
            onClick={async () => {
              setBusy(true);
              try {
                await fn({
                  data: {
                    companyId: companyId!,
                    code: form.code.trim().toUpperCase(),
                    name: form.name.trim(),
                    scopeType: form.scopeType,
                    defaultMode: form.defaultMode,
                    coverage: form.coverage
                      ? { areas: form.coverage.split(",").map((s) => s.trim()).filter(Boolean) }
                      : {},
                    notes: form.notes || undefined,
                  },
                });
                toast.success("Território criado.");
                setOpen(false);
                setForm({ code: "", name: "", scopeType: "city", defaultMode: "open", coverage: "", notes: "" });
                qc.invalidateQueries({ queryKey: ["territories"] });
              } catch (e) {
                toast.error(e instanceof Error ? e.message : "Falha ao criar território");
              } finally {
                setBusy(false);
              }
            }}
          >
            Criar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function AtribuirTerritorio({ companyId, territoryId }: { companyId: string | null; territoryId: string }) {
  const qc = useQueryClient();
  const fn = useServerFn(assignTerritory);
  const { data: partners } = usePartners(companyId);
  const [partnerId, setPartnerId] = useState("");
  const [mode, setMode] = useState<"open" | "recommended_base" | "preferred" | "protected">("recommended_base");
  const [validUntil, setValidUntil] = useState("");
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);

  const protectedNeedsDate = mode === "protected" && !validUntil;

  return (
    <div className="space-y-2 rounded-md border border-dashed p-3">
      <p className="text-xs font-medium">Atribuir parceiro</p>
      <div className="grid grid-cols-2 gap-2">
        <Select value={partnerId} onValueChange={setPartnerId}>
          <SelectTrigger>
            <SelectValue placeholder="Parceiro" />
          </SelectTrigger>
          <SelectContent>
            {(partners ?? []).map((p) => (
              <SelectItem key={p.id} value={p.id}>
                {p.display_name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={mode} onValueChange={(v) => setMode(v as never)}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(MODE_LABEL).map(([v, l]) => (
              <SelectItem key={v} value={v}>
                {l}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <Input type="date" value={validUntil} onChange={(e) => setValidUntil(e.target.value)} />
        <Input placeholder="Justificativa" value={reason} onChange={(e) => setReason(e.target.value)} />
      </div>
      {mode === "protected" ? (
        <p className="text-xs text-muted-foreground">
          Modo protegido exige data de término e é validado no banco; sobreposição com outro protegido vigente é
          recusada.
        </p>
      ) : null}
      <Button
        size="sm"
        variant="secondary"
        disabled={busy || !partnerId || protectedNeedsDate}
        onClick={async () => {
          setBusy(true);
          try {
            const res = await fn({
              data: {
                partnerId,
                territoryId,
                mode,
                validUntil: validUntil ? new Date(validUntil).toISOString() : null,
                reason: reason || undefined,
                idempotencyKey: `terr-${partnerId}-${territoryId}-${mode}-${validUntil || "open"}`,
              },
            });
            toast.success(
              res.status === "replayed" ? "Atribuição já existente (idempotência)." : "Território atribuído.",
            );
            setPartnerId("");
            setReason("");
            qc.invalidateQueries({ queryKey: ["territories"] });
            qc.invalidateQueries({ queryKey: ["partner"] });
          } catch (e) {
            toast.error(e instanceof Error ? e.message : "Falha ao atribuir território");
          } finally {
            setBusy(false);
          }
        }}
      >
        Atribuir
      </Button>
    </div>
  );
}

function RevogarVinculo({ partnerTerritoryId }: { partnerTerritoryId: string }) {
  const qc = useQueryClient();
  const fn = useServerFn(revokePartnerTerritory);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <div className="mt-2 flex items-center gap-2">
      <Input
        className="h-8 text-xs"
        placeholder="Motivo da revogação"
        value={reason}
        onChange={(e) => setReason(e.target.value)}
      />
      <Button
        size="sm"
        variant="ghost"
        disabled={busy || reason.trim().length < 2}
        onClick={async () => {
          setBusy(true);
          try {
            await fn({ data: { partnerTerritoryId, reason: reason.trim() } });
            toast.success("Vínculo revogado.");
            qc.invalidateQueries({ queryKey: ["territories"] });
          } catch (e) {
            toast.error(e instanceof Error ? e.message : "Falha ao revogar");
          } finally {
            setBusy(false);
          }
        }}
      >
        Revogar
      </Button>
    </div>
  );
}
