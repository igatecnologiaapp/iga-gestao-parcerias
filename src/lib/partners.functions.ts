import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

/**
 * Fase 2 — Parceiros, Territórios e Onboarding.
 * Autorização efetiva no banco (RLS + RPCs SECURITY DEFINER da Fase 1/2).
 * O front nunca decide acesso sozinho.
 */

const CANDIDATE_STATUSES = [
  "prospect", "triage", "prequalified", "interview", "approved", "formalization",
  "onboarding", "training", "certification", "activation",
  "rejected", "withdrawn", "suspended", "archived",
] as const;

const PARTNER_STATUSES = [
  "onboarding", "training", "certification_pending", "active",
  "attention", "suspended", "inactive", "exit",
] as const;

// ============ CANDIDATOS ============

export const listCandidates = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        companyId: z.string().uuid(),
        status: z.enum(CANDIDATE_STATUSES).optional(),
        search: z.string().max(120).optional(),
      })
      .parse(d),
  )
  .handler(async ({ context, data }) => {
    let q = context.supabase
      .from("candidates")
      .select("*")
      .eq("company_id", data.companyId)
      .order("created_at", { ascending: false });
    if (data.status) q = q.eq("status", data.status);
    if (data.search) q = q.ilike("full_name", `%${data.search}%`);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

export const createCandidate = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        companyId: z.string().uuid(),
        fullName: z.string().min(2).max(200),
        email: z.string().email().optional().or(z.literal("")),
        phone: z.string().max(30).optional(),
        whatsapp: z.string().max(30).optional(),
        city: z.string().max(120).optional(),
        state: z.string().max(2).optional(),
        sourceChannel: z.string().max(60).optional(),
        campaign: z.string().max(120).optional(),
        referral: z.string().max(200).optional(),
        notes: z.string().max(2000).optional(),
        unitId: z.string().uuid().nullable().optional(),
      })
      .parse(d),
  )
  .handler(async ({ context, data }) => {
    const { data: row, error } = await context.supabase
      .from("candidates")
      .insert({
        company_id: data.companyId,
        unit_id: data.unitId ?? null,
        full_name: data.fullName,
        email: data.email || null,
        phone: data.phone || null,
        whatsapp: data.whatsapp || null,
        city: data.city || null,
        state: data.state?.toUpperCase() || null,
        source_channel: data.sourceChannel || null,
        campaign: data.campaign || null,
        referral: data.referral || null,
        notes: data.notes || null,
        owner_id: context.userId,
        created_by: context.userId,
      })
      .select("id, status")
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

export const updateCandidateStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        candidateId: z.string().uuid(),
        status: z.enum(CANDIDATE_STATUSES),
        decision: z.string().max(60).optional(),
        notes: z.string().max(2000).optional(),
      })
      .parse(d),
  )
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    const { data: cand, error: readErr } = await supabase
      .from("candidates")
      .select("id, company_id, status")
      .eq("id", data.candidateId)
      .single();
    if (readErr || !cand) throw new Error("Candidato não encontrado ou acesso negado");

    if (data.decision) {
      const { error: evalErr } = await supabase.from("candidate_evaluations").insert({
        company_id: cand.company_id,
        candidate_id: cand.id,
        stage: cand.status,
        decision: data.decision,
        notes: data.notes || null,
        evaluator_id: userId,
      });
      if (evalErr) throw new Error(evalErr.message);
    }

    const { error } = await supabase
      .from("candidates")
      .update({ status: data.status })
      .eq("id", data.candidateId);
    if (error) throw new Error(error.message);
    return { ok: true, status: data.status };
  });

