import { createFileRoute } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { AlertTriangle, ArrowRightLeft, Phone, Plus, ShieldCheck, Target } from "lucide-react";
import { PageHeader } from "@/components/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useActiveCompanyId, useMyContext, usePermissions } from "@/hooks/use-foundation";
import { usePartners } from "@/hooks/use-partners";
import { useLeadDetail, useLeads } from "@/hooks/use-crm";
import {
  addActivity,
  assignLead,
  convertLead,
  createLead,
  findDuplicates,
  openConflict,
  protectLead,
  releaseProtection,
  resolveDuplicateFlag,
  transferProtection,
  updateLeadStatus,
} from "@/lib/crm.functions";

export const Route = createFileRoute("/_authenticated/leads")({
  head: () => ({
    meta: [
      { title: "Leads — IGA Network BR" },
      {
        name: "description",
        content: "Registro, deduplicação, atribuição e proteção comercial de leads com trilha de auditoria.",
      },
      { property: "og:title", content: "Leads — IGA Network BR" },
      {
        property: "og:description",
        content: "Proteção de lead é diferente de território: vigência própria, motivo e histórico.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Leads,
});

const LEAD_STATUS: Record<string, string> = {
  new: "Novo",
  contacted: "Contactado",
  qualified: "Qualificado",
  disqualified: "Desqualificado",
  converted: "Convertido",
  archived: "Arquivado",
};

const PROTECTION_STATUS: Record<string, string> = {
  protected: "Protegido",
  expired: "Expirado",
  released: "Liberado",
  transferred: "Transferido",
  disputed: "Em disputa",
};

const ACTIVITY_LABEL: Record<string, string> = {
  call: "Ligação",
  whatsapp: "WhatsApp",
  email: "E-mail",
  meeting: "Reunião",
  visit: "Visita",
  demo: "Demonstração",
  note: "Observação",
};

const key = (p: string) => `${p}-${crypto.randomUUID()}`;

function Leads() {
  const companyId = useActiveCompanyId();
  const { can } = usePermissions(companyId);
  const { data: me } = useMyContext();
  const [status, setStatus] = useState<string>("");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<string | null>(null);
  const { data: leads, isLoading } = useLeads(companyId, status || undefined, search || undefined);
  const admin = !!me?.isPlatformAdmin;
  const canCreate = can("lead.create") || can("lead.manage") || admin;

  return (
    <div>
      <PageHeader
        title="Leads"
        description="Carteira comercial com origem preservada, deduplicação assistida e proteção por lead — não por região."
      />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Input
          placeholder="Buscar empresa…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full sm:w-56"
        />
        <Select value={status || "all"} onValueChange={(v) => setStatus(v === "all" ? "" : v)}>
          <SelectTrigger className="w-full sm:w-44">
            <SelectValue placeholder="Situação" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas as situações</SelectItem>
            {Object.entries(LEAD_STATUS).map(([v, l]) => (
              <SelectItem key={v} value={v}>
                {l}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="ml-auto">{canCreate ? <NovoLead companyId={companyId} /> : null}</div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {(leads ?? []).map((l) => (
          <Card key={l.id} className="cursor-pointer transition-colors hover:bg-muted/40" onClick={() => setSelected(l.id)}>
            <CardContent className="space-y-2 p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{l.company_name}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    <span className="font-mono">{l.code ?? "—"}</span>
                    {l.city ? ` · ${l.city}/${l.state ?? ""}` : ""}
                    {l.segment ? ` · ${l.segment}` : ""}
                  </p>
                </div>
                <Badge variant="secondary">{LEAD_STATUS[l.status] ?? l.status}</Badge>
              </div>
              <p className="text-xs text-muted-foreground">
                Parceiro: {(l.partners as { display_name?: string } | null)?.display_name ?? "não atribuído"}
                {l.source ? ` · origem: ${l.source}` : ""}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {!leads?.length ? (
        <p className="text-sm text-muted-foreground">
          {isLoading ? "Carregando…" : "Nenhum lead visível. A leitura exige permissão de leads ou vínculo como parceiro."}
        </p>
      ) : null}

      <LeadDetalhe leadId={selected} onClose={() => setSelected(null)} companyId={companyId} />
    </div>
  );
}

function NovoLead({ companyId }: { companyId: string | null }) {
  const qc = useQueryClient();
  const create = useServerFn(createLead);
  const dedup = useServerFn(findDuplicates);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [dups, setDups] = useState<Array<{ lead_id: string; company_name: string; city: string | null }>>([]);
  const [form, setForm] = useState({
    company_name: "",
    segment: "",
    document: "",
    contact_name: "",
    phone: "",
    whatsapp: "",
    email: "",
    district: "",
    city: "",
    state: "",
    source: "",
    channel: "",
    campaign: "",
  });

  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  async function checar() {
    if (!companyId) return;
    const res = (await dedup({
      data: {
        companyId,
        document: form.document || undefined,
        email: form.email || undefined,
        phone: form.phone || undefined,
        companyName: form.company_name || undefined,
        city: form.city || undefined,
      },
    })) as Array<{ lead_id: string; company_name: string; city: string | null }>;
    setDups(res);
    toast.info(res.length ? `${res.length} possível(is) duplicidade(s)` : "Nenhuma duplicidade encontrada");
  }

  async function salvar() {
    if (!companyId) return;
    setBusy(true);
    try {
      const payload = Object.fromEntries(Object.entries(form).filter(([, v]) => v !== ""));
      const res = await create({
        data: { companyId, idempotencyKey: key("lead"), payload: payload as never },
      });
      if (res.status === "created") {
        const d = (res["duplicates"] as unknown[] | undefined) ?? [];
        toast.success(d.length ? `Lead criado com ${d.length} sinalização(ões) de duplicidade` : "Lead criado");
        setOpen(false);
        setForm({ ...form, company_name: "", document: "", phone: "", whatsapp: "", email: "" });
        qc.invalidateQueries({ queryKey: ["leads"] });
      } else {
        toast.info(`Operação: ${res.status}`);
      }
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus className="mr-2 h-4 w-4" /> Novo lead
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Novo lead</DialogTitle>
          <DialogDescription>Preencha o essencial. A duplicidade é apenas sinalizada, nunca bloqueada.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Label>Empresa *</Label>
            <Input value={form.company_name} onChange={(e) => set("company_name", e.target.value)} />
          </div>
          <div>
            <Label>Segmento</Label>
            <Input value={form.segment} onChange={(e) => set("segment", e.target.value)} />
          </div>
          <div>
            <Label>CNPJ/CPF</Label>
            <Input value={form.document} onChange={(e) => set("document", e.target.value)} />
          </div>
          <div>
            <Label>Contato</Label>
            <Input value={form.contact_name} onChange={(e) => set("contact_name", e.target.value)} />
          </div>
          <div>
            <Label>Telefone</Label>
            <Input value={form.phone} onChange={(e) => set("phone", e.target.value)} />
          </div>
          <div>
            <Label>WhatsApp</Label>
            <Input value={form.whatsapp} onChange={(e) => set("whatsapp", e.target.value)} />
          </div>
          <div>
            <Label>E-mail</Label>
            <Input value={form.email} onChange={(e) => set("email", e.target.value)} />
          </div>
          <div>
            <Label>Bairro</Label>
            <Input value={form.district} onChange={(e) => set("district", e.target.value)} />
          </div>
          <div>
            <Label>Cidade</Label>
            <Input value={form.city} onChange={(e) => set("city", e.target.value)} />
          </div>
          <div>
            <Label>UF</Label>
            <Input maxLength={2} value={form.state} onChange={(e) => set("state", e.target.value.toUpperCase())} />
          </div>
          <div>
            <Label>Origem</Label>
            <Input value={form.source} onChange={(e) => set("source", e.target.value)} />
          </div>
          <div>
            <Label>Canal</Label>
            <Input value={form.channel} onChange={(e) => set("channel", e.target.value)} />
          </div>
          <div>
            <Label>Campanha</Label>
            <Input value={form.campaign} onChange={(e) => set("campaign", e.target.value)} />
          </div>
        </div>
        {dups.length ? (
          <div className="rounded-md border border-destructive/40 bg-destructive/5 p-3 text-xs">
            <p className="mb-1 flex items-center gap-2 font-medium">
              <AlertTriangle className="h-4 w-4" /> Possíveis duplicidades
            </p>
            <ul className="list-inside list-disc text-muted-foreground">
              {dups.map((d) => (
                <li key={d.lead_id}>
                  {d.company_name} {d.city ? `· ${d.city}` : ""}
                </li>
              ))}
            </ul>
          </div>
        ) : null}
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={checar} disabled={busy}>
            Verificar duplicidade
          </Button>
          <Button onClick={salvar} disabled={busy || form.company_name.length < 2}>
            Salvar lead
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function LeadDetalhe({
  leadId,
  companyId,
  onClose,
}: {
  leadId: string | null;
  companyId: string | null;
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const { can } = usePermissions(companyId);
  const { data: me } = useMyContext();
  const { data } = useLeadDetail(leadId);
  const { data: partners } = usePartners(companyId);
  const admin = !!me?.isPlatformAdmin;

  const setStatusFn = useServerFn(updateLeadStatus);
  const assignFn = useServerFn(assignLead);
  const convertFn = useServerFn(convertLead);
  const activityFn = useServerFn(addActivity);
  const protectFn = useServerFn(protectLead);
  const releaseFn = useServerFn(releaseProtection);
  const transferFn = useServerFn(transferProtection);
  const conflictFn = useServerFn(openConflict);
  const dupFn = useServerFn(resolveDuplicateFlag);

  const [partnerId, setPartnerId] = useState("");
  const [days, setDays] = useState("30");
  const [reason, setReason] = useState("");
  const [act, setAct] = useState({ type: "call", outcome: "", notes: "", next_action: "" });

  if (!leadId) return null;
  const lead = data?.lead;
  const protections = data?.protections ?? [];
  const active = protections.find((p) => p.status === "protected");

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["lead", leadId] });
    qc.invalidateQueries({ queryKey: ["leads"] });
    qc.invalidateQueries({ queryKey: ["opportunities"] });
  };
  const run = async (fn: () => Promise<unknown>, ok: string) => {
    try {
      const res = (await fn()) as { status?: string; reason?: string };
      if (res?.status === "blocked") toast.error(res.reason ?? "Operação bloqueada");
      else toast.success(ok);
      refresh();
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  return (
    <Sheet open={!!leadId} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-xl">
        <SheetHeader>
          <SheetTitle>{lead?.company_name ?? "Lead"}</SheetTitle>
          <SheetDescription>
            <span className="font-mono">{lead?.code ?? "—"}</span> · {LEAD_STATUS[lead?.status ?? ""] ?? ""} ·{" "}
            {lead?.city ?? "—"}/{lead?.state ?? "—"}
          </SheetDescription>
        </SheetHeader>

        <Tabs defaultValue="acoes" className="mt-4">
          <TabsList className="w-full">
            <TabsTrigger value="acoes" className="flex-1">
              Ações
            </TabsTrigger>
            <TabsTrigger value="protecao" className="flex-1">
              Proteção
            </TabsTrigger>
            <TabsTrigger value="dedup" className="flex-1">
              Duplicidade
            </TabsTrigger>
          </TabsList>

          <TabsContent value="acoes" className="space-y-4 pt-4">
            <div className="grid grid-cols-2 gap-2">
              {(["call", "whatsapp", "visit", "note"] as const).map((t) => (
                <Button
                  key={t}
                  variant={act.type === t ? "default" : "outline"}
                  size="sm"
                  onClick={() => setAct((a) => ({ ...a, type: t }))}
                >
                  <Phone className="mr-2 h-4 w-4" /> {ACTIVITY_LABEL[t]}
                </Button>
              ))}
            </div>
            <Input
              placeholder="Resultado"
              value={act.outcome}
              onChange={(e) => setAct((a) => ({ ...a, outcome: e.target.value }))}
            />
            <Input
              placeholder="Próxima ação"
              value={act.next_action}
              onChange={(e) => setAct((a) => ({ ...a, next_action: e.target.value }))}
            />
            <Textarea
              placeholder="Observação"
              value={act.notes}
              onChange={(e) => setAct((a) => ({ ...a, notes: e.target.value }))}
            />
            <Button
              size="sm"
              className="w-full"
              onClick={() =>
                run(
                  () =>
                    activityFn({
                      data: {
                        companyId: companyId!,
                        leadId,
                        partnerId: lead?.partner_id ?? null,
                        type: act.type as never,
                        outcome: act.outcome || undefined,
                        notes: act.notes || undefined,
                        nextAction: act.next_action || undefined,
                      },
                    }),
                  "Atividade registrada",
                )
              }
            >
              Registrar atividade
            </Button>

            <div className="grid gap-2 border-t pt-4 sm:grid-cols-2">
              <Select
                value={lead?.status ?? "new"}
                onValueChange={(v) => run(() => setStatusFn({ data: { leadId, status: v as never } }), "Situação atualizada")}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(LEAD_STATUS).map(([v, l]) => (
                    <SelectItem key={v} value={v}>
                      {l}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                size="sm"
                variant="secondary"
                disabled={lead?.status !== "qualified" || !!data?.opportunity}
                onClick={() =>
                  run(() => convertFn({ data: { leadId, idempotencyKey: key("opp") } }), "Oportunidade criada")
                }
              >
                <Target className="mr-2 h-4 w-4" />
                {data?.opportunity ? "Já convertido" : "Converter em oportunidade"}
              </Button>
            </div>

            {can("lead.assign") || can("lead.manage") || admin ? (
              <div className="space-y-2 border-t pt-4">
                <Label>Atribuir a parceiro</Label>
                <Select value={partnerId} onValueChange={setPartnerId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o parceiro" />
                  </SelectTrigger>
                  <SelectContent>
                    {(partners ?? []).map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.display_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  size="sm"
                  disabled={!partnerId}
                  onClick={() => run(() => assignFn({ data: { leadId, partnerId } }), "Lead atribuído")}
                >
                  Atribuir
                </Button>
              </div>
            ) : null}

            <div className="border-t pt-4">
              <p className="mb-2 text-xs font-medium text-muted-foreground">Atividades recentes</p>
              <ul className="space-y-2">
                {(data?.activities ?? []).map((a) => (
                  <li key={a.id} className="rounded-md border p-2 text-xs">
                    <span className="font-medium">{ACTIVITY_LABEL[a.type] ?? a.type}</span> ·{" "}
                    {new Date(a.occurred_at).toLocaleString("pt-BR")}
                    {a.outcome ? <p className="text-muted-foreground">{a.outcome}</p> : null}
                    {a.next_action ? <p className="text-muted-foreground">Próxima: {a.next_action}</p> : null}
                  </li>
                ))}
              </ul>
            </div>
          </TabsContent>

          <TabsContent value="protecao" className="space-y-4 pt-4">
            <p className="text-xs text-muted-foreground">
              A proteção vale para este lead específico e tem vigência própria. Relação territorial não gera propriedade
              permanente sobre a região.
            </p>
            {can("lead.protection.manage") || admin ? (
              <div className="space-y-2 rounded-md border p-3">
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
                <div className="flex gap-2">
                  <Input value={days} onChange={(e) => setDays(e.target.value)} className="w-24" placeholder="dias" />
                  <Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Motivo" />
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    disabled={!partnerId}
                    onClick={() =>
                      run(
                        () =>
                          protectFn({
                            data: {
                              leadId,
                              partnerId,
                              validUntil: new Date(Date.now() + Number(days || 30) * 86400000).toISOString(),
                              reason: reason || undefined,
                              idempotencyKey: key("prot"),
                            },
                          }),
                        "Proteção registrada",
                      )
                    }
                  >
                    <ShieldCheck className="mr-2 h-4 w-4" /> Proteger
                  </Button>
                  {active ? (
                    <>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={!partnerId}
                        onClick={() =>
                          run(
                            () =>
                              transferFn({
                                data: {
                                  protectionId: active.id,
                                  toPartnerId: partnerId,
                                  reason: reason || "transferência comercial",
                                  idempotencyKey: key("transf"),
                                },
                              }),
                            "Proteção transferida",
                          )
                        }
                      >
                        <ArrowRightLeft className="mr-2 h-4 w-4" /> Transferir
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() =>
                          run(() => releaseFn({ data: { protectionId: active.id, reason } }), "Proteção liberada")
                        }
                      >
                        Liberar
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        disabled={!partnerId}
                        onClick={() =>
                          run(
                            () =>
                              conflictFn({
                                data: {
                                  leadId,
                                  claimantPartnerId: partnerId,
                                  evidence: { motivo: reason || "reivindicação" },
                                  idempotencyKey: key("conf"),
                                },
                              }),
                            "Conflito aberto para aprovação",
                          )
                        }
                      >
                        Abrir conflito
                      </Button>
                    </>
                  ) : null}
                </div>
              </div>
            ) : null}
            <ul className="space-y-2">
              {protections.map((p) => (
                <li key={p.id} className="rounded-md border p-2 text-xs">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium">
                      {(p.partners as { display_name?: string } | null)?.display_name ?? "parceiro"}
                    </span>
                    <Badge variant={p.status === "protected" ? "default" : "outline"}>
                      {PROTECTION_STATUS[p.status] ?? p.status}
                    </Badge>
                  </div>
                  <p className="text-muted-foreground">
                    {new Date(p.valid_from).toLocaleDateString("pt-BR")} →{" "}
                    {new Date(p.valid_until).toLocaleDateString("pt-BR")} · origem: {p.origin}
                  </p>
                  {p.reason ? <p className="text-muted-foreground">{p.reason}</p> : null}
                </li>
              ))}
            </ul>
          </TabsContent>

          <TabsContent value="dedup" className="space-y-3 pt-4">
            {(data?.duplicates ?? []).length ? (
              (data?.duplicates ?? []).map((d) => (
                <div key={d.id} className="rounded-md border p-3 text-xs">
                  <p className="font-medium">Coincidiu em: {(d.matched_on ?? []).join(", ") || "—"}</p>
                  <p className="text-muted-foreground">Pontuação: {d.score} · situação: {d.status}</p>
                  {d.status === "open" && (can("lead.manage") || admin) ? (
                    <div className="mt-2 flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          run(
                            () => dupFn({ data: { flagId: d.id, status: "duplicate_confirmed" } }),
                            "Marcado como duplicado",
                          )
                        }
                      >
                        É duplicado
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() =>
                          run(
                            () => dupFn({ data: { flagId: d.id, status: "distinct_confirmed" } }),
                            "Marcado como distinto",
                          )
                        }
                      >
                        É distinto
                      </Button>
                    </div>
                  ) : null}
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">Nenhuma sinalização de duplicidade.</p>
            )}
          </TabsContent>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
}
