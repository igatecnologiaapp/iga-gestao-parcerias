import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

/**
 * Fase 3 — CRM, Leads, Produtos e Política Comercial.
 * Reaproveita integralmente a Fundação das Fases 1 e 2:
 * autenticação, RBAC/RLS, auditoria, idempotência, anexos, notificações e aprovação.
 * Nenhuma decisão de acesso é tomada no front — o banco decide.
 */

const LEAD_STATUSES = ["new", "contacted", "qualified", "disqualified", "converted", "archived"] as const;
const OPP_STAGES = [
  "new", "qualified", "contact", "diagnosis", "demo", "proposal", "negotiation", "won", "lost",
] as const;
const ACTIVITY_TYPES = ["call", "whatsapp", "email", "meeting", "visit", "demo", "note"] as const;
const LOSS_REASONS = [
  "price", "timing", "competitor", "no_fit", "no_budget", "no_response", "internal", "other",
] as const;
const BILLING_PERIODS = ["one_time", "monthly", "quarterly", "semiannual", "annual"] as const;

type RpcResult = {
  status: string;
  lead_id?: string | null;
  opportunity_id?: string | null;
  proposal_id?: string | null;
  protection_id?: string | null;
  conflict_id?: string | null;
  approval_request_id?: string | null;
  code?: string | null;
  version?: number | null;
  duplicates?: DuplicateMatch[];
  requires_approval?: boolean;
  total_setup_amount?: number;
  total_monthly_amount?: number;
};

type DuplicateMatch = {
  lead_id: string;
  company_name: string;
  city?: string | null;
  status?: string;
  matched_on: string[];
  score: number;
};

// ============ CATÁLOGO: PRODUTOS ============

export const listProducts = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ companyId: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    const { data: rows, error } = await context.supabase
      .from("products")
      .select("*, plans(*)")
      .eq("company_id", data.companyId)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

export const createProduct = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        companyId: z.string().uuid(),
        code: z.string().min(2).max(40),
        name: z.string().min(2).max(160),
        description: z.string().max(2000).optional(),
        category: z.string().max(60).optional(),
      })
      .parse(d),
  )
  .handler(async ({ context, data }) => {
    const { data: row, error } = await context.supabase
      .from("products")
      .insert({
        company_id: data.companyId,
        code: data.code.trim(),
        name: data.name,
        description: data.description || null,
        category: data.category || null,
        created_by: context.userId,
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

export const createPlan = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        companyId: z.string().uuid(),
        productId: z.string().uuid(),
        code: z.string().min(2).max(40),
        name: z.string().min(2).max(160),
        description: z.string().max(2000).optional(),
      })
      .parse(d),
  )
  .handler(async ({ context, data }) => {
    const { data: row, error } = await context.supabase
      .from("plans")
      .insert({
        company_id: data.companyId,
        product_id: data.productId,
        code: data.code.trim(),
        name: data.name,
        description: data.description || null,
        created_by: context.userId,
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

// ============ POLÍTICA DE PREÇOS ============

export const listPricePolicies = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ companyId: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    const { data: rows, error } = await context.supabase
      .from("price_policies")
      .select("*, products(code, name), plans(code, name)")
      .eq("company_id", data.companyId)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

export const createPricePolicy = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        companyId: z.string().uuid(),
        productId: z.string().uuid(),
        planId: z.string().uuid(),
        name: z.string().min(2).max(160),
        setupPrice: z.number().min(0),
        monthlyPrice: z.number().min(0),
        billingPeriod: z.enum(BILLING_PERIODS).default("monthly"),
        maxDiscountPercent: z.number().min(0).max(100).default(0),
        approvalThresholdPercent: z.number().min(0).max(100).default(0),
        effectiveFrom: z.string().optional(),
        effectiveTo: z.string().nullable().optional(),
      })
      .parse(d),
  )
  .handler(async ({ context, data }) => {
    // nova versão por plano; versões anteriores permanecem intactas (propostas históricas preservadas)
    const { data: last } = await context.supabase
      .from("price_policies")
      .select("version")
      .eq("plan_id", data.planId)
      .order("version", { ascending: false })
      .limit(1)
      .maybeSingle();
    const version = (last?.version ?? 0) + 1;

    if (last) {
      await context.supabase
        .from("price_policies")
        .update({ effective_to: data.effectiveFrom ?? new Date().toISOString(), status: "inactive" })
        .eq("plan_id", data.planId)
        .is("effective_to", null);
    }

    const { data: row, error } = await context.supabase
      .from("price_policies")
      .insert({
        company_id: data.companyId,
        product_id: data.productId,
        plan_id: data.planId,
        version,
        name: data.name,
        setup_price: data.setupPrice,
        monthly_price: data.monthlyPrice,
        billing_period: data.billingPeriod,
        max_discount_percent: data.maxDiscountPercent,
        approval_threshold_percent: data.approvalThresholdPercent,
        effective_from: data.effectiveFrom ?? new Date().toISOString(),
        effective_to: data.effectiveTo ?? null,
        created_by: context.userId,
      })
      .select("id, version")
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

// ============ LEADS ============

export const listLeads = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        companyId: z.string().uuid(),
        status: z.enum(LEAD_STATUSES).optional(),
        search: z.string().max(120).optional(),
        partnerId: z.string().uuid().optional(),
        state: z.string().max(2).optional(),
        segment: z.string().max(80).optional(),
      })
      .parse(d),
  )
  .handler(async ({ context, data }) => {
    let q = context.supabase
      .from("leads")
      .select("*, partners(display_name, code), territories(code, name)")
      .eq("company_id", data.companyId)
      .order("created_at", { ascending: false })
      .limit(200);
    if (data.status) q = q.eq("status", data.status);
    if (data.partnerId) q = q.eq("partner_id", data.partnerId);
    if (data.state) q = q.eq("state", data.state.toUpperCase());
    if (data.segment) q = q.eq("segment", data.segment);
    if (data.search) q = q.ilike("company_name", `%${data.search}%`);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

export const findDuplicates = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        companyId: z.string().uuid(),
        document: z.string().max(30).optional(),
        email: z.string().max(160).optional(),
        phone: z.string().max(30).optional(),
        companyName: z.string().max(200).optional(),
        city: z.string().max(120).optional(),
      })
      .parse(d),
  )
  .handler(async ({ context, data }) => {
    const { data: res, error } = await context.supabase.rpc("find_lead_duplicates", {
      _company_id: data.companyId,
      ...(data.document ? { _document: data.document } : {}),
      ...(data.email ? { _email: data.email } : {}),
      ...(data.phone ? { _phone: data.phone } : {}),
      ...(data.companyName ? { _company_name: data.companyName } : {}),
      ...(data.city ? { _city: data.city } : {}),
    });
    if (error) throw new Error(error.message);
    return (res ?? []) as DuplicateMatch[];
  });