export const updateCandidateData = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        candidateId: z.string().uuid(),
        document: z.string().max(30).optional(),
        experience: z.string().max(2000).optional(),
        notes: z.string().max(2000).optional(),
        email: z.string().email().optional().or(z.literal("")),
        phone: z.string().max(30).optional(),
        whatsapp: z.string().max(30).optional(),
        city: z.string().max(120).optional(),
        state: z.string().max(2).optional(),
      })
      .parse(d),
  )
  .handler(async ({ context, data }) => {
    const { candidateId, ...rest } = data;
    const patch = {
      ...(rest.document !== undefined ? { document: rest.document || null } : {}),
      ...(rest.experience !== undefined ? { experience: rest.experience || null } : {}),
      ...(rest.notes !== undefined ? { notes: rest.notes || null } : {}),
      ...(rest.email !== undefined ? { email: rest.email || null } : {}),
      ...(rest.phone !== undefined ? { phone: rest.phone || null } : {}),
      ...(rest.whatsapp !== undefined ? { whatsapp: rest.whatsapp || null } : {}),
      ...(rest.city !== undefined ? { city: rest.city || null } : {}),
      ...(rest.state !== undefined ? { state: rest.state?.toUpperCase() || null } : {}),
    };
    const { error } = await context.supabase.from("candidates").update(patch).eq("id", candidateId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const getCandidateDetail = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ candidateId: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    const { supabase } = context;
    const { data: cand, error } = await supabase
      .from("candidates")
      .select("*")
      .eq("id", data.candidateId)
      .single();
    if (error || !cand) throw new Error("Candidato não encontrado ou acesso negado");
    const [{ data: events }, { data: evaluations }] = await Promise.all([
      supabase
        .from("candidate_stage_events")
        .select("*")
        .eq("candidate_id", cand.id)
        .order("created_at", { ascending: false }),
      supabase
        .from("candidate_evaluations")
        .select("*")
        .eq("candidate_id", cand.id)
        .order("evaluated_at", { ascending: false }),
    ]);
    return { candidate: cand, events: events ?? [], evaluations: evaluations ?? [] };
  });

export const convertCandidate = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        candidateId: z.string().uuid(),
        idempotencyKey: z.string().min(8).max(120),
      })
      .parse(d),
  )
  .handler(async ({ context, data }) => {
    const { data: result, error } = await context.supabase.rpc("convert_candidate_to_partner", {
      _candidate_id: data.candidateId,
      _idempotency_key: data.idempotencyKey,
    });
    if (error) throw new Error(error.message);
    return result as { status: string; partner_id?: string; code?: string };
  });

// ============ PARCEIROS ============

export const listPartners = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        companyId: z.string().uuid(),
        status: z.enum(PARTNER_STATUSES).optional(),
        search: z.string().max(120).optional(),
      })
      .parse(d),
  )
  .handler(async ({ context, data }) => {
    let q = context.supabase
      .from("partners")
      .select("*")
      .eq("company_id", data.companyId)
      .order("created_at", { ascending: false });
    if (data.status) q = q.eq("status", data.status);
    if (data.search) q = q.ilike("display_name", `%${data.search}%`);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

export const getPartnerDetail = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ partnerId: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    const { supabase } = context;
    const { data: partner, error } = await supabase
      .from("partners")
      .select("*")
      .eq("id", data.partnerId)
      .single();
    if (error || !partner) throw new Error("Parceiro não encontrado ou acesso negado");

    const [
      { data: onboarding },
      { data: trainings },
      { data: certifications },
      { data: territories },
      { data: acceptances },
      { data: followups },
      { data: candidate },
    ] = await Promise.all([
      supabase
        .from("partner_onboarding_items")
        .select("*")
        .eq("partner_id", partner.id)
        .order("created_at"),
      supabase
        .from("partner_trainings")
        .select("*, training_tracks(code, name), training_modules(code, name)")
        .eq("partner_id", partner.id)
        .order("created_at", { ascending: false }),
      supabase
        .from("partner_certifications")
        .select("*")
        .eq("partner_id", partner.id)
        .order("created_at", { ascending: false }),
      supabase
        .from("partner_territories")
        .select("*, territories(code, name, scope_type, coverage, default_mode)")
        .eq("partner_id", partner.id)
        .order("created_at", { ascending: false }),
      supabase
        .from("partner_policy_acceptances")
        .select("*, policies(code, name), policy_versions(version, effective_from)")
        .eq("partner_id", partner.id)
        .order("accepted_at", { ascending: false }),
      supabase
        .from("partner_followups")
        .select("*")
        .eq("partner_id", partner.id)
        .order("occurred_at", { ascending: false }),
      partner.candidate_id
        ? supabase.from("candidates").select("id, code, source_channel, campaign").eq("id", partner.candidate_id).maybeSingle()
        : Promise.resolve({ data: null }),
    ]);

    const { data: maskedPayee } = await supabase.rpc("get_payee_profile_masked", {
      _partner_id: partner.id,
    });

    return {
      partner,
      onboarding: onboarding ?? [],
      trainings: trainings ?? [],
      certifications: certifications ?? [],
      territories: territories ?? [],
      acceptances: acceptances ?? [],
      followups: followups ?? [],
      originCandidate: candidate ?? null,
      payeeMasked: (maskedPayee as Record<string, unknown> | null) ?? null,
    };
  });

