/**
 * PA-F2 — Bateria de testes da Fase 2 (Parceiros, Territórios e Onboarding).
 * Executa contra o backend real, com fixtures isoladas por execução.
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { cleanup } from "../fase1/helpers";
import {
  addMembership,
  admin,
  advanceToApproved,
  anon,
  cleanupFase2,
  createCompany,
  createUser,
  grantRole,
  runId,
  seedCandidate,
  seedChecklist,
  seedTerritory,
  type TestUser,
} from "./helpers2";

const run = runId();
const a = admin();

let companyA = "";
let companyB = "";
let adminA: TestUser;
let adminB: TestUser;
let memberA: TestUser;
let checklistA = "";

beforeAll(async () => {
  companyA = await createCompany(a, `F2 Empresa A ${run}`);
  companyB = await createCompany(a, `F2 Empresa B ${run}`);

  adminA = await createUser(a, "adminA", run);
  adminB = await createUser(a, "adminB", run);
  memberA = await createUser(a, "memberA", run);

  await addMembership(a, adminA.id, companyA);
  await addMembership(a, adminB.id, companyB);
  await addMembership(a, memberA.id, companyA);

  await grantRole(a, { userId: adminA.id, roleCode: "company_admin", companyId: companyA });
  await grantRole(a, { userId: adminB.id, roleCode: "company_admin", companyId: companyB });
  await grantRole(a, { userId: memberA.id, roleCode: "member", companyId: companyA });

  checklistA = await seedChecklist(a, companyA);
}, 120_000);

afterAll(async () => {
  await cleanupFase2(a, [companyA, companyB]);
  await cleanup(a, [companyA, companyB], [adminA.id, adminB.id, memberA.id]);
}, 120_000);

// ---------- F2-CAND: funil de candidatos ----------

describe("F2-CAND — Recrutamento e seleção", () => {
  it("F2-CAND-001 anônimo não lê candidatos", async () => {
    const { data, error } = await anon().from("candidates").select("id").limit(1);
    expect(error !== null || (data ?? []).length === 0).toBe(true);
  });

  it("F2-CAND-002 admin cria candidato como prospect", async () => {
    const { data, error } = await adminA.db
      .from("candidates")
      .insert({ company_id: companyA, full_name: `Cand Basico ${run}`, source_channel: "site" })
      .select("id, status, source_channel")
      .single();
    expect(error).toBeNull();
    expect(data?.status).toBe("prospect");
    expect(data?.source_channel).toBe("site");
  });

  it("F2-CAND-003 candidato de outra empresa é invisível (isolamento)", async () => {
    const cid = await seedCandidate(a, companyB, `Cand B ${run}`);
    const { data } = await adminA.db.from("candidates").select("id").eq("id", cid);
    expect(data ?? []).toHaveLength(0);
  });

  it("F2-CAND-004 transição inválida do funil é recusada", async () => {
    const cid = await seedCandidate(a, companyA, `Cand Salto ${run}`);
    const { error } = await adminA.db.from("candidates").update({ status: "activation" }).eq("id", cid);
    expect(error).not.toBeNull();
  });

  it("F2-CAND-005 transição válida é aceita e gera evento imutável", async () => {
    const cid = await seedCandidate(a, companyA, `Cand Fluxo ${run}`);
    const { error } = await adminA.db.from("candidates").update({ status: "triage" }).eq("id", cid);
    expect(error).toBeNull();
    const { data: ev } = await adminA.db
      .from("candidate_stage_events")
      .select("from_status, to_status")
      .eq("candidate_id", cid);
    expect((ev ?? []).some((e) => e.to_status === "triage")).toBe(true);
  });

  it("F2-CAND-006 histórico de etapas não pode ser alterado nem apagado", async () => {
    const cid = await seedCandidate(a, companyA, `Cand Hist ${run}`);
    await adminA.db.from("candidates").update({ status: "triage" }).eq("id", cid);
    const { data: ev } = await a.from("candidate_stage_events").select("id").eq("candidate_id", cid).limit(1);
    const id = ev?.[0]?.id as string;
    const upd = await a.from("candidate_stage_events").update({ reason: "hack" }).eq("id", id);
    const del = await a.from("candidate_stage_events").delete().eq("id", id);
    expect(upd.error).not.toBeNull();
    expect(del.error).not.toBeNull();
  });

  it("F2-CAND-007 avaliação registra avaliador e é imutável", async () => {
    const cid = await seedCandidate(a, companyA, `Cand Aval ${run}`);
    const { data, error } = await adminA.db
      .from("candidate_evaluations")
      .insert({
        company_id: companyA,
        candidate_id: cid,
        stage: "prospect",
        decision: "avancar",
        evaluator_id: adminA.id,
      })
      .select("id, evaluator_id")
      .single();
    expect(error).toBeNull();
    expect(data?.evaluator_id).toBe(adminA.id);
    await adminA.db.from("candidate_evaluations").update({ decision: "x" }).eq("id", data!.id);
    const { data: after } = await a.from("candidate_evaluations").select("decision").eq("id", data!.id).single();
    expect(after?.decision).toBe("avancar");
  });

  it("F2-CAND-008 membro sem permissão não cria candidato", async () => {
    const { error } = await memberA.db
      .from("candidates")
      .insert({ company_id: companyA, full_name: `Cand Negado ${run}` });
    expect(error).not.toBeNull();
  });
});

// ---------- F2-CONV: conversão candidato → parceiro ----------

describe("F2-CONV — Conversão em parceiro", () => {
  it("F2-CONV-001 conversão antes da aprovação é recusada", async () => {
    const cid = await seedCandidate(a, companyA, `Cand Cedo ${run}`);
    const { data, error } = await adminA.db.rpc("convert_candidate_to_partner", {
      _candidate_id: cid,
      _idempotency_key: `k-${run}-cedo`,
    });
    expect(error !== null || (data as { status?: string })?.status === "error").toBe(true);
  });

  it("F2-CONV-002 conversão após aprovação cria parceiro preservando origem", async () => {
    const cid = await seedCandidate(a, companyA, `Cand Ok ${run}`);
    await advanceToApproved(a, cid);
    const { data, error } = await adminA.db.rpc("convert_candidate_to_partner", {
      _candidate_id: cid,
      _idempotency_key: `k-${run}-ok`,
    });
    expect(error).toBeNull();
    const res = data as { status: string; partner_id: string; code: string };
    expect(res.partner_id).toBeTruthy();
    expect(res.code).toMatch(/^PAR-/);
    const { data: p } = await adminA.db
      .from("partners")
      .select("candidate_id, source_channel, status")
      .eq("id", res.partner_id)
      .single();
    expect(p?.candidate_id).toBe(cid);
    expect(p?.source_channel).toBe("indicacao");
    expect(p?.status).toBe("onboarding");
  });

  it("F2-CONV-003 conversão é idempotente: mesma chave não duplica parceiro", async () => {
    const cid = await seedCandidate(a, companyA, `Cand Idem ${run}`);
    await advanceToApproved(a, cid);
    const key = `k-${run}-idem`;
    const first = await adminA.db.rpc("convert_candidate_to_partner", { _candidate_id: cid, _idempotency_key: key });
    const second = await adminA.db.rpc("convert_candidate_to_partner", { _candidate_id: cid, _idempotency_key: key });
    const r1 = first.data as { partner_id: string };
    const r2 = second.data as { status: string; partner_id: string };
    expect(r2.status).toBe("replayed");
    expect(r2.partner_id).toBe(r1.partner_id);
    const { count } = await a
      .from("partners")
      .select("id", { count: "exact", head: true })
      .eq("candidate_id", cid);
    expect(count).toBe(1);
  });

  it("F2-CONV-004 conversão instancia o checklist de onboarding", async () => {
    const cid = await seedCandidate(a, companyA, `Cand Check ${run}`);
    await advanceToApproved(a, cid);
    const { data } = await adminA.db.rpc("convert_candidate_to_partner", {
      _candidate_id: cid,
      _idempotency_key: `k-${run}-check`,
    });
    const pid = (data as { partner_id: string }).partner_id;
    const { data: items } = await adminA.db
      .from("partner_onboarding_items")
      .select("item_code, status, checklist_id")
      .eq("partner_id", pid);
    expect((items ?? []).length).toBeGreaterThanOrEqual(3);
    expect((items ?? []).every((i) => i.status === "pending")).toBe(true);
    expect((items ?? [])[0]?.checklist_id).toBe(checklistA);
  });

  it("F2-CONV-005 admin de outra empresa não converte candidato alheio", async () => {
    const cid = await seedCandidate(a, companyA, `Cand Alheio ${run}`);
    await advanceToApproved(a, cid);
    const { data, error } = await adminB.db.rpc("convert_candidate_to_partner", {
      _candidate_id: cid,
      _idempotency_key: `k-${run}-alheio`,
    });
    expect(error !== null || (data as { status?: string })?.status === "error").toBe(true);
  });
});

// ---------- F2-ONB: onboarding ----------

describe("F2-ONB — Onboarding versionável", () => {
  let partnerId = "";

  beforeAll(async () => {
    const cid = await seedCandidate(a, companyA, `Cand Onb ${run}`);
    await advanceToApproved(a, cid);
    const { data } = await adminA.db.rpc("convert_candidate_to_partner", {
      _candidate_id: cid,
      _idempotency_key: `k-${run}-onb`,
    });
    partnerId = (data as { partner_id: string }).partner_id;
  }, 60_000);

  it("F2-ONB-001 nova versão do checklist não altera instâncias existentes", async () => {
    const { data: v2, error } = await a
      .from("onboarding_checklists")
      .insert({ company_id: companyA, code: "onboarding_padrao", name: "Onboarding padrão", version: 2, is_active: true })
      .select("id")
      .single();
    expect(error).toBeNull();
    const { data: items } = await adminA.db
      .from("partner_onboarding_items")
      .select("checklist_id")
      .eq("partner_id", partnerId);
    expect((items ?? []).every((i) => i.checklist_id === checklistA)).toBe(true);
    expect(v2?.id).not.toBe(checklistA);
  });

  it("F2-ONB-002 conclusão de item registra responsável e data", async () => {
    const { data: item } = await adminA.db
      .from("partner_onboarding_items")
      .select("id")
      .eq("partner_id", partnerId)
      .limit(1)
      .single();
    const { error } = await adminA.db
      .from("partner_onboarding_items")
      .update({ status: "done", responsible_id: adminA.id, completed_at: new Date().toISOString() })
      .eq("id", item!.id);
    expect(error).toBeNull();
    const { data: after } = await adminA.db
      .from("partner_onboarding_items")
      .select("status, responsible_id, completed_at")
      .eq("id", item!.id)
      .single();
    expect(after?.status).toBe("done");
    expect(after?.responsible_id).toBe(adminA.id);
    expect(after?.completed_at).toBeTruthy();
  });

  it("F2-ONB-003 item de onboarding não pode ser excluído", async () => {
    const { data: item } = await a
      .from("partner_onboarding_items")
      .select("id")
      .eq("partner_id", partnerId)
      .limit(1)
      .single();
    const { error } = await adminA.db.from("partner_onboarding_items").delete().eq("id", item!.id);
    const { count } = await a
      .from("partner_onboarding_items")
      .select("id", { count: "exact", head: true })
      .eq("id", item!.id);
    expect(error !== null || count === 1).toBe(true);
  });
});

// ---------- F2-CAP: capacitação e certificação ----------

describe("F2-CAP — Treinamento e certificação", () => {
  let partnerId = "";
  let trackId = "";

  beforeAll(async () => {
    const cid = await seedCandidate(a, companyA, `Cand Cap ${run}`);
    await advanceToApproved(a, cid);
    const { data } = await adminA.db.rpc("convert_candidate_to_partner", {
      _candidate_id: cid,
      _idempotency_key: `k-${run}-cap`,
    });
    partnerId = (data as { partner_id: string }).partner_id;
    const { data: track } = await a
      .from("training_tracks")
      .insert({ company_id: companyA, code: "basica", name: "Trilha básica", is_required: true, validity_months: 12 })
      .select("id")
      .single();
    trackId = track!.id;
  }, 60_000);

  it("F2-CAP-001 progresso de trilha é registrado", async () => {
    const { data, error } = await adminA.db
      .from("partner_trainings")
      .insert({
        company_id: companyA,
        partner_id: partnerId,
        track_id: trackId,
        status: "completed",
        result: "aprovado",
        score: 90,
        completed_at: new Date().toISOString(),
      })
      .select("id, status, score")
      .single();
    expect(error).toBeNull();
    expect(data?.status).toBe("completed");
    expect(Number(data?.score)).toBe(90);
  });

  it("F2-CAP-002 certificação sobrevive à suspensão do parceiro", async () => {
    const { data: cert } = await adminA.db
      .from("partner_certifications")
      .insert({
        company_id: companyA,
        partner_id: partnerId,
        type: "tecnica",
        competency: "implantacao",
        status: "approved",
        issued_at: new Date().toISOString(),
      })
      .select("id")
      .single();
    await adminA.db.from("partners").update({ status: "suspended" }).eq("id", partnerId);
    const { data: after } = await adminA.db
      .from("partner_certifications")
      .select("status")
      .eq("id", cert!.id)
      .single();
    expect(after?.status).toBe("approved");
    await adminA.db.from("partners").update({ status: "active" }).eq("id", partnerId);
  });

  it("F2-CAP-003 trilha de outra empresa é invisível", async () => {
    const { data } = await adminB.db.from("training_tracks").select("id").eq("id", trackId);
    expect(data ?? []).toHaveLength(0);
  });
});

// ---------- F2-TER: territórios ----------

describe("F2-TER — Territórios", () => {
  let partnerId = "";
  let partner2Id = "";
  let territoryId = "";

  beforeAll(async () => {
    for (const [label, key] of [["Ter1", "ter1"], ["Ter2", "ter2"]] as const) {
      const cid = await seedCandidate(a, companyA, `Cand ${label} ${run}`);
      await advanceToApproved(a, cid);
      const { data } = await adminA.db.rpc("convert_candidate_to_partner", {
        _candidate_id: cid,
        _idempotency_key: `k-${run}-${key}`,
      });
      const pid = (data as { partner_id: string }).partner_id;
      if (key === "ter1") partnerId = pid;
      else partner2Id = pid;
    }
    territoryId = await seedTerritory(a, companyA, `TER-${run}`);
  }, 90_000);

  it("F2-TER-001 território existe sem parceiro vinculado", async () => {
    const { data } = await adminA.db.from("territories").select("id, default_mode").eq("id", territoryId).single();
    expect(data?.id).toBe(territoryId);
    expect(data?.default_mode).toBe("open");
  });

  it("F2-TER-002 atribuição não protegida é aceita", async () => {
    const { data, error } = await adminA.db.rpc("assign_partner_territory", {
      _partner_id: partnerId,
      _territory_id: territoryId,
      _mode: "recommended_base",
      _valid_until: null,
      _reason: "base inicial",
      _idempotency_key: `t-${run}-base`,
    });
    expect(error).toBeNull();
    expect((data as { status: string }).status).toBe("created");
  });

  it("F2-TER-003 atribuição é idempotente", async () => {
    const key = `t-${run}-idem`;
    const first = await adminA.db.rpc("assign_partner_territory", {
      _partner_id: partner2Id,
      _territory_id: territoryId,
      _mode: "preferred",
      _valid_until: null,
      _reason: null,
      _idempotency_key: key,
    });
    const second = await adminA.db.rpc("assign_partner_territory", {
      _partner_id: partner2Id,
      _territory_id: territoryId,
      _mode: "preferred",
      _valid_until: null,
      _reason: null,
      _idempotency_key: key,
    });
    expect((second.data as { status: string }).status).toBe("replayed");
    expect((second.data as { partner_territory_id: string }).partner_territory_id).toBe(
      (first.data as { partner_territory_id: string }).partner_territory_id,
    );
  });

  it("F2-TER-004 modo protegido exige vigência com término", async () => {
    const terr = await seedTerritory(a, companyA, `TERP-${run}`);
    const { data, error } = await adminA.db.rpc("assign_partner_territory", {
      _partner_id: partnerId,
      _territory_id: terr,
      _mode: "protected",
      _valid_until: null,
      _reason: "exclusividade",
      _idempotency_key: `t-${run}-prot-sem-data`,
    });
    expect(error !== null || (data as { status?: string })?.status === "error").toBe(true);
  });

  it("F2-TER-005 protegido vigente bloqueia segundo protegido no mesmo território", async () => {
    const terr = await seedTerritory(a, companyA, `TERX-${run}`);
    const until = new Date(Date.now() + 30 * 86_400_000).toISOString();
    const ok = await adminA.db.rpc("assign_partner_territory", {
      _partner_id: partnerId,
      _territory_id: terr,
      _mode: "protected",
      _valid_until: until,
      _reason: "exclusividade aprovada",
      _idempotency_key: `t-${run}-prot-1`,
    });
    expect((ok.data as { status?: string })?.status).toBe("created");
    const dup = await adminA.db.rpc("assign_partner_territory", {
      _partner_id: partner2Id,
      _territory_id: terr,
      _mode: "protected",
      _valid_until: until,
      _reason: "tentativa de sobreposição",
      _idempotency_key: `t-${run}-prot-2`,
    });
    expect(dup.error !== null || (dup.data as { status?: string })?.status === "error").toBe(true);
  });

  it("F2-TER-006 território de outra empresa é invisível", async () => {
    const { data } = await adminB.db.from("territories").select("id").eq("id", territoryId);
    expect(data ?? []).toHaveLength(0);
  });

  it("F2-TER-007 alterações territoriais ficam na trilha de auditoria", async () => {
    const { data } = await a
      .from("audit_events")
      .select("id")
      .eq("company_id", companyA)
      .eq("object_type", "partner_territories")
      .limit(1);
    expect((data ?? []).length).toBeGreaterThan(0);
  });
});

// ---------- F2-PAY: payee profile ----------

describe("F2-PAY — Dados de recebimento", () => {
  let partnerId = "";

  beforeAll(async () => {
    const cid = await seedCandidate(a, companyA, `Cand Pay ${run}`);
    await advanceToApproved(a, cid);
    const { data } = await adminA.db.rpc("convert_candidate_to_partner", {
      _candidate_id: cid,
      _idempotency_key: `k-${run}-pay`,
    });
    partnerId = (data as { partner_id: string }).partner_id;
    await adminA.db.from("payee_profiles").insert({
      company_id: companyA,
      partner_id: partnerId,
      holder_name: "Parceiro Teste",
      holder_document: "12345678901",
      payee_type: "pix",
      pix_key: "parceiro@iga-test.example.com",
      bank_code: "001",
      bank_branch: "1234",
      bank_account: "987654321",
    });
  }, 60_000);

  it("F2-PAY-001 RPC mascarada não devolve dados completos", async () => {
    const { data, error } = await adminA.db.rpc("get_payee_profile_masked", { _partner_id: partnerId });
    expect(error).toBeNull();
    const masked = data as Record<string, string | null>;
    expect(masked["bank_account"]).not.toBe("987654321");
    expect(String(masked["bank_account"])).toContain("*");
    expect(String(masked["holder_document"])).toContain("*");
  });

  it("F2-PAY-002 membro comum não lê a tabela de recebimento", async () => {
    const { data, error } = await memberA.db.from("payee_profiles").select("bank_account").eq("partner_id", partnerId);
    expect(error !== null || (data ?? []).length === 0).toBe(true);
  });

  it("F2-PAY-003 outra empresa não acessa dados de recebimento", async () => {
    const { data, error } = await adminB.db.from("payee_profiles").select("id").eq("partner_id", partnerId);
    expect(error !== null || (data ?? []).length === 0).toBe(true);
  });

  it("F2-PAY-004 alteração gera histórico com os campos alterados", async () => {
    await adminA.db.from("payee_profiles").update({ pix_key: "novo@iga-test.example.com" }).eq("partner_id", partnerId);
    const { data } = await a
      .from("payee_profile_events")
      .select("event, changed_fields")
      .eq("partner_id", partnerId)
      .eq("event", "updated")
      .order("created_at", { ascending: false });
    expect((data ?? []).length).toBeGreaterThan(0);
    const last = (data ?? [])[0] as { event: string; changed_fields: string[] };
    expect(last.changed_fields).toContain("pix_key");
  });

  it("F2-PAY-005 histórico de recebimento não guarda valores em claro", async () => {
    const { data } = await a.from("payee_profile_events").select("*").eq("partner_id", partnerId);
    const dump = JSON.stringify(data ?? []);
    expect(dump).not.toContain("987654321");
    expect(dump).not.toContain("novo@iga-test.example.com");
  });

  it("F2-PAY-006 registro de recebimento não pode ser excluído pelo app", async () => {
    const { error } = await adminA.db.from("payee_profiles").delete().eq("partner_id", partnerId);
    const { count } = await a
      .from("payee_profiles")
      .select("id", { count: "exact", head: true })
      .eq("partner_id", partnerId);
    expect(error !== null || count === 1).toBe(true);
  });
});

// ---------- F2-SEC: segurança transversal ----------

describe("F2-SEC — Segurança e auditoria", () => {
  it("F2-SEC-001 anônimo não lê nenhuma tabela da Fase 2", async () => {
    const client: SupabaseClient = anon();
    const tables = [
      "candidates",
      "partners",
      "territories",
      "partner_territories",
      "partner_onboarding_items",
      "partner_trainings",
      "partner_certifications",
      "payee_profiles",
    ];
    for (const t of tables) {
      const { data, error } = await client.from(t).select("id").limit(1);
      expect(error !== null || (data ?? []).length === 0).toBe(true);
    }
  });

  it("F2-SEC-002 mudança de status do parceiro é auditada", async () => {
    const { data } = await a
      .from("audit_events")
      .select("id")
      .eq("company_id", companyA)
      .eq("object_type", "partners")
      .limit(1);
    expect((data ?? []).length).toBeGreaterThan(0);
  });

  it("F2-SEC-003 parceiro não pode ser excluído pelo app", async () => {
    const { data: p } = await a.from("partners").select("id").eq("company_id", companyA).limit(1).single();
    const { error } = await adminA.db.from("partners").delete().eq("id", p!.id);
    const { count } = await a.from("partners").select("id", { count: "exact", head: true }).eq("id", p!.id);
    expect(error !== null || count === 1).toBe(true);
  });
});