export const createLead = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        companyId: z.string().uuid(),
        idempotencyKey: z.string().min(8).max(120),
        payload: z.object({
          company_name: z.string().min(2).max(200),
          trade_name: z.string().max(200).optional(),
          segment: z.string().max(80).optional(),
          document: z.string().max(30).optional(),
          contact_name: z.string().max(160).optional(),
          phone: z.string().max(30).optional(),
          whatsapp: z.string().max(30).optional(),
          email: z.string().max(160).optional(),
          address: z.string().max(240).optional(),
          district: z.string().max(120).optional(),
          city: z.string().max(120).optional(),
          state: z.string().max(2).optional(),
          postal_code: z.string().max(20).optional(),
          source: z.string().max(60).optional(),
          channel: z.string().max(60).optional(),
          campaign: z.string().max(120).optional(),
          referral_code: z.string().max(80).optional(),
          partner_id: z.string().uuid().optional(),
          territory_id: z.string().uuid().optional(),
          notes: z.string().max(2000).optional(),
        }),
      })
      .parse(d),
  )
  .handler(async ({ context, data }) => {
    const { data: res, error } = await context.supabase.rpc("create_lead", {
      _company_id: data.companyId,
      _payload: data.payload as never,
      _idempotency_key: data.idempotencyKey,
    });
    if (error) throw new Error(error.message);
    return res as unknown as RpcResult;
  });

export const updateLeadStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z.object({ leadId: z.string().uuid(), status: z.enum(LEAD_STATUSES) }).parse(d),
  )
  .handler(async ({ context, data }) => {
    const { error } = await context.supabase
      .from("leads")
      .update({ status: data.status })
      .eq("id", data.leadId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const assignLead = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        leadId: z.string().uuid(),
        partnerId: z.string().uuid().nullable().optional(),
        ownerId: z.string().uuid().nullable().optional(),
        reason: z.string().max(500).optional(),
      })
      .parse(d),
  )
  .handler(async ({ context, data }) => {
    const { data: res, error } = await context.supabase.rpc("assign_lead", {
      _lead_id: data.leadId,
      _partner_id: (data.partnerId ?? null) as never,
      _owner_id: (data.ownerId ?? null) as never,
      _reason: (data.reason ?? null) as never,
    });
    if (error) throw new Error(error.message);
    return res as unknown as RpcResult;
  });

