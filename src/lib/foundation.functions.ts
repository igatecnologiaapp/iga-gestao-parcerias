import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

/**
 * Fase 1 — Fundação, Segurança e Governança.
 * Toda função aqui é autenticada. A autorização efetiva é aplicada no banco
 * (RLS + funções SECURITY DEFINER). O front nunca decide acesso sozinho.
 */

export const getMyContext = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;

    const [{ data: profile }, { data: memberships }, { data: assignments }, { data: rolePerms }] =
      await Promise.all([
        supabase.from("profiles").select("*").eq("id", userId).maybeSingle(),
        supabase
          .from("memberships")
          .select("id, status, company_id, default_unit_id, companies(id, name, status)")
          .eq("user_id", userId),
        supabase
          .from("role_assignments")
          .select("id, scope, company_id, unit_id, valid_from, valid_until, revoked_at, roles(id, code, name, scope)")
          .eq("user_id", userId)
          .is("revoked_at", null),
        supabase.from("role_permissions").select("role_id, permissions(code)"),
      ]);

    const now = Date.now();
    const active = (assignments ?? []).filter(
      (a) =>
        new Date(a.valid_from).getTime() <= now &&
        (a.valid_until === null || new Date(a.valid_until).getTime() > now),
    );

    const permsByRole = new Map<string, string[]>();
    for (const rp of rolePerms ?? []) {
      const code = (rp.permissions as { code: string } | null)?.code;
      if (!code) continue;
      const list = permsByRole.get(rp.role_id) ?? [];
      list.push(code);
      permsByRole.set(rp.role_id, list);
    }

    const platformPermissions = new Set<string>();
    const companyPermissions: Record<string, string[]> = {};
    for (const a of active) {
      const role = a.roles as { id: string; code: string } | null;
      if (!role) continue;
      const codes = permsByRole.get(role.id) ?? [];
      if (a.scope === "platform") {
        codes.forEach((c) => platformPermissions.add(c));
      } else if (a.company_id) {
        const set = new Set(companyPermissions[a.company_id] ?? []);
        codes.forEach((c) => set.add(c));
        companyPermissions[a.company_id] = [...set];
      }
    }

    const activeMemberships = (memberships ?? []).filter((m) => m.status === "active");
    for (const m of activeMemberships) {
      const set = new Set(companyPermissions[m.company_id] ?? []);
      platformPermissions.forEach((c) => set.add(c));
      companyPermissions[m.company_id] = [...set];
    }

    return {
      userId,
      profile,
      isPlatformAdmin: active.some(
        (a) => a.scope === "platform" && (a.roles as { code: string } | null)?.code === "platform_admin",
      ),
      isActive: profile?.is_active ?? false,
      memberships: activeMemberships,
      roleAssignments: active,
      companyPermissions,
    };
  });

export const listCompanyPeople = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ companyId: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    const { supabase } = context;
    const { data: memberships, error } = await supabase
      .from("memberships")
      .select("id, user_id, status, created_at, profiles:user_id(id, full_name, email, is_active)")
      .eq("company_id", data.companyId);
    if (error) throw new Error(error.message);

    const { data: assignments } = await supabase
      .from("role_assignments")
      .select("id, user_id, scope, valid_from, valid_until, revoked_at, reason, roles(code, name)")
      .eq("company_id", data.companyId)
      .order("created_at", { ascending: false });

    return { memberships: memberships ?? [], assignments: assignments ?? [] };
  });

export const listCatalog = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const [{ data: roles }, { data: permissions }] = await Promise.all([
      context.supabase.from("roles").select("*").order("code"),
      context.supabase.from("permissions").select("*").order("module"),
    ]);
    return { roles: roles ?? [], permissions: permissions ?? [] };
  });