export const updatePartnerStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        partnerId: z.string().uuid(),
        status: z.enum(PARTNER_STATUSES),
        reason: z.string().max(500).optional(),
      })
      .parse(d),
  )
  .handler(async ({ context, data }) => {
    // O motivo é registrado na trilha de auditoria pelo gatilho da tabela.
    const { error } = await context.supabase
      .from("partners")
      .update({ status: data.status })
      .eq("id", data.partnerId);
    if (error) throw new Error(error.message);
    return { ok: true, status: data.status };
  });

// ============ ONBOARDING ============

export const createOnboardingChecklist = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        companyId: z.string().uuid(),
        code: z.string().min(2).max(40),
        name: z.string().min(2).max(120),
        items: z
          .array(
            z.object({
              code: z.string().min(1).max(40),
              label: z.string().min(2).max(200),
              category: z.string().max(40).default("geral"),
              requiresEvidence: z.boolean().default(false),
              sortOrder: z.number().int().default(0),
            }),
          )
          .min(1)
          .max(50),
      })
      .parse(d),
  )
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    const { data: existing } = await supabase
      .from("onboarding_checklists")
      .select("version")
      .eq("company_id", data.companyId)
      .eq("code", data.code)
      .order("version", { ascending: false })
      .limit(1);
    const version = (existing?.[0]?.version ?? 0) + 1;

    const { data: checklist, error } = await supabase
      .from("onboarding_checklists")
      .insert({ company_id: data.companyId, code: data.code, name: data.name, version, created_by: userId })
      .select("id, version")
      .single();
    if (error) throw new Error(error.message);

    const { error: itemsErr } = await supabase.from("onboarding_checklist_items").insert(
      data.items.map((i) => ({
        company_id: data.companyId,
        checklist_id: checklist.id,
        code: i.code,
        label: i.label,
        category: i.category,
        requires_evidence: i.requiresEvidence,
        sort_order: i.sortOrder,
      })),
    );
    if (itemsErr) throw new Error(itemsErr.message);
    return { id: checklist.id, version };
  });

export const listOnboardingChecklists = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ companyId: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    const { data: rows, error } = await context.supabase
      .from("onboarding_checklists")
      .select("*, onboarding_checklist_items(id, code, label, category, requires_evidence, sort_order)")
      .eq("company_id", data.companyId)
      .order("code")
      .order("version", { ascending: false });
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