export const getLeadDetail = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ leadId: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    const supabase = context.supabase;
    const { data: lead, error } = await supabase
      .from("leads")
      .select("*, partners(display_name, code), territories(code, name)")
      .eq("id", data.leadId)
      .single();
    if (error) throw new Error(error.message);

    const [{ data: protections }, { data: duplicates }, { data: conflicts }, { data: activities }, { data: opportunity }] =
      await Promise.all([
        supabase
          .from("lead_protections")
          .select("*, partners(display_name, code)")
          .eq("lead_id", data.leadId)
          .order("created_at", { ascending: false }),
        supabase.from("lead_duplicate_flags").select("*").eq("lead_id", data.leadId),
        supabase.from("lead_conflicts").select("*").eq("lead_id", data.leadId),
        supabase
          .from("commercial_activities")
          .select("*")
          .eq("lead_id", data.leadId)
          .order("occurred_at", { ascending: false })
          .limit(50),
        supabase.from("opportunities").select("*").eq("lead_id", data.leadId).maybeSingle(),
      ]);

    return {
      lead,
      protections: protections ?? [],
      duplicates: duplicates ?? [],
      conflicts: conflicts ?? [],
      activities: activities ?? [],
      opportunity: opportunity ?? null,
    };
  });

export const resolveDuplicateFlag = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        flagId: z.string().uuid(),
        status: z.enum(["duplicate_confirmed", "distinct_confirmed"]),
        notes: z.string().max(1000).optional(),
      })
      .parse(d),
  )
  .handler(async ({ context, data }) => {
    const { error } = await context.supabase
      .from("lead_duplicate_flags")
      .update({
        status: data.status,
        resolution_notes: data.notes || null,
        resolved_by: context.userId,
        resolved_at: new Date().toISOString(),
      })
      .eq("id", data.flagId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ============ PROTEÇÃO COMERCIAL ============

export const protectLead = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        leadId: z.string().uuid(),
        partnerId: z.string().uuid(),
        validUntil: z.string(),
        reason: z.string().max(500).optional(),
        origin: z.string().max(60).optional(),
        idempotencyKey: z.string().min(8).max(120),
      })
      .parse(d),
  )
  .handler(async ({ context, data }) => {
    const { data: res, error } = await context.supabase.rpc("protect_lead", {
      _lead_id: data.leadId,
      _partner_id: data.partnerId,
      _valid_until: data.validUntil,
      _reason: (data.reason ?? null) as never,
      _origin: data.origin ?? "manual",
      _idempotency_key: data.idempotencyKey,
    });
    if (error) throw new Error(error.message);
    return res as unknown as RpcResult;
  });

export const releaseProtection = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z.object({ protectionId: z.string().uuid(), reason: z.string().max(500).optional() }).parse(d),
  )
  .handler(async ({ context, data }) => {
    const { data: res, error } = await context.supabase.rpc("release_lead_protection", {
      _protection_id: data.protectionId,
      _reason: (data.reason ?? null) as never,
    });
    if (error) throw new Error(error.message);
    return res as unknown as RpcResult;
  });

export const transferProtection = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        protectionId: z.string().uuid(),
        toPartnerId: z.string().uuid(),
        reason: z.string().min(3).max(500),
        idempotencyKey: z.string().min(8).max(120),
      })
      .parse(d),
  )
  .handler(async ({ context, data }) => {
    const { data: res, error } = await context.supabase.rpc("transfer_lead_protection", {
      _protection_id: data.protectionId,
      _to_partner_id: data.toPartnerId,
      _reason: data.reason,
      _idempotency_key: data.idempotencyKey,
    });
    if (error) throw new Error(error.message);
    return res as unknown as RpcResult;
  });

export const expireProtections = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ companyId: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    const { data: res, error } = await context.supabase.rpc("expire_lead_protections", {
      _company_id: data.companyId,
    });
    if (error) throw new Error(error.message);
    return { expired: (res as number | null) ?? 0 };
  });

// ============ CONFLITOS ============

export const listConflicts = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ companyId: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    const { data: rows, error } = await context.supabase
      .from("lead_conflicts")
      .select("*, leads(company_name, code)")
      .eq("company_id", data.companyId)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