export const assignRole = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        userId: z.string().uuid(),
        roleId: z.string().uuid(),
        companyId: z.string().uuid(),
        unitId: z.string().uuid().nullable().optional(),
        validUntil: z.string().nullable().optional(),
        reason: z.string().max(500).optional(),
      })
      .parse(d),
  )
  .handler(async ({ context, data }) => {
    const { error, data: row } = await context.supabase
      .from("role_assignments")
      .insert({
        user_id: data.userId,
        role_id: data.roleId,
        scope: data.unitId ? "unit" : "company",
        company_id: data.companyId,
        unit_id: data.unitId ?? null,
        valid_until: data.validUntil ?? null,
        granted_by: context.userId,
        reason: data.reason ?? null,
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

export const revokeRole = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z.object({ assignmentId: z.string().uuid(), reason: z.string().max(500).optional() }).parse(d),
  )
  .handler(async ({ context, data }) => {
    const { error } = await context.supabase
      .from("role_assignments")
      .update({
        revoked_at: new Date().toISOString(),
        revoked_by: context.userId,
        reason: data.reason ?? null,
      })
      .eq("id", data.assignmentId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const listUnits = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ companyId: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    const { data: units, error } = await context.supabase
      .from("units")
      .select("*")
      .eq("company_id", data.companyId)
      .order("name");
    if (error) throw new Error(error.message);
    return units ?? [];
  });

export const createUnit = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        companyId: z.string().uuid(),
        name: z.string().min(2).max(120),
        code: z.string().max(30).optional(),
      })
      .parse(d),
  )
  .handler(async ({ context, data }) => {
    const { error, data: row } = await context.supabase
      .from("units")
      .insert({ company_id: data.companyId, name: data.name, code: data.code || null })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

export const listAuditEvents = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z.object({ companyId: z.string().uuid(), limit: z.number().min(1).max(200).default(50) }).parse(d),
  )
  .handler(async ({ context, data }) => {
    const { data: events, error } = await context.supabase
      .from("audit_events")
      .select("*")
      .eq("company_id", data.companyId)
      .order("created_at", { ascending: false })
      .limit(data.limit);
    if (error) throw new Error(error.message);
    return events ?? [];
  });

export const generateSequence = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z.object({ companyId: z.string().uuid(), scopeKey: z.string().min(2).max(40) }).parse(d),
  )
  .handler(async ({ context, data }) => {
    const { data: value, error } = await context.supabase.rpc("next_sequence_value", {
      _company_id: data.companyId,
      _scope_key: data.scopeKey,
      _prefix: data.scopeKey.toUpperCase(),
    });
    if (error) throw new Error(error.message);
    return { value };
  });

export const runIdempotentOperation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        companyId: z.string().uuid(),
        key: z.string().min(4).max(120),
        operation: z.string().min(2).max(60),
        payload: z.record(z.string(), z.unknown()).default({}),
      })
      .parse(d),
  )
  .handler(async ({ context, data }) => {
    const { data: result, error } = await context.supabase.rpc("claim_idempotency_key", {
      _company_id: data.companyId,
      _operation: data.operation,
      _key: data.key,
      _request: data.payload as never,
      _response: { executed_at: new Date().toISOString() } as never,
    });
    if (error) throw new Error(error.message);
    return result as { status: string; response?: unknown };
  });

export const listNotifications = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data } = await context.supabase
      .from("notifications")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(30);
    return data ?? [];
  });

export const markNotificationRead = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    const { error } = await context.supabase
      .from("notifications")
      .update({ read_at: new Date().toISOString() })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const listAttachments = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ companyId: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    const { data: rows, error } = await context.supabase
      .from("attachments")
      .select("*")
      .eq("company_id", data.companyId)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

export const createAttachmentSignedUrl = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ attachmentId: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    const { data: row, error } = await context.supabase
      .from("attachments")
      .select("storage_path")
      .eq("id", data.attachmentId)
      .maybeSingle();
    if (error || !row) throw new Error("Anexo não encontrado ou acesso negado");
    const signed = await context.supabase.storage
      .from("attachments")
      .createSignedUrl(row.storage_path, 60);
    if (signed.error) throw new Error(signed.error.message);
    return { url: signed.data.signedUrl, expiresInSeconds: 60 };
  });

export const listPolicyVersions = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ companyId: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    const { data: rows } = await context.supabase
      .from("policy_versions")
      .select("id, version, effective_from, effective_to, created_at, policies(code, name)")
      .eq("company_id", data.companyId)
      .order("created_at", { ascending: false });
    return rows ?? [];
  });
