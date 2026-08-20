/**
 * Fase 1 (PA-F1) — utilitários da suíte de testes.
 *
 * A suíte roda contra o backend real do projeto (Lovable Cloud / Postgres).
 * Variáveis necessárias (não versionadas): ver .env.example
 *  - SUPABASE_URL
 *  - SUPABASE_PUBLISHABLE_KEY
 *  - SUPABASE_SERVICE_ROLE_KEY  (somente para provisionar/limpar fixtures)
 *  - SUPABASE_DB_URL            (somente para os testes de TRUNCATE/privilégios)
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

export const SUPABASE_URL = process.env["SUPABASE_URL"]!;
export const PUBLISHABLE_KEY = process.env["SUPABASE_PUBLISHABLE_KEY"]!;
export const SERVICE_ROLE_KEY = process.env["SUPABASE_SERVICE_ROLE_KEY"]!;
export const DB_URL = process.env["SUPABASE_DB_URL"];

export function admin(): SupabaseClient {
  return createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { fetch: (i, init) => keyFetch(SERVICE_ROLE_KEY)(i, init) },
  });
}

export function anon(): SupabaseClient {
  return createClient(SUPABASE_URL, PUBLISHABLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { fetch: (i, init) => keyFetch(PUBLISHABLE_KEY)(i, init) },
  });
}

/** As novas chaves sb_* são opacas: precisam ir em `apikey`, nunca como Bearer. */
function keyFetch(key: string): typeof fetch {
  return (input, init) => {
    const headers = new Headers(
      typeof Request !== "undefined" && input instanceof Request ? input.headers : undefined,
    );
    if (init?.headers) new Headers(init.headers).forEach((v, k) => headers.set(k, v));
    if (headers.get("Authorization") === `Bearer ${key}`) headers.delete("Authorization");
    headers.set("apikey", key);
    return fetch(input, { ...init, headers });
  };
}

export function userClient(accessToken: string): SupabaseClient {
  return createClient(SUPABASE_URL, PUBLISHABLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: {
      fetch: keyFetch(PUBLISHABLE_KEY),
      headers: { Authorization: `Bearer ${accessToken}` },
    },
  });
}

export const PASSWORD = "F1-Test!Str0ng-Pass";

export type TestUser = {
  id: string;
  email: string;
  token: string;
  db: SupabaseClient;
};

export async function createUser(a: SupabaseClient, label: string, run: string): Promise<TestUser> {
  const email = `f1.${label}.${run}@iga-test.example.com`;
  const { data, error } = await a.auth.admin.createUser({
    email,
    password: PASSWORD,
    email_confirm: true,
    user_metadata: { full_name: `F1 ${label}` },
  });
  if (error) throw new Error(`createUser ${label}: ${error.message}`);
  const signIn = await anon().auth.signInWithPassword({ email, password: PASSWORD });
  if (signIn.error) throw new Error(`signIn ${label}: ${signIn.error.message}`);
  const token = signIn.data.session!.access_token;
  return { id: data.user!.id, email, token, db: userClient(token) };
}

export async function createCompany(a: SupabaseClient, name: string) {
  const { data, error } = await a.from("companies").insert({ name }).select("id").single();
  if (error) throw new Error(`createCompany: ${error.message}`);
  return data.id as string;
}

export async function addMembership(a: SupabaseClient, userId: string, companyId: string) {
  const { error } = await a
    .from("memberships")
    .insert({ user_id: userId, company_id: companyId, status: "active" });
  if (error) throw new Error(`addMembership: ${error.message}`);
}

export async function roleId(a: SupabaseClient, code: string) {
  const { data, error } = await a.from("roles").select("id").eq("code", code).single();
  if (error) throw new Error(`roleId ${code}: ${error.message}`);
  return data.id as string;
}

export async function grantRole(
  a: SupabaseClient,
  opts: {
    userId: string;
    roleCode: string;
    companyId: string | null;
    scope?: "platform" | "company" | "unit";
    validFrom?: string;
    validUntil?: string | null;
  },
) {
  const { data, error } = await a
    .from("role_assignments")
    .insert({
      user_id: opts.userId,
      role_id: await roleId(a, opts.roleCode),
      scope: opts.scope ?? (opts.companyId ? "company" : "platform"),
      company_id: opts.companyId,
      valid_from: opts.validFrom ?? new Date(Date.now() - 60_000).toISOString(),
      valid_until: opts.validUntil ?? null,
    })
    .select("id")
    .single();
  if (error) throw new Error(`grantRole ${opts.roleCode}: ${error.message}`);
  return data.id as string;
}

export async function cleanup(a: SupabaseClient, companyIds: string[], userIds: string[]) {
  for (const c of companyIds) {
    await a.from("approval_requests").delete().eq("company_id", c);
    await a.from("attachments").delete().eq("company_id", c);
    await a.from("policy_versions").delete().eq("company_id", c);
    await a.from("policies").delete().eq("company_id", c);
    await a.from("company_settings").delete().eq("company_id", c);
    await a.from("sequence_counters").delete().eq("company_id", c);
    await a.from("idempotency_keys").delete().eq("company_id", c);
    await a.from("notifications").delete().eq("company_id", c);
    await a.from("units").delete().eq("company_id", c);
    await a.from("memberships").delete().eq("company_id", c);
  }
  for (const u of userIds) {
    await a.from("role_assignments").delete().eq("user_id", u);
    await a.from("notifications").delete().eq("user_id", u);
    await a.from("idempotency_keys").delete().eq("user_id", u);
  }
  // audit_events é append-only por design: as linhas geradas pelos testes permanecem.
  for (const c of companyIds) await a.from("companies").delete().eq("id", c);
  for (const u of userIds) await a.auth.admin.deleteUser(u);
}

export const runId = () => Math.random().toString(36).slice(2, 8);