export const openConflict = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        leadId: z.string().uuid(),
        claimantPartnerId: z.string().uuid(),
        evidence: z.record(z.string(), z.unknown()).optional(),
        idempotencyKey: z.string().min(8).max(120),
      })
      .parse(d),
  )
  .handler(async ({ context, data }) => {
    const { data: res, error } = await context.supabase.rpc("open_lead_conflict", {
      _lead_id: data.leadId,
      _claimant_partner_id: data.claimantPartnerId,
      _evidence: (data.evidence ?? {}) as never,
      _idempotency_key: data.idempotencyKey,
    });
    if (error) throw new Error(error.message);
    return res as unknown as RpcResult;
  });

export const resolveConflict = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        conflictId: z.string().uuid(),
        awardedPartnerId: z.string().uuid(),
        resolution: z.string().min(3).max(1000),
      })
      .parse(d),
  )
  .handler(async ({ context, data }) => {
    const { data: res, error } = await context.supabase.rpc("resolve_lead_conflict", {
      _conflict_id: data.conflictId,
      _awarded_partner_id: data.awardedPartnerId,
      _resolution: data.resolution,
    });
    if (error) throw new Error(error.message);
    return res as unknown as RpcResult;
  });

// ============ OPORTUNIDADES ============

export const listOpportunities = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        companyId: z.string().uuid(),
        stage: z.enum(OPP_STAGES).optional(),
        search: z.string().max(120).optional(),
      })
      .parse(d),
  )
  .handler(async ({ context, data }) => {
    let q = context.supabase
      .from("opportunities")
      .select("*, leads(company_name, city, state), partners(display_name, code)")
      .eq("company_id", data.companyId)
      .order("created_at", { ascending: false })
      .limit(200);
    if (data.stage) q = q.eq("stage", data.stage);
    if (data.search) q = q.ilike("name", `%${data.search}%`);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

export const convertLead = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        leadId: z.string().uuid(),
        idempotencyKey: z.string().min(8).max(120),
        name: z.string().max(200).optional(),
      })
      .parse(d),
  )
  .handler(async ({ context, data }) => {
    const { data: res, error } = await context.supabase.rpc("convert_lead_to_opportunity", {
      _lead_id: data.leadId,
      _idempotency_key: data.idempotencyKey,
      _name: (data.name ?? null) as never,
    });
    if (error) throw new Error(error.message);
    return res as unknown as RpcResult;
  });

export const getOpportunityDetail = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ opportunityId: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    const supabase = context.supabase;
    const { data: opportunity, error } = await supabase
      .from("opportunities")
      .select("*, leads(*), partners(display_name, code)")
      .eq("id", data.opportunityId)
      .single();
    if (error) throw new Error(error.message);

    const [{ data: stages }, { data: activities }, { data: proposals }] = await Promise.all([
      supabase
        .from("opportunity_stage_events")
        .select("*")
        .eq("opportunity_id", data.opportunityId)
        .order("created_at", { ascending: false }),
      supabase
        .from("commercial_activities")
        .select("*")
        .eq("opportunity_id", data.opportunityId)
        .order("occurred_at", { ascending: false })
        .limit(50),
      supabase
        .from("commercial_proposals")
        .select("*, proposal_items(*, products(code, name), plans(code, name))")
        .eq("opportunity_id", data.opportunityId)
        .order("version", { ascending: false }),
    ]);

    return {
      opportunity,
      stages: stages ?? [],
      activities: activities ?? [],
      proposals: proposals ?? [],
    };
  });

export const advanceStage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        opportunityId: z.string().uuid(),
        stage: z.enum(OPP_STAGES),
        reason: z.string().max(500).optional(),
      })
      .parse(d),
  )
  .handler(async ({ context, data }) => {
    const { data: res, error } = await context.supabase.rpc("advance_opportunity_stage", {
      _opportunity_id: data.opportunityId,
      _stage: data.stage,
      _reason: (data.reason ?? null) as never,
    });
    if (error) throw new Error(error.message);
    return res as unknown as RpcResult;
  });

export const closeWon = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        opportunityId: z.string().uuid(),
        proposalId: z.string().uuid(),
        idempotencyKey: z.string().min(8).max(120),
      })
      .parse(d),
  )
  .handler(async ({ context, data }) => {
    const { data: res, error } = await context.supabase.rpc("close_opportunity_won", {
      _opportunity_id: data.opportunityId,
      _proposal_id: data.proposalId,
      _idempotency_key: data.idempotencyKey,
    });
    if (error) throw new Error(error.message);
    return res as unknown as RpcResult;
  });