export const updateOnboardingItem = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        itemId: z.string().uuid(),
        status: z.enum(["pending", "in_progress", "done", "waived", "blocked"]),
        notes: z.string().max(1000).optional(),
      })
      .parse(d),
  )
  .handler(async ({ context, data }) => {
    const { error } = await context.supabase
      .from("partner_onboarding_items")
      .update({
        status: data.status,
        notes: data.notes ?? undefined,
        responsible_id: context.userId,
        completed_at: data.status === "done" ? new Date().toISOString() : null,
      })
      .eq("id", data.itemId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ============ ACEITES DE POLÍTICA ============

export const acceptPolicy = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        partnerId: z.string().uuid(),
        policyVersionId: z.string().uuid(),
        idempotencyKey: z.string().min(8).max(120),
      })
      .parse(d),
  )
  .handler(async ({ context, data }) => {
    const { data: result, error } = await context.supabase.rpc("accept_policy_version", {
      _partner_id: data.partnerId,
      _policy_version_id: data.policyVersionId,
      _context: { channel: "web" } as never,
      _idempotency_key: data.idempotencyKey,
    });
    if (error) throw new Error(error.message);
    return result as { status: string; acceptance_id?: string };
  });

// ============ TREINAMENTO ============

export const createTrainingTrack = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        companyId: z.string().uuid(),
        code: z.string().min(2).max(40),
        name: z.string().min(2).max(120),
        description: z.string().max(1000).optional(),
        isRequired: z.boolean().default(true),
        validityMonths: z.number().int().min(1).max(120).nullable().optional(),
      })
      .parse(d),
  )
  .handler(async ({ context, data }) => {
    const { data: row, error } = await context.supabase
      .from("training_tracks")
      .insert({
        company_id: data.companyId,
        code: data.code,
        name: data.name,
        description: data.description || null,
        is_required: data.isRequired,
        validity_months: data.validityMonths ?? null,
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

export const listTrainingTracks = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ companyId: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    const { data: rows, error } = await context.supabase
      .from("training_tracks")
      .select("*, training_modules(id, code, name, sort_order)")
      .eq("company_id", data.companyId)
      .order("code");
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

export const updatePartnerTraining = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        companyId: z.string().uuid(),
        partnerId: z.string().uuid(),
        trackId: z.string().uuid(),
        status: z.enum(["not_started", "in_progress", "completed", "failed", "expired"]),
        result: z.string().max(60).optional(),
        score: z.number().min(0).max(100).nullable().optional(),
        notes: z.string().max(1000).optional(),
      })
      .parse(d),
  )
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    const { data: existing } = await supabase
      .from("partner_trainings")
      .select("id")
      .eq("partner_id", data.partnerId)
      .eq("track_id", data.trackId)
      .is("module_id", null)
      .maybeSingle();

    const payload: Record<string, unknown> = {
      status: data.status,
      result: data.result || null,
      score: data.score ?? null,
      notes: data.notes || null,
      responsible_id: userId,
    };
    if (data.status === "in_progress") payload.started_at = new Date().toISOString();
    if (data.status === "completed") payload.completed_at = new Date().toISOString();

    if (existing) {
      const { error } = await supabase.from("partner_trainings").update(payload).eq("id", existing.id);
      if (error) throw new Error(error.message);
      return { id: existing.id };
    }
    const { data: row, error } = await supabase
      .from("partner_trainings")
      .insert({
        company_id: data.companyId,
        partner_id: data.partnerId,
        track_id: data.trackId,
        ...payload,
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

// ============ CERTIFICAÇÕES ============

export const upsertCertification = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        companyId: z.string().uuid(),
        partnerId: z.string().uuid(),
        certificationId: z.string().uuid().optional(),
        type: z.string().min(2).max(60),
        competency: z.string().min(2).max(120),
        status: z.enum(["pending", "approved", "failed", "expired", "revoked"]),
        result: z.string().max(60).optional(),
        validUntil: z.string().nullable().optional(),
        notes: z.string().max(1000).optional(),
      })
      .parse(d),
  )
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    const payload: Record<string, unknown> = {
      type: data.type,
      competency: data.competency,
      status: data.status,
      result: data.result || null,
      valid_until: data.validUntil || null,
      notes: data.notes || null,
      responsible_id: userId,
    };
    if (data.status === "approved") payload.issued_at = new Date().toISOString();

    if (data.certificationId) {
      const { error } = await supabase
        .from("partner_certifications")
        .update(payload)
        .eq("id", data.certificationId);
      if (error) throw new Error(error.message);
      return { id: data.certificationId };
    }
    const { data: row, error } = await supabase
      .from("partner_certifications")
      .insert({ company_id: data.companyId, partner_id: data.partnerId, ...payload })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

