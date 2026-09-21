import { createFileRoute } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { CheckCircle2, MessageSquarePlus, Plus, XCircle } from "lucide-react";
import { PageHeader } from "@/components/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useActiveCompanyId, useMyContext, usePermissions } from "@/hooks/use-foundation";
import { useOpportunities, useOpportunityDetail, usePricePolicies } from "@/hooks/use-crm";
import { addActivity, advanceStage, closeLost, closeWon, decideDiscount, issueProposal } from "@/lib/crm.functions";

export const Route = createFileRoute("/_authenticated/oportunidades")({
  head: () => ({ meta: [
    { title: "Oportunidades — IGA Network BR" },
    { name: "description", content: "Pipeline comercial, atividades, propostas versionadas e fechamento Won/Lost." },
    { property: "og:title", content: "Oportunidades — IGA Network BR" },
    { property: "og:description", content: "Pipeline comercial governado, com proposta e política de preço vinculada." },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" },
  ]}),
  component: Oportunidades,
});

const STAGES: Record<string, string> = { new: "Nova", qualified: "Qualificada", contact: "Contato", diagnosis: "Diagnóstico", demo: "Demonstração", proposal: "Proposta", negotiation: "Negociação", won: "Ganha", lost: "Perdida" };
const STATUS: Record<string, string> = { draft: "Rascunho", pending_approval: "Aguardando aprovação", approved: "Aprovada", rejected: "Rejeitada", sent: "Enviada", accepted: "Aceita", declined: "Recusada", expired: "Expirada", superseded: "Substituída", cancelled: "Cancelada" };
const key = (p: string) => `${p}-${crypto.randomUUID()}`;
const money = (v: number | string | null) => Number(v ?? 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

function Oportunidades() {
  const companyId = useActiveCompanyId();
  const [stage, setStage] = useState("");
  const [selected, setSelected] = useState<string | null>(null);
  const { data: rows, isLoading } = useOpportunities(companyId, stage || undefined);
  return <div>
    <PageHeader title="Oportunidades" description="Pipeline comercial do lead qualificado até o fechamento, com histórico de transições." />
    <div className="mb-4 flex gap-2 overflow-x-auto pb-1">
      <Button size="sm" variant={!stage ? "default" : "outline"} onClick={() => setStage("")}>Todas</Button>
      {Object.entries(STAGES).map(([v, l]) => <Button key={v} size="sm" variant={stage === v ? "default" : "outline"} onClick={() => setStage(v)}>{l}</Button>)}
    </div>
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {(rows ?? []).map((o) => <Card key={o.id} className="cursor-pointer transition-colors hover:bg-muted/40" onClick={() => setSelected(o.id)}><CardContent className="space-y-2 p-4">
        <div className="flex items-start justify-between gap-2"><div className="min-w-0"><p className="truncate text-sm font-medium">{o.name}</p><p className="truncate text-xs text-muted-foreground"><span className="font-mono">{o.code ?? "—"}</span> · {(o.leads as { company_name?: string } | null)?.company_name ?? "—"}</p></div><Badge variant={o.stage === "won" ? "default" : "secondary"}>{STAGES[o.stage] ?? o.stage}</Badge></div>
        <p className="text-xs text-muted-foreground">Parceiro: {(o.partners as { display_name?: string } | null)?.display_name ?? "não atribuído"}</p>
      </CardContent></Card>)}
    </div>
    {!rows?.length ? <p className="text-sm text-muted-foreground">{isLoading ? "Carregando…" : "Nenhuma oportunidade visível."}</p> : null}
    <OportunidadeDetalhe id={selected} companyId={companyId} onClose={() => setSelected(null)} />
  </div>;
}

function OportunidadeDetalhe({ id, companyId, onClose }: { id: string | null; companyId: string | null; onClose: () => void }) {
  const qc = useQueryClient();
  const { data } = useOpportunityDetail(id);
  const { data: policies } = usePricePolicies(companyId);
  const { can } = usePermissions(companyId);
  const { data: me } = useMyContext();
  const advance = useServerFn(advanceStage), activity = useServerFn(addActivity), proposal = useServerFn(issueProposal), decide = useServerFn(decideDiscount), won = useServerFn(closeWon), lost = useServerFn(closeLost);
  const [activityType, setActivityType] = useState("call"), [notes, setNotes] = useState(""), [nextAction, setNextAction] = useState("");
  const [policyId, setPolicyId] = useState(""), [discount, setDiscount] = useState("0"), [conditions, setConditions] = useState("");
  const [lossReason, setLossReason] = useState("price"), [competitor, setCompetitor] = useState("");
  if (!id) return null;
  const o = data?.opportunity;
  const refresh = () => { qc.invalidateQueries({ queryKey: ["opportunity", id] }); qc.invalidateQueries({ queryKey: ["opportunities"] }); qc.invalidateQueries({ queryKey: ["proposals"] }); };
  async function run(fn: () => Promise<unknown>, msg: string) { try { await fn(); toast.success(msg); refresh(); } catch (e) { toast.error((e as Error).message); } }
  return <Sheet open={!!id} onOpenChange={(v) => !v && onClose()}><SheetContent className="w-full overflow-y-auto sm:max-w-xl"><SheetHeader><SheetTitle>{o?.name ?? "Oportunidade"}</SheetTitle><SheetDescription><span className="font-mono">{o?.code ?? "—"}</span> · {STAGES[o?.stage ?? ""] ?? ""}</SheetDescription></SheetHeader>
    <Tabs defaultValue="pipeline" className="mt-4"><TabsList className="w-full"><TabsTrigger value="pipeline" className="flex-1">Pipeline</TabsTrigger><TabsTrigger value="atividades" className="flex-1">Atividades</TabsTrigger><TabsTrigger value="propostas" className="flex-1">Propostas</TabsTrigger></TabsList>
      <TabsContent value="pipeline" className="space-y-4 pt-4">
        <div className="flex flex-wrap gap-2">{Object.entries(STAGES).filter(([v]) => !["won", "lost"].includes(v)).map(([v, l]) => <Button key={v} size="sm" variant={o?.stage === v ? "default" : "outline"} disabled={["won", "lost"].includes(o?.stage ?? "")} onClick={() => run(() => advance({ data: { opportunityId: id, stage: v as never } }), `Etapa alterada para ${l}`)}>{l}</Button>)}</div>
        <Dialog><DialogTrigger asChild><Button size="sm" variant="destructive" disabled={["won", "lost"].includes(o?.stage ?? "")}><XCircle className="mr-2 h-4 w-4" />Marcar como perdida</Button></DialogTrigger><DialogContent><DialogHeader><DialogTitle>Encerrar como perdida</DialogTitle><DialogDescription>O motivo estruturado será preservado para análises futuras.</DialogDescription></DialogHeader><Select value={lossReason} onValueChange={setLossReason}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{[["price","Preço"],["timing","Momento"],["competitor","Concorrente"],["no_fit","Sem aderência"],["no_budget","Sem orçamento"],["no_response","Sem resposta"],["internal","Interno"],["other","Outro"]].map(([v,l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}</SelectContent></Select><Input placeholder="Concorrente (quando conhecido)" value={competitor} onChange={(e) => setCompetitor(e.target.value)} /><DialogFooter><Button variant="destructive" onClick={() => run(() => lost({ data: { opportunityId: id, reason: lossReason as never, competitor: competitor || undefined } }), "Oportunidade encerrada como perdida")}>Confirmar perda</Button></DialogFooter></DialogContent></Dialog>
        <div className="border-t pt-4"><p className="mb-2 text-xs font-medium text-muted-foreground">Histórico</p><ul className="space-y-2">{(data?.stages ?? []).map((s) => <li key={s.id} className="rounded-md border p-2 text-xs"><span className="font-medium">{s.from_stage ? `${STAGES[s.from_stage]} → ` : "Início → "}{STAGES[s.to_stage]}</span><p className="text-muted-foreground">{new Date(s.created_at).toLocaleString("pt-BR")}{s.reason ? ` · ${s.reason}` : ""}</p></li>)}</ul></div>
      </TabsContent>
      <TabsContent value="atividades" className="space-y-3 pt-4"><div className="grid grid-cols-2 gap-2"><Select value={activityType} onValueChange={setActivityType}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{[["call","Ligação"],["whatsapp","WhatsApp"],["email","E-mail"],["meeting","Reunião"],["visit","Visita"],["demo","Demonstração"],["note","Observação"]].map(([v,l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}</SelectContent></Select><Input placeholder="Próxima ação" value={nextAction} onChange={(e) => setNextAction(e.target.value)} /></div><Textarea placeholder="Resultado e observações" value={notes} onChange={(e) => setNotes(e.target.value)} /><Button size="sm" className="w-full" onClick={() => run(() => activity({ data: { companyId: companyId!, leadId: o?.lead_id, opportunityId: id, partnerId: o?.partner_id, type: activityType as never, notes: notes || undefined, nextAction: nextAction || undefined } }), "Atividade registrada")}><MessageSquarePlus className="mr-2 h-4 w-4" />Registrar atividade</Button><ul className="space-y-2">{(data?.activities ?? []).map((a) => <li key={a.id} className="rounded-md border p-2 text-xs"><span className="font-medium">{a.type}</span> · {new Date(a.occurred_at).toLocaleString("pt-BR")}<p className="text-muted-foreground">{a.notes ?? a.outcome ?? "—"}</p>{a.next_action ? <p className="text-muted-foreground">Próxima: {a.next_action}</p> : null}</li>)}</ul></TabsContent>
      <TabsContent value="propostas" className="space-y-4 pt-4">
        {can("proposal.create") || !!me?.isPlatformAdmin ? <div className="space-y-3 rounded-md border p-3"><Label>Política vigente</Label><Select value={policyId} onValueChange={setPolicyId}><SelectTrigger><SelectValue placeholder="Produto / plano / preço" /></SelectTrigger><SelectContent>{(policies ?? []).filter((p) => p.status === "active").map((p) => <SelectItem key={p.id} value={p.id}>{(p.products as { name?: string } | null)?.name} · {(p.plans as { name?: string } | null)?.name} · {money(p.monthly_price)}/mês</SelectItem>)}</SelectContent></Select><div className="grid grid-cols-2 gap-2"><div><Label>Desconto (%)</Label><Input type="number" min="0" max="100" value={discount} onChange={(e) => setDiscount(e.target.value)} /></div><div><Label>Validade</Label><Input type="date" /></div></div><Textarea placeholder="Condições comerciais" value={conditions} onChange={(e) => setConditions(e.target.value)} /><Button size="sm" className="w-full" disabled={!policyId} onClick={() => run(() => proposal({ data: { opportunityId: id, idempotencyKey: key("prop"), items: [{ price_policy_id: policyId, quantity: 1, discount_percent: Number(discount || 0) }], conditions: conditions || undefined } }), "Proposta emitida") }><Plus className="mr-2 h-4 w-4" />Emitir nova versão</Button></div> : null}
        <ul className="space-y-3">{(data?.proposals ?? []).map((p) => <li key={p.id} className="rounded-md border p-3 text-xs"><div className="flex items-center justify-between"><span className="font-medium">{p.code} · versão {p.version}</span><Badge variant={p.status === "approved" ? "default" : "secondary"}>{STATUS[p.status] ?? p.status}</Badge></div><p className="mt-1 text-muted-foreground">Implantação {money(p.total_setup_amount)} · Mensalidade {money(p.total_monthly_amount)} · Desconto máx. {p.max_discount_percent}%</p>{p.requires_approval ? <p className="mt-1 text-destructive">Fora da alçada — aprovação obrigatória</p> : null}<div className="mt-2 flex flex-wrap gap-2">{p.status === "pending_approval" && (can("proposal.approve") || !!me?.isPlatformAdmin) ? <><Button size="sm" onClick={() => run(() => decide({ data: { proposalId: p.id, approve: true, reason: "Aprovado conforme análise comercial" } }), "Desconto aprovado")}>Aprovar</Button><Button size="sm" variant="destructive" onClick={() => run(() => decide({ data: { proposalId: p.id, approve: false, reason: "Rejeitado conforme política comercial" } }), "Desconto rejeitado")}>Rejeitar</Button></> : null}{["approved","sent"].includes(p.status) && ["proposal","negotiation"].includes(o?.stage ?? "") ? <Button size="sm" variant="secondary" onClick={() => run(() => won({ data: { opportunityId: id, proposalId: p.id, idempotencyKey: key("won") } }), "Oportunidade encerrada como ganha")}><CheckCircle2 className="mr-2 h-4 w-4" />Fechar ganho</Button> : null}</div></li>)}</ul>
      </TabsContent>
    </Tabs>
  </SheetContent></Sheet>;
}
