import { createFileRoute } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { ArrowRight, UserPlus } from "lucide-react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { useActiveCompanyId, useMyContext, usePermissions } from "@/hooks/use-foundation";
import { useCandidateDetail, useCandidates } from "@/hooks/use-partners";
import {
  convertCandidate,
  createCandidate,
  updateCandidateStatus,
} from "@/lib/partners.functions";

export const Route = createFileRoute("/_authenticated/candidatos")({
  head: () => ({
    meta: [
      { title: "Recrutamento e Seleção — IGA Network BR" },
      { name: "description", content: "Funil de candidatos: origem, avaliações e decisões auditadas." },
      { property: "og:title", content: "Recrutamento e Seleção — IGA Network BR" },
      { property: "og:description", content: "Candidato não é parceiro: funil progressivo com auditoria." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Candidatos,
});

const STATUS_LABEL: Record<string, string> = {
  prospect: "Prospect",
  triage: "Triagem",
  prequalified: "Pré-qualificado",
  interview: "Entrevista",
  approved: "Aprovado",
  formalization: "Formalização",
  onboarding: "Onboarding",
  training: "Treinamento",
  certification: "Certificação",
  activation: "Ativação",
  rejected: "Reprovado",
  withdrawn: "Desistente",
  suspended: "Suspenso",
  archived: "Arquivado",
};

const TRANSITIONS: Record<string, string[]> = {
  prospect: ["triage", "rejected"],
  triage: ["prequalified", "rejected"],
  prequalified: ["interview", "rejected"],
  interview: ["approved", "rejected"],
  approved: ["formalization", "withdrawn"],
  formalization: ["onboarding", "withdrawn"],
  onboarding: ["training", "suspended"],
  training: ["certification", "suspended"],
  certification: ["activation", "suspended"],
  activation: [],
  rejected: ["archived"],
  withdrawn: ["archived"],
  suspended: ["archived"],
  archived: [],
};

function Candidatos() {
  const companyId = useActiveCompanyId();
  const { can } = usePermissions(companyId);
  const { data: me } = useMyContext();
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<string | null>(null);
  const { data: candidates, isLoading } = useCandidates(companyId, statusFilter || undefined, search || undefined);

  const canManage = can("candidate.manage") || !!me?.isPlatformAdmin;

  return (
    <div>
      <PageHeader
        title="Recrutamento e Seleção"
        description="Candidato não é parceiro. A conversão só acontece após formalização, via função idempotente no banco."
      />

      <Card>
        <CardHeader className="flex-row flex-wrap items-center justify-between gap-3 space-y-0">
          <CardTitle className="text-sm font-medium">Funil de candidatos</CardTitle>
          <div className="flex flex-wrap items-center gap-2">
            <Input
              className="w-48"
              placeholder="Buscar por nome"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-44">
                <SelectValue placeholder="Todos os status" />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(STATUS_LABEL).map(([v, l]) => (
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
            {canManage ? <NovoCandidato companyId={companyId} /> : null}
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Código</TableHead>
                <TableHead>Nome</TableHead>
                <TableHead>Origem</TableHead>
                <TableHead>Canal</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Desde</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(candidates ?? []).map((c) => (
                <TableRow
                  key={c.id}
                  className="cursor-pointer"
                  onClick={() => setSelected(c.id)}
                >
                  <TableCell className="font-mono text-xs">{c.code ?? "—"}</TableCell>
                  <TableCell className="text-sm font-medium">{c.full_name}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{c.source_channel ?? "—"}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{c.campaign ?? "—"}</TableCell>
                  <TableCell>
                    <Badge variant="secondary">{STATUS_LABEL[c.status] ?? c.status}</Badge>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {new Date(c.status_changed_at).toLocaleDateString("pt-BR")}
                  </TableCell>
                </TableRow>
              ))}
              {!candidates?.length ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-sm text-muted-foreground">
                    {isLoading
                      ? "Carregando…"
                      : "Nenhum candidato visível. A leitura exige a permissão candidate.read na empresa ativa."}
                  </TableCell>
                </TableRow>
              ) : null}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <CandidatoDetalhe candidateId={selected} onClose={() => setSelected(null)} canManage={canManage} />
    </div>
  );
}

function NovoCandidato({ companyId }: { companyId: string | null }) {
  const qc = useQueryClient();
  const createFn = useServerFn(createCandidate);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    fullName: "",
    email: "",
    phone: "",
    whatsapp: "",
    city: "",
    state: "",
    sourceChannel: "",
    campaign: "",
    referral: "",
    notes: "",
  });
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    if (!companyId || form.fullName.trim().length < 2) {
      toast.error("Informe o nome do candidato.");
      return;
    }
    setSaving(true);
    try {
      await createFn({
        data: {
          companyId,
          fullName: form.fullName.trim(),
          email: form.email || undefined,
          phone: form.phone || undefined,
          whatsapp: form.whatsapp || undefined,
          city: form.city || undefined,
          state: form.state || undefined,
          sourceChannel: form.sourceChannel || undefined,
          campaign: form.campaign || undefined,
          referral: form.referral || undefined,
          notes: form.notes || undefined,
        },
      });
      toast.success("Candidato registrado como prospect.");
      setOpen(false);
      setForm({ fullName: "", email: "", phone: "", whatsapp: "", city: "", state: "", sourceChannel: "", campaign: "", referral: "", notes: "" });
      qc.invalidateQueries({ queryKey: ["candidates"] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha ao registrar candidato");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" disabled={!companyId}>
          <UserPlus className="mr-2 h-4 w-4" /> Novo candidato
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Registrar candidato</DialogTitle>
          <DialogDescription>
            Entrada no funil como prospect. Origem e canal são preservados até a eventual conversão em parceiro.
          </DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2">
            <Label htmlFor="nc-name">Nome completo</Label>
            <Input id="nc-name" value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} />
          </div>
          <div>
            <Label htmlFor="nc-email">E-mail</Label>
            <Input id="nc-email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </div>
          <div>
            <Label htmlFor="nc-phone">Telefone</Label>
            <Input id="nc-phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          </div>
          <div>
            <Label htmlFor="nc-wpp">WhatsApp</Label>
            <Input id="nc-wpp" value={form.whatsapp} onChange={(e) => setForm({ ...form, whatsapp: e.target.value })} />
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div className="col-span-2">
              <Label htmlFor="nc-city">Cidade</Label>
              <Input id="nc-city" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
            </div>
            <div>
              <Label htmlFor="nc-uf">UF</Label>
              <Input id="nc-uf" maxLength={2} value={form.state} onChange={(e) => setForm({ ...form, state: e.target.value })} />
            </div>
          </div>
          <div>
            <Label htmlFor="nc-src">Canal de origem</Label>
            <Input id="nc-src" placeholder="indicacao, site, evento…" value={form.sourceChannel} onChange={(e) => setForm({ ...form, sourceChannel: e.target.value })} />
          </div>
          <div>
            <Label htmlFor="nc-camp">Campanha</Label>
            <Input id="nc-camp" value={form.campaign} onChange={(e) => setForm({ ...form, campaign: e.target.value })} />
          </div>
          <div className="col-span-2">
            <Label htmlFor="nc-ref">Indicado por</Label>
            <Input id="nc-ref" value={form.referral} onChange={(e) => setForm({ ...form, referral: e.target.value })} />
          </div>
          <div className="col-span-2">
            <Label htmlFor="nc-notes">Observações</Label>
            <Textarea id="nc-notes" rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          </div>
        </div>
        <DialogFooter>
          <Button onClick={submit} disabled={saving}>
            {saving ? "Registrando…" : "Registrar prospect"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function CandidatoDetalhe({
  candidateId,
  onClose,
  canManage,
}: {
  candidateId: string | null;
  onClose: () => void;
  canManage: boolean;
}) {
  const qc = useQueryClient();
  const { data, isLoading } = useCandidateDetail(candidateId);
  const statusFn = useServerFn(updateCandidateStatus);
  const convertFn = useServerFn(convertCandidate);
  const [nextStatus, setNextStatus] = useState("");
  const [decision, setDecision] = useState("");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);

  const cand = data?.candidate;
  const allowed = cand ? (TRANSITIONS[cand.status] ?? []) : [];

  const move = async () => {
    if (!candidateId || !nextStatus) return;
    setBusy(true);
    try {
      await statusFn({
        data: {
          candidateId,
          status: nextStatus as never,
          decision: decision || undefined,
          notes: notes || undefined,
        },
      });
      toast.success(`Status atualizado para ${STATUS_LABEL[nextStatus]}.`);
      setNextStatus("");
      setDecision("");
      setNotes("");
      qc.invalidateQueries({ queryKey: ["candidates"] });
      qc.invalidateQueries({ queryKey: ["candidate", candidateId] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha na transição");
    } finally {
      setBusy(false);
    }
  };

  const convert = async () => {
    if (!candidateId) return;
    setBusy(true);
    try {
      const res = await convertFn({
        data: { candidateId, idempotencyKey: `conv-${candidateId}-${Date.now()}` },
      });
      if (res.status === "replayed") {
        toast.info("Conversão já havia sido executada (idempotência).");
      } else {
        toast.success(`Candidato convertido. Parceiro ${res.code ?? ""} criado.`);
      }
      qc.invalidateQueries({ queryKey: ["candidates"] });
      qc.invalidateQueries({ queryKey: ["partners"] });
      qc.invalidateQueries({ queryKey: ["candidate", candidateId] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha na conversão");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Sheet open={!!candidateId} onOpenChange={(o) => (!o ? onClose() : null)}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-xl">
        <SheetHeader>
          <SheetTitle>{cand?.full_name ?? "Candidato"}</SheetTitle>
          <SheetDescription>
            {cand ? (
              <>
                {cand.code ?? "sem código"} · status atual:{" "}
                <Badge variant="secondary">{STATUS_LABEL[cand.status] ?? cand.status}</Badge>
              </>
            ) : (
              "Carregando…"
            )}
          </SheetDescription>
        </SheetHeader>

        {isLoading || !cand ? null : (
          <div className="mt-6 space-y-6">
            <section className="space-y-1 text-sm">
              <p className="font-medium">Dados e origem</p>
              <p className="text-muted-foreground">
                {cand.email ?? "sem e-mail"} · {cand.phone ?? "sem telefone"} · {cand.city ?? "—"}
                {cand.state ? `/${cand.state}` : ""}
              </p>
              <p className="text-muted-foreground">
                Origem: {cand.source_channel ?? "—"} · Campanha: {cand.campaign ?? "—"} · Indicação:{" "}
                {cand.referral ?? "—"}
              </p>
              {cand.approach ? <p className="text-muted-foreground">Abordagem: {cand.approach}</p> : null}
              {cand.notes ? <p className="text-muted-foreground">Obs.: {cand.notes}</p> : null}
            </section>

            {canManage && allowed.length ? (
              <section className="space-y-3 rounded-md border p-4">
                <p className="text-sm font-medium">Decisão de etapa (auditada)</p>
                <div className="grid grid-cols-2 gap-2">
                  <Select value={nextStatus} onValueChange={setNextStatus}>
                    <SelectTrigger>
                      <SelectValue placeholder="Próxima etapa" />
                    </SelectTrigger>
                    <SelectContent>
                      {allowed.map((s) => (
                        <SelectItem key={s} value={s}>
                          {STATUS_LABEL[s]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Input
                    placeholder="Decisão (ex.: aprovar)"
                    value={decision}
                    onChange={(e) => setDecision(e.target.value)}
                  />
                </div>
                <Textarea
                  rows={2}
                  placeholder="Justificativa da decisão"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
                <Button size="sm" onClick={move} disabled={busy || !nextStatus}>
                  <ArrowRight className="mr-2 h-4 w-4" /> Registrar decisão e mover
                </Button>
              </section>
            ) : null}

            {canManage && cand.status === "approved" ? (
              <section className="space-y-2 rounded-md border border-accent/40 p-4">
                <p className="text-sm font-medium">Conversão em parceiro</p>
                <p className="text-xs text-muted-foreground">
                  Disponível somente após formalização. Operação idempotente executada no banco: repetição com a
                  mesma chave retorna o resultado original sem duplicar o parceiro.
                </p>
                <Button size="sm" variant="default" onClick={convert} disabled={busy}>
                  Converter em parceiro
                </Button>
              </section>
            ) : null}

            <section className="space-y-2">
              <p className="text-sm font-medium">Avaliações registradas</p>
              {data?.evaluations.length ? (
                <ul className="space-y-2">
                  {data.evaluations.map((ev) => (
                    <li key={ev.id} className="rounded-md border p-3 text-sm">
                      <div className="flex items-center justify-between">
                        <Badge variant="outline">{ev.decision}</Badge>
                        <span className="text-xs text-muted-foreground">
                          {new Date(ev.evaluated_at).toLocaleString("pt-BR")}
                        </span>
                      </div>
                      {ev.notes ? <p className="mt-1 text-muted-foreground">{ev.notes}</p> : null}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-muted-foreground">Nenhuma avaliação registrada.</p>
              )}
            </section>

            <section className="space-y-2">
              <p className="text-sm font-medium">Histórico de etapas (append-only)</p>
              {data?.events.length ? (
                <ul className="space-y-1">
                  {data.events.map((ev) => (
                    <li key={ev.id} className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span className="whitespace-nowrap">{new Date(ev.created_at).toLocaleString("pt-BR")}</span>
                      <span>
                        {ev.from_status ? STATUS_LABEL[ev.from_status] : "início"} → {STATUS_LABEL[ev.to_status]}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-muted-foreground">Sem eventos.</p>
              )}
            </section>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
