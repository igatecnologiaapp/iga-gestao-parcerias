import { createFileRoute } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { Handshake, Landmark, ShieldAlert } from "lucide-react";
import { PageHeader } from "@/components/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useActiveCompanyId, useMyContext, usePermissions } from "@/hooks/use-foundation";
import { usePartnerDetail, usePartners, useTrainingTracks } from "@/hooks/use-partners";
import {
  addPartnerFollowup,
  updateOnboardingItem,
  updatePartnerStatus,
  updatePartnerTraining,
  upsertCertification,
  upsertPayeeProfile,
} from "@/lib/partners.functions";

export const Route = createFileRoute("/_authenticated/parceiros")({
  validateSearch: (s: Record<string, unknown>): { tab?: string } => (typeof s["tab"] === "string" ? { tab: s["tab"] } : {}),
  head: () => ({
    meta: [
      { title: "Parceiros e Onboarding — IGA Network BR" },
      { name: "description", content: "Ciclo do parceiro: onboarding, capacitação, certificação e dados de recebimento mascarados." },
      { property: "og:title", content: "Parceiros e Onboarding — IGA Network BR" },
      { property: "og:description", content: "Onboarding com checklist versionado, trilhas e certificações independentes do status." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Parceiros,
});

const PARTNER_STATUS: Record<string, string> = {
  onboarding: "Onboarding",
  training: "Treinamento",
  certification_pending: "Certificação pendente",
  active: "Ativo",
  attention: "Em atenção",
  suspended: "Suspenso",
  inactive: "Inativo",
  exit: "Encerrado",
};

const ITEM_STATUS: Record<string, string> = {
  pending: "Pendente",
  in_progress: "Em andamento",
  done: "Concluído",
  waived: "Dispensado",
  blocked: "Bloqueado",
};

const TRAINING_STATUS: Record<string, string> = {
  not_started: "Não iniciado",
  in_progress: "Em andamento",
  completed: "Concluído",
  failed: "Reprovado",
  expired: "Expirado",
};

const CERT_STATUS: Record<string, string> = {
  pending: "Pendente",
  approved: "Aprovada",
  failed: "Reprovada",
  expired: "Expirada",
  revoked: "Revogada",
};

function Parceiros() {
  const companyId = useActiveCompanyId();
  const { can } = usePermissions(companyId);
  const { data: me } = useMyContext();
  const [statusFilter, setStatusFilter] = useState("");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<string | null>(null);
  const { data: partners, isLoading } = usePartners(companyId, statusFilter || undefined, search || undefined);

  const canManage = can("partner.manage") || !!me?.isPlatformAdmin;
  const canPayee = can("payee.manage") || !!me?.isPlatformAdmin;

  return (
    <div>
      <PageHeader
        title="Parceiros"
        description="Parceiro só existe após formalização e conversão do candidato. Origem e canal de recrutamento são preservados."
      />

      <Card>
        <CardHeader className="flex-row flex-wrap items-center justify-between gap-3 space-y-0">
          <CardTitle className="text-sm font-medium">Rede de parceiros</CardTitle>
          <div className="flex flex-wrap items-center gap-2">
            <Input
              className="w-48"
              placeholder="Buscar por nome"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Todos os status" />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(PARTNER_STATUS).map(([v, l]) => (
                  <SelectItem key={v} value={v}>
                    {l}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {statusFilter ? (
              <Button variant="ghost" size="sm" onClick={() => setStatusFilter("")}>
                Limpar
              </Button>
            ) : null}
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Código</TableHead>
                <TableHead>Parceiro</TableHead>
                <TableHead>Origem</TableHead>
                <TableHead>Cidade/UF</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Desde</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(partners ?? []).map((p) => (
                <TableRow key={p.id} className="cursor-pointer" onClick={() => setSelected(p.id)}>
                  <TableCell className="font-mono text-xs">{p.code}</TableCell>
                  <TableCell className="text-sm font-medium">{p.display_name}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{p.source_channel ?? "—"}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {p.city ?? "—"}
                    {p.state ? `/${p.state}` : ""}
                  </TableCell>
                  <TableCell>
                    <Badge variant={p.status === "active" ? "default" : "secondary"}>
                      {PARTNER_STATUS[p.status] ?? p.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {new Date(p.status_changed_at).toLocaleDateString("pt-BR")}
                  </TableCell>
                </TableRow>
              ))}
              {!partners?.length ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-sm text-muted-foreground">
                    {isLoading
                      ? "Carregando…"
                      : "Nenhum parceiro visível. A leitura exige a permissão partner.read na empresa ativa."}
                  </TableCell>
                </TableRow>
              ) : null}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <ParceiroDetalhe
        partnerId={selected}
        companyId={companyId}
        onClose={() => setSelected(null)}
        canManage={canManage}
        canPayee={canPayee}
      />
    </div>
  );
}

function ParceiroDetalhe({
  partnerId,
  companyId,
  onClose,
  canManage,
  canPayee,
}: {
  partnerId: string | null;
  companyId: string | null;
  onClose: () => void;
  canManage: boolean;
  canPayee: boolean;
}) {
  const { tab } = Route.useSearch();
  const qc = useQueryClient();
  const { data } = usePartnerDetail(partnerId);
  const { data: tracks } = useTrainingTracks(companyId);
  const statusFn = useServerFn(updatePartnerStatus);
  const itemFn = useServerFn(updateOnboardingItem);
  const trainingFn = useServerFn(updatePartnerTraining);
  const certFn = useServerFn(upsertCertification);
  const followFn = useServerFn(addPartnerFollowup);
  const payeeFn = useServerFn(upsertPayeeProfile);

  const [busy, setBusy] = useState(false);
  const partner = data?.partner;

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["partner", partnerId] });
    qc.invalidateQueries({ queryKey: ["partners"] });
  };

  const items = data?.onboarding ?? [];
  const done = items.filter((i) => i.status === "done" || i.status === "waived").length;
  const progress = items.length ? Math.round((done / items.length) * 100) : 0;

  return (
    <Sheet open={!!partnerId} onOpenChange={(o) => (!o ? onClose() : null)}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-2xl">
        <SheetHeader>
          <SheetTitle>{partner?.display_name ?? "Parceiro"}</SheetTitle>
          <SheetDescription>
            {partner ? (
              <>
                {partner.code} · <Badge variant="secondary">{PARTNER_STATUS[partner.status] ?? partner.status}</Badge>{" "}
                · origem preservada: {partner.source_channel ?? "—"}
              </>
            ) : (
              "Carregando…"
            )}
          </SheetDescription>
        </SheetHeader>

        {!partner ? null : (
          <Tabs defaultValue={tab ?? "onboarding"} className="mt-6">
            <TabsList className="flex w-full flex-wrap">
              <TabsTrigger value="onboarding">Onboarding</TabsTrigger>
              <TabsTrigger value="capacitacao">Capacitação</TabsTrigger>
              <TabsTrigger value="territorios">Territórios</TabsTrigger>
              <TabsTrigger value="acompanhamento">90 dias</TabsTrigger>
              <TabsTrigger value="recebimento">Recebimento</TabsTrigger>
            </TabsList>

            <TabsContent value="onboarding" className="space-y-4">
              {canManage ? (
                <div className="flex items-center gap-2 rounded-md border p-3">
                  <Label className="text-xs">Status do parceiro</Label>
                  <Select
                    value={partner.status}
                    onValueChange={async (v) => {
                      setBusy(true);
                      try {
                        await statusFn({ data: { partnerId: partner.id, status: v as never } });
                        toast.success("Status atualizado e registrado em auditoria.");
                        invalidate();
                      } catch (e) {
                        toast.error(e instanceof Error ? e.message : "Falha ao atualizar status");
                      } finally {
                        setBusy(false);
                      }
                    }}
                  >
                    <SelectTrigger className="w-56" disabled={busy}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(PARTNER_STATUS).map(([v, l]) => (
                        <SelectItem key={v} value={v}>
                          {l}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ) : null}

              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium">Checklist instanciado</span>
                  <span className="text-muted-foreground">
                    {done}/{items.length} concluídos
                  </span>
                </div>
                <Progress value={progress} />
              </div>

              <ul className="space-y-2">
                {items.map((i) => (
                  <li key={i.id} className="flex items-center justify-between gap-3 rounded-md border p-3">
                    <div>
                      <p className="text-sm font-medium">{i.label}</p>
                      <p className="text-xs text-muted-foreground">
                        {i.category}
                        {(i as { requires_evidence?: boolean }).requires_evidence ? " · exige evidência" : ""}
                      </p>
                    </div>
                    {canManage ? (
                      <Select
                        value={i.status}
                        onValueChange={async (v) => {
                          try {
                            await itemFn({ data: { itemId: i.id, status: v as never } });
                            invalidate();
                          } catch (e) {
                            toast.error(e instanceof Error ? e.message : "Falha ao atualizar item");
                          }
                        }}
                      >
                        <SelectTrigger className="w-40">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.entries(ITEM_STATUS).map(([v, l]) => (
                            <SelectItem key={v} value={v}>
                              {l}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <Badge variant="outline">{ITEM_STATUS[i.status] ?? i.status}</Badge>
                    )}
                  </li>
                ))}
                {!items.length ? (
                  <p className="text-sm text-muted-foreground">
                    Nenhum item instanciado. O checklist é aplicado na conversão do candidato.
                  </p>
                ) : null}
              </ul>

              <section className="space-y-2">
                <p className="text-sm font-medium">Aceites de política</p>
                {data?.acceptances.length ? (
                  <ul className="space-y-1 text-xs text-muted-foreground">
                    {data.acceptances.map((a) => {
                      const pol = a.policies as { code: string; name: string } | null;
                      const ver = a.policy_versions as { version: number } | null;
                      return (
                        <li key={a.id}>
                          {pol?.name ?? "política"} v{ver?.version ?? "?"} ·{" "}
                          {new Date(a.accepted_at).toLocaleString("pt-BR")}
                        </li>
                      );
                    })}
                  </ul>
                ) : (
                  <p className="text-sm text-muted-foreground">Nenhum aceite registrado.</p>
                )}
              </section>
            </TabsContent>

            <TabsContent value="capacitacao" className="space-y-5">
              <section className="space-y-2">
                <p className="text-sm font-medium">Trilhas de treinamento</p>
                {(tracks ?? []).map((t) => {
                  const current = (data?.trainings ?? []).find(
                    (x) => (x.training_tracks as { code: string } | null)?.code === t.code && !x.module_id,
                  );
                  return (
                    <div key={t.id} className="flex items-center justify-between gap-3 rounded-md border p-3">
                      <div>
                        <p className="text-sm font-medium">{t.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {t.code}
                          {t.is_required ? " · obrigatória" : " · opcional"}
                          {t.validity_months ? ` · validade ${t.validity_months} meses` : ""}
                        </p>
                      </div>
                      {canManage ? (
                        <Select
                          value={current?.status ?? "not_started"}
                          onValueChange={async (v) => {
                            if (!companyId) return;
                            try {
                              await trainingFn({
                                data: {
                                  companyId,
                                  partnerId: partner.id,
                                  trackId: t.id,
                                  status: v as never,
                                },
                              });
                              invalidate();
                            } catch (e) {
                              toast.error(e instanceof Error ? e.message : "Falha ao atualizar trilha");
                            }
                          }}
                        >
                          <SelectTrigger className="w-44">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {Object.entries(TRAINING_STATUS).map(([v, l]) => (
                              <SelectItem key={v} value={v}>
                                {l}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : (
                        <Badge variant="outline">
                          {TRAINING_STATUS[current?.status ?? "not_started"]}
                        </Badge>
                      )}
                    </div>
                  );
                })}
                {!tracks?.length ? (
                  <p className="text-sm text-muted-foreground">
                    Nenhuma trilha cadastrada para a empresa ativa.
                  </p>
                ) : null}
              </section>

              <section className="space-y-2">
                <p className="text-sm font-medium">Certificações</p>
                <p className="text-xs text-muted-foreground">
                  Certificação é registro próprio, independente do status do parceiro.
                </p>
                {(data?.certifications ?? []).map((c) => (
                  <div key={c.id} className="rounded-md border p-3 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="font-medium">
                        {c.competency} <span className="text-muted-foreground">({c.type})</span>
                      </span>
                      <Badge variant={c.status === "approved" ? "default" : "secondary"}>
                        {CERT_STATUS[c.status] ?? c.status}
                      </Badge>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {c.issued_at ? `Emitida em ${new Date(c.issued_at).toLocaleDateString("pt-BR")}` : "Sem emissão"}
                      {c.valid_until ? ` · válida até ${new Date(c.valid_until).toLocaleDateString("pt-BR")}` : ""}
                    </p>
                  </div>
                ))}
                {canManage && companyId ? (
                  <NovaCertificacao
                    onSubmit={async (payload) => {
                      await certFn({ data: { companyId, partnerId: partner.id, ...payload } });
                      invalidate();
                    }}
                  />
                ) : null}
              </section>
            </TabsContent>

            <TabsContent value="territorios" className="space-y-3">
              {(data?.territories ?? []).map((t) => {
                const terr = t.territories as { code: string; name: string; scope_type: string } | null;
                return (
                  <div key={t.id} className="rounded-md border p-3 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="font-medium">
                        {terr?.name ?? "território"}{" "}
                        <span className="font-mono text-xs text-muted-foreground">{terr?.code}</span>
                      </span>
                      <Badge variant={t.mode === "protected" ? "default" : "secondary"}>{t.mode}</Badge>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {t.status} · vigência de {new Date(t.valid_from).toLocaleDateString("pt-BR")}
                      {t.valid_until ? ` até ${new Date(t.valid_until).toLocaleDateString("pt-BR")}` : " sem término"}
                    </p>
                  </div>
                );
              })}
              {!data?.territories.length ? (
                <p className="text-sm text-muted-foreground">
                  Nenhum território vinculado. A atribuição é feita na tela de Territórios.
                </p>
              ) : null}
            </TabsContent>

            <TabsContent value="acompanhamento" className="space-y-3">
              {canManage && companyId ? (
                <NovoAcompanhamento
                  onSubmit={async (payload) => {
                    await followFn({ data: { companyId, partnerId: partner.id, ...payload } });
                    invalidate();
                  }}
                />
              ) : null}
              {(data?.followups ?? []).map((f) => (
                <div key={f.id} className="rounded-md border p-3 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">
                      {f.milestone}
                      {f.day_offset !== null ? ` · D+${f.day_offset}` : ""}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {new Date(f.occurred_at).toLocaleDateString("pt-BR")}
                    </span>
                  </div>
                  {f.evolution ? <p className="mt-1 text-muted-foreground">{f.evolution}</p> : null}
                  {f.difficulties ? (
                    <p className="mt-1 text-xs text-muted-foreground">Dificuldades: {f.difficulties}</p>
                  ) : null}
                </div>
              ))}
              {!data?.followups.length ? (
                <p className="text-sm text-muted-foreground">Nenhum acompanhamento registrado.</p>
              ) : null}
            </TabsContent>

            <TabsContent value="recebimento" className="space-y-3">
              <div className="flex items-start gap-2 rounded-md border border-warning/40 p-3">
                <ShieldAlert className="mt-0.5 h-4 w-4 text-warning" />
                <p className="text-xs text-muted-foreground">
                  Estrutura cadastral apenas. Não há pagamento, repasse ou integração bancária nesta fase. Dados são
                  exibidos mascarados por padrão e toda alteração é registrada em histórico próprio.
                </p>
              </div>
              <PayeeCard masked={data?.payeeMasked ?? null} />
              {canPayee && companyId ? (
                <PayeeForm
                  onSubmit={async (payload) => {
                    await payeeFn({ data: { companyId, partnerId: partner.id, ...payload } });
                    invalidate();
                    toast.success("Dados de recebimento atualizados.");
                  }}
                />
              ) : null}
            </TabsContent>
          </Tabs>
        )}
      </SheetContent>
    </Sheet>
  );
}

function PayeeCard({ masked }: { masked: Record<string, unknown> | null }) {
  if (!masked || Object.keys(masked).length === 0) {
    return <p className="text-sm text-muted-foreground">Nenhum dado de recebimento cadastrado.</p>;
  }
  const get = (k: string) => (masked[k] == null ? "—" : String(masked[k]));
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-sm font-medium">
          <Landmark className="h-4 w-4 text-accent" /> Dados mascarados
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-1 text-sm">
        <p>Titular: {get("holder_name")}</p>
        <p>Documento: {get("holder_document")}</p>
        <p>Tipo: {get("payee_type")}</p>
        <p>Chave PIX: {get("pix_key")}</p>
        <p>
          Banco {get("bank_code")} · Ag. {get("bank_branch")} · Conta {get("bank_account")}
        </p>
        <p className="text-xs text-muted-foreground">
          Titularidade validada: {masked["ownership_validated"] ? "sim" : "não"}
        </p>
      </CardContent>
    </Card>
  );
}

function PayeeForm({
  onSubmit,
}: {
  onSubmit: (payload: {
    holderName: string;
    holderDocument: string;
    payeeType: "pix" | "bank_account";
    bankCode?: string;
    bankBranch?: string;
    bankAccount?: string;
    pixKey?: string;
    ownershipValidated: boolean;
    status: "active" | "inactive";
  }) => Promise<void>;
}) {
  const [form, setForm] = useState({
    holderName: "",
    holderDocument: "",
    payeeType: "pix" as "pix" | "bank_account",
    bankCode: "",
    bankBranch: "",
    bankAccount: "",
    pixKey: "",
    ownershipValidated: false,
    status: "inactive" as "active" | "inactive",
  });
  const [busy, setBusy] = useState(false);

  return (
    <div className="space-y-3 rounded-md border p-4">
      <p className="text-sm font-medium">Cadastrar / atualizar dados de recebimento</p>
      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2">
          <Label htmlFor="pf-holder">Titular</Label>
          <Input id="pf-holder" value={form.holderName} onChange={(e) => setForm({ ...form, holderName: e.target.value })} />
        </div>
        <div>
          <Label htmlFor="pf-doc">Documento do titular</Label>
          <Input id="pf-doc" value={form.holderDocument} onChange={(e) => setForm({ ...form, holderDocument: e.target.value })} />
        </div>
        <div>
          <Label htmlFor="pf-type">Tipo</Label>
          <Select value={form.payeeType} onValueChange={(v) => setForm({ ...form, payeeType: v as "pix" | "bank_account" })}>
            <SelectTrigger id="pf-type">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="pix">PIX</SelectItem>
              <SelectItem value="bank_account">Conta bancária</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {form.payeeType === "pix" ? (
          <div className="col-span-2">
            <Label htmlFor="pf-pix">Chave PIX</Label>
            <Input id="pf-pix" value={form.pixKey} onChange={(e) => setForm({ ...form, pixKey: e.target.value })} />
          </div>
        ) : (
          <>
            <div>
              <Label htmlFor="pf-bank">Banco</Label>
              <Input id="pf-bank" value={form.bankCode} onChange={(e) => setForm({ ...form, bankCode: e.target.value })} />
            </div>
            <div>
              <Label htmlFor="pf-branch">Agência</Label>
              <Input id="pf-branch" value={form.bankBranch} onChange={(e) => setForm({ ...form, bankBranch: e.target.value })} />
            </div>
            <div className="col-span-2">
              <Label htmlFor="pf-acct">Conta</Label>
              <Input id="pf-acct" value={form.bankAccount} onChange={(e) => setForm({ ...form, bankAccount: e.target.value })} />
            </div>
          </>
        )}
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <label className="flex items-center gap-2 text-xs text-muted-foreground">
          <input
            type="checkbox"
            checked={form.ownershipValidated}
            onChange={(e) => setForm({ ...form, ownershipValidated: e.target.checked })}
          />
          Titularidade conferida
        </label>
        <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v as "active" | "inactive" })}>
          <SelectTrigger className="w-36">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="inactive">Inativo</SelectItem>
            <SelectItem value="active">Ativo</SelectItem>
          </SelectContent>
        </Select>
        <Button
          size="sm"
          disabled={busy || form.holderName.length < 2 || form.holderDocument.length < 5}
          onClick={async () => {
            setBusy(true);
            try {
              await onSubmit(form);
            } catch (e) {
              toast.error(e instanceof Error ? e.message : "Falha ao salvar");
            } finally {
              setBusy(false);
            }
          }}
        >
          Salvar
        </Button>
      </div>
    </div>
  );
}

function NovaCertificacao({
  onSubmit,
}: {
  onSubmit: (p: { type: string; competency: string; status: "pending" | "approved" | "failed" | "expired" | "revoked" }) => Promise<void>;
}) {
  const [type, setType] = useState("");
  const [competency, setCompetency] = useState("");
  const [status, setStatus] = useState<"pending" | "approved" | "failed" | "expired" | "revoked">("pending");
  const [busy, setBusy] = useState(false);
  return (
    <div className="flex flex-wrap items-end gap-2 rounded-md border p-3">
      <div className="w-36">
        <Label className="text-xs">Tipo</Label>
        <Input value={type} onChange={(e) => setType(e.target.value)} placeholder="tecnica" />
      </div>
      <div className="w-44">
        <Label className="text-xs">Competência</Label>
        <Input value={competency} onChange={(e) => setCompetency(e.target.value)} />
      </div>
      <Select value={status} onValueChange={(v) => setStatus(v as never)}>
        <SelectTrigger className="w-36">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {Object.entries(CERT_STATUS).map(([v, l]) => (
            <SelectItem key={v} value={v}>
              {l}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Button
        size="sm"
        disabled={busy || type.length < 2 || competency.length < 2}
        onClick={async () => {
          setBusy(true);
          try {
            await onSubmit({ type, competency, status });
            setType("");
            setCompetency("");
          } catch (e) {
            toast.error(e instanceof Error ? e.message : "Falha ao registrar certificação");
          } finally {
            setBusy(false);
          }
        }}
      >
        Registrar
      </Button>
    </div>
  );
}

function NovoAcompanhamento({
  onSubmit,
}: {
  onSubmit: (p: { milestone: string; dayOffset?: number; evolution?: string; difficulties?: string }) => Promise<void>;
}) {
  const [milestone, setMilestone] = useState("D+30");
  const [dayOffset, setDayOffset] = useState("30");
  const [evolution, setEvolution] = useState("");
  const [difficulties, setDifficulties] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <div className="space-y-2 rounded-md border p-3">
      <div className="flex items-end gap-2">
        <div className="w-32">
          <Label className="text-xs">Marco</Label>
          <Input value={milestone} onChange={(e) => setMilestone(e.target.value)} />
        </div>
        <div className="w-24">
          <Label className="text-xs">Dia</Label>
          <Input value={dayOffset} onChange={(e) => setDayOffset(e.target.value)} inputMode="numeric" />
        </div>
      </div>
      <Textarea rows={2} placeholder="Evolução observada" value={evolution} onChange={(e) => setEvolution(e.target.value)} />
      <Textarea rows={2} placeholder="Dificuldades" value={difficulties} onChange={(e) => setDifficulties(e.target.value)} />
      <Button
        size="sm"
        disabled={busy || milestone.length < 2}
        onClick={async () => {
          setBusy(true);
          try {
            const n = Number(dayOffset);
            await onSubmit({
              milestone,
              ...(Number.isFinite(n) && n >= 0 && n <= 90 ? { dayOffset: n } : {}),
              ...(evolution ? { evolution } : {}),
              ...(difficulties ? { difficulties } : {}),
            });
            setEvolution("");
            setDifficulties("");
          } catch (e) {
            toast.error(e instanceof Error ? e.message : "Falha ao registrar acompanhamento");
          } finally {
            setBusy(false);
          }
        }}
      >
        <Handshake className="mr-2 h-4 w-4" /> Registrar acompanhamento
      </Button>
    </div>
  );
}
