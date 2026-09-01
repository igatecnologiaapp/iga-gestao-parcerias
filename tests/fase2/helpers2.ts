/**
 * Fase 2 (PA-F2) — utilitários adicionais da suíte de testes.
 * Reaproveita integralmente os utilitários da Fase 1.
 */
import type { SupabaseClient } from "@supabase/supabase-js";

export { admin, anon, userClient, createUser, createCompany, addMembership, grantRole, roleId, runId, PASSWORD } from "../fase1/helpers";
export type { TestUser } from "../fase1/helpers";

export async function seedChecklist(a: SupabaseClient, companyId: string, code = "onb_padrao") {
  const { data: cl, error } = await a
    .from("onboarding_checklists")
    .insert({ company_id: companyId, code, name: "Onboarding padrão", version: 1, is_active: true })
    .select("id")
    .single();
  if (error) throw new Error(`seedChecklist: ${error.message}`);
  const items = [
    { code: "doc", label: "Documentação", category: "documentos", requires_evidence: true, sort_order: 1 },
    { code: "contrato", label: "Contrato assinado", category: "juridico", requires_evidence: true, sort_order: 2 },
    { code: "acesso", label: "Acessos concedidos", category: "operacional", requires_evidence: false, sort_order: 3 },
  ];
  const { error: e2 } = await a
    .from("onboarding_checklist_items")
    .insert(items.map((i) => ({ company_id: companyId, checklist_id: cl.id, ...i })));
  if (e2) throw new Error(`seedChecklistItems: ${e2.message}`);
  return cl.id as string;
}

export async function seedTerritory(
  a: SupabaseClient,
  companyId: string,
  code: string,
  defaultMode: "open" | "recommended_base" | "preferred" = "open",
) {
  const { data, error } = await a
    .from("territories")
    .insert({
      company_id: companyId,
      code,
      name: `Território ${code}`,
      scope_type: "city",
      coverage: { areas: ["São Paulo/SP"] },
      default_mode: defaultMode,
    })
    .select("id")
    .single();
  if (error) throw new Error(`seedTerritory: ${error.message}`);
  return data.id as string;
}

export async function seedCandidate(a: SupabaseClient, companyId: string, name: string) {
  const { data, error } = await a
    .from("candidates")
    .insert({
      company_id: companyId,
      full_name: name,
      source_channel: "indicacao",
      campaign: "expansao-2026",
      email: `${name.toLowerCase().replace(/\s+/g, ".")}@iga-test.example.com`,
    })
    .select("id")
    .single();
  if (error) throw new Error(`seedCandidate: ${error.message}`);
  return data.id as string;
}

/** Avança o candidato até `approved` usando o caminho legítimo do funil. */
export async function advanceToApproved(a: SupabaseClient, candidateId: string) {
  for (const s of ["triage", "prequalified", "interview", "approved"]) {
    const { error } = await a.from("candidates").update({ status: s }).eq("id", candidateId);
    if (error) throw new Error(`advance ${s}: ${error.message}`);
  }
}

export async function cleanupFase2(a: SupabaseClient, companyIds: string[]) {
  for (const c of companyIds) {
    await a.from("payee_profile_events").delete().eq("company_id", c);
    await a.from("payee_profiles").delete().eq("company_id", c);
    await a.from("partner_followups").delete().eq("company_id", c);
    await a.from("partner_certifications").delete().eq("company_id", c);
    await a.from("partner_trainings").delete().eq("company_id", c);
    await a.from("training_modules").delete().eq("company_id", c);
    await a.from("training_tracks").delete().eq("company_id", c);
    await a.from("partner_policy_acceptances").delete().eq("company_id", c);
    await a.from("partner_onboarding_items").delete().eq("company_id", c);
    await a.from("partner_territories").delete().eq("company_id", c);
    await a.from("territories").delete().eq("company_id", c);
    await a.from("onboarding_checklist_items").delete().eq("company_id", c);
    await a.from("onboarding_checklists").delete().eq("company_id", c);
    await a.from("partners").delete().eq("company_id", c);
    await a.from("candidate_evaluations").delete().eq("company_id", c);
    await a.from("candidate_stage_events").delete().eq("company_id", c);
    await a.from("candidates").delete().eq("company_id", c);
  }
}