export const closeLost = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        opportunityId: z.string().uuid(),
        reason: z.enum(LOSS_REASONS),
        competitor: z.string().max(160).optional(),
        notes: z.string().max(1000).optional(),
      })
      .parse(d),
  )
  .handler(async ({ context, data }) => {
    const { data: res, error } = await context.supabase.rpc("close_opportunity_lost", {
      _opportunity_id: data.opportunityId,
      _reason: data.reason,
      _competitor: (data.competitor ?? null) as never,
      _notes: (data.notes ?? null) as never,
    });
    if (error) throw new Error(error.message);
    return res as unknown as RpcResult;
  });

// ============ ATIVIDADES ============

export const addActivity = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        companyId: z.string().uuid(),
        leadId: z.string().uuid().nullable().optional(),
        opportunityId: z.string().uuid().nullable().optional(),
        partnerId: z.string().uuid().nullable().optional(),
        type: z.enum(ACTIVITY_TYPES),
        subject: z.string().max(200).optional(),
        outcome: z.string().max(200).optional(),
        notes: z.string().max(2000).optional(),
        nextAction: z.string().max(200).optional(),
        nextActionAt: z.string().nullable().optional(),
      })
      .parse(d),
  )
  .handler(async ({ context, data }) => {
    const { data: row, error } = await context.supabase
      .from("commercial_activities")
      .insert({
        company_id: data.companyId,
        lead_id: data.leadId ?? null,
        opportunity_id: data.opportunityId ?? null,
        partner_id: data.partnerId ?? null,
        type: data.type,
        subject: data.subject || null,
        outcome: data.outcome || null,
        notes: data.notes || null,
        next_action: data.nextAction || null,
        next_action_at: data.nextActionAt || null,
        actor_id: context.userId,
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

// ============ PROPOSTAS ============

export const issueProposal = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        opportunityId: z.string().uuid(),
        idempotencyKey: z.string().min(8).max(120),
        validUntil: z.string().nullable().optional(),
        conditions: z.string().max(2000).optional(),
        items: z
          .array(
            z.object({
              price_policy_id: z.string().uuid(),
              quantity: z.number().int().min(1).default(1),
              discount_percent: z.number().min(0).max(100).default(0),
            }),
          )
          .min(1),
      })
      .parse(d),
  )
  .handler(async ({ context, data }) => {
    const { data: res, error } = await context.supabase.rpc("issue_proposal", {
      _opportunity_id: data.opportunityId,
      _items: data.items as never,
      _idempotency_key: data.idempotencyKey,
      _valid_until: (data.validUntil ?? null) as never,
      _conditions: (data.conditions ?? null) as never,
    });
    if (error) throw new Error(error.message);
    return res as unknown as RpcResult;
  });

export const decideDiscount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        proposalId: z.string().uuid(),
        approve: z.boolean(),
        reason: z.string().min(3).max(1000),
      })
      .parse(d),
  )
  .handler(async ({ context, data }) => {
    const { data: res, error } = await context.supabase.rpc("decide_proposal_discount", {
      _proposal_id: data.proposalId,
      _approve: data.approve,
      _reason: data.reason,
    });
    if (error) throw new Error(error.message);
    return res as unknown as RpcResult;
  });

export const listProposals = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ companyId: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    const { data: rows, error } = await context.supabase
      .from("commercial_proposals")
      .select("*, opportunities(name, code), leads(company_name)")
      .eq("company_id", data.companyId)
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

// ============ LINK / QR DO PARCEIRO ============

export const listReferralLinks = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ companyId: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    const { data: rows, error } = await context.supabase
      .from("partner_referral_links")
      .select("*, partners(display_name, code)")
      .eq("company_id", data.companyId)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

export const createReferralLink = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        companyId: z.string().uuid(),
        partnerId: z.string().uuid(),
        label: z.string().max(120).optional(),
        channel: z.string().max(60).optional(),
        campaign: z.string().max(120).optional(),
      })
      .parse(d),
  )
  .handler(async ({ context, data }) => {
    // token público opaco: não carrega informação sensível
    const token = `p_${crypto.randomUUID().replace(/-/g, "").slice(0, 20)}`;
    const { data: row, error } = await context.supabase
      .from("partner_referral_links")
      .insert({
        company_id: data.companyId,
        partner_id: data.partnerId,
        public_token: token,
        label: data.label || null,
        channel: data.channel || null,
        campaign: data.campaign || null,
        created_by: context.userId,
      })
      .select("id, public_token")
      .single();
    if (error) throw new Error(error.message);
    return row;
  });