// ============ PRIMEIROS 90 DIAS ============

export const addPartnerFollowup = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        companyId: z.string().uuid(),
        partnerId: z.string().uuid(),
        milestone: z.string().min(2).max(80),
        dayOffset: z.number().int().min(0).max(90).optional(),
        pendingTrainings: z.string().max(500).optional(),
        difficulties: z.string().max(1000).optional(),
        supportNeeded: z.string().max(1000).optional(),
        activities: z.string().max(1000).optional(),
        evolution: z.string().max(1000).optional(),
      })
      .parse(d),
  )
  .handler(async ({ context, data }) => {
    const { data: row, error } = await context.supabase
      .from("partner_followups")
      .insert({
        company_id: data.companyId,
        partner_id: data.partnerId,
        milestone: data.milestone,
        day_offset: data.dayOffset ?? null,
        pending_trainings: data.pendingTrainings || null,
        difficulties: data.difficulties || null,
        support_needed: data.supportNeeded || null,
        activities: data.activities || null,
        evolution: data.evolution || null,
        responsible_id: context.userId,
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

// ============ TERRITÓRIOS ============

export const listTerritories = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ companyId: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    const { data: rows, error } = await context.supabase
      .from("territories")
      .select("*, partner_territories(id, partner_id, mode, status, valid_from, valid_until, partners(display_name, code))")
      .eq("company_id", data.companyId)
      .order("code");
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

export const createTerritory = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        companyId: z.string().uuid(),
        code: z.string().min(2).max(40),
        name: z.string().min(2).max(120),
        scopeType: z.enum(["country", "state", "city", "region", "custom"]),
        coverage: z.record(z.string(), z.unknown()).default({}),
        defaultMode: z.enum(["open", "recommended_base", "preferred"]).default("open"),
        notes: z.string().max(1000).optional(),
      })
      .parse(d),
  )
  .handler(async ({ context, data }) => {
    const { data: row, error } = await context.supabase
      .from("territories")
      .insert({
        company_id: data.companyId,
        code: data.code,
        name: data.name,
        scope_type: data.scopeType,
        coverage: data.coverage as never,
        default_mode: data.defaultMode,
        notes: data.notes || null,
        owner_id: context.userId,
        created_by: context.userId,
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

export const assignTerritory = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        partnerId: z.string().uuid(),
        territoryId: z.string().uuid(),
        mode: z.enum(["open", "recommended_base", "preferred", "protected"]),
        validUntil: z.string().nullable().optional(),
        reason: z.string().max(500).optional(),
        idempotencyKey: z.string().min(8).max(120),
      })
      .parse(d),
  )
  .handler(async ({ context, data }) => {
    const { data: result, error } = await context.supabase.rpc("assign_partner_territory", {
      _partner_id: data.partnerId,
      _territory_id: data.territoryId,
      _mode: data.mode,
      _valid_until: data.validUntil ?? null,
      _reason: data.reason ?? null,
      _idempotency_key: data.idempotencyKey,
    });
    if (error) throw new Error(error.message);
    return result as { status: string; partner_territory_id?: string };
  });

export const revokePartnerTerritory = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        partnerTerritoryId: z.string().uuid(),
        reason: z.string().min(2).max(500),
      })
      .parse(d),
  )
  .handler(async ({ context, data }) => {
    const { error } = await context.supabase
      .from("partner_territories")
      .update({
        status: "revoked",
        valid_until: new Date().toISOString(),
        reason: data.reason,
      })
      .eq("id", data.partnerTerritoryId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ============ PAYEE PROFILE ============

export const upsertPayeeProfile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        companyId: z.string().uuid(),
        partnerId: z.string().uuid(),
        holderName: z.string().min(2).max(200),
        holderDocument: z.string().min(5).max(20),
        payeeType: z.enum(["pix", "bank_account"]).default("pix"),
        bankCode: z.string().max(10).optional(),
        bankBranch: z.string().max(10).optional(),
        bankAccount: z.string().max(30).optional(),
        pixKey: z.string().max(140).optional(),
        ownershipValidated: z.boolean().default(false),
        status: z.enum(["active", "inactive"]).default("inactive"),
      })
      .parse(d),
  )
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    const payload: Record<string, unknown> = {
      holder_name: data.holderName,
      holder_document: data.holderDocument,
      payee_type: data.payeeType,
      bank_code: data.bankCode || null,
      bank_branch: data.bankBranch || null,
      bank_account: data.bankAccount || null,
      pix_key: data.pixKey || null,
      status: data.status,
    };
    if (data.ownershipValidated) {
      payload.ownership_validated = true;
      payload.validated_by = userId;
      payload.validated_at = new Date().toISOString();
    }

    const { data: existing } = await supabase
      .from("payee_profiles")
      .select("id")
      .eq("partner_id", data.partnerId)
      .maybeSingle();

    if (existing) {
      const { error } = await supabase.from("payee_profiles").update(payload).eq("id", existing.id);
      if (error) throw new Error(error.message);
      return { id: existing.id };
    }
    const { data: row, error } = await supabase
      .from("payee_profiles")
      .insert({ company_id: data.companyId, partner_id: data.partnerId, created_by: userId, ...payload })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

export const getMaskedPayee = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ partnerId: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    const { data: masked, error } = await context.supabase.rpc("get_payee_profile_masked", {
      _partner_id: data.partnerId,
    });
    if (error) throw new Error(error.message);
    return (masked as Record<string, unknown> | null) ?? null;
  });

// ============ PAINEL DO PRÓPRIO PARCEIRO ============

export const getMyPartnerPanel = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data: partner } = await supabase
      .from("partners")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();
    if (!partner) return { partner: null };

    const [
      { data: onboarding },
      { data: trainings },
      { data: certifications },
      { data: territories },
      { data: acceptances },
      { data: followups },
    ] = await Promise.all([
      supabase.from("partner_onboarding_items").select("*").eq("partner_id", partner.id).order("created_at"),
      supabase
        .from("partner_trainings")
        .select("id, status, result, score, completed_at, valid_until, training_tracks(code, name)")
        .eq("partner_id", partner.id),
      supabase
        .from("partner_certifications")
        .select("id, type, competency, status, result, issued_at, valid_until")
        .eq("partner_id", partner.id),
      supabase
        .from("partner_territories")
        .select("id, mode, status, valid_from, valid_until, territories(code, name, scope_type)")
        .eq("partner_id", partner.id),
      supabase
        .from("partner_policy_acceptances")
        .select("id, accepted_at, policies(code, name), policy_versions(version)")
        .eq("partner_id", partner.id),
      supabase
        .from("partner_followups")
        .select("id, milestone, day_offset, evolution, occurred_at")
        .eq("partner_id", partner.id)
        .order("occurred_at", { ascending: false })
        .limit(10),
    ]);

    const { data: maskedPayee } = await supabase.rpc("get_payee_profile_masked", {
      _partner_id: partner.id,
    });

    return {
      partner,
      onboarding: onboarding ?? [],
      trainings: trainings ?? [],
      certifications: certifications ?? [],
      territories: territories ?? [],
      acceptances: acceptances ?? [],
      followups: followups ?? [],
      payeeMasked: (maskedPayee as Record<string, unknown> | null) ?? null,
    };
  });
