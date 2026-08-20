/**
 * PA-F1 — Bateria de testes de Fundação, Segurança e Governança.
 * Cada `it` carrega o ID usado na matriz de testes do relatório
 * docs/relatorios/fase-1-fechamento.md
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import postgres from "postgres";
import {
  DB_URL,
  PASSWORD,
  addMembership,
  admin,
  anon,
  cleanup,
  createCompany,
  createUser,
  grantRole,
  runId,
  type TestUser,
} from "./helpers";

const a = admin();
const run = runId();

let companyA: string;
let companyB: string;
let companyC: string;
let adminA: TestUser;
let memberA: TestUser;
let inactiveA: TestUser;
let adminB: TestUser;
let expiredA: TestUser;
let revokedA: TestUser;
let futureA: TestUser;
let adminC: TestUser;
let revokedAssignmentId: string;
let adminCAssignmentId: string;

beforeAll(async () => {
  companyA = await createCompany(a, `F1 Empresa A ${run}`);
  companyB = await createCompany(a, `F1 Empresa B ${run}`);
  companyC = await createCompany(a, `F1 Empresa C ${run}`);

  [adminA, memberA, inactiveA, adminB, expiredA, revokedA, futureA, adminC] = await Promise.all([
    createUser(a, "admina", run),
    createUser(a, "membera", run),
    createUser(a, "inativo", run),
    createUser(a, "adminb", run),
    createUser(a, "expirado", run),
    createUser(a, "revogado", run),
    createUser(a, "futuro", run),
    createUser(a, "adminc", run),
  ]);

  for (const u of [adminA, memberA, inactiveA, expiredA, revokedA, futureA]) {
    await addMembership(a, u.id, companyA);
  }
  await addMembership(a, adminB.id, companyB);
  await addMembership(a, adminC.id, companyC);

  await grantRole(a, { userId: adminA.id, roleCode: "company_admin", companyId: companyA });
  await grantRole(a, { userId: memberA.id, roleCode: "member", companyId: companyA });
  await grantRole(a, { userId: inactiveA.id, roleCode: "company_admin", companyId: companyA });
  await grantRole(a, { userId: adminB.id, roleCode: "company_admin", companyId: companyB });
  adminCAssignmentId = await grantRole(a, {
    userId: adminC.id,
    roleCode: "company_admin",
    companyId: companyC,
  });
  await grantRole(a, {
    userId: expiredA.id,
    roleCode: "company_admin",
    companyId: companyA,
    validFrom: new Date(Date.now() - 7_200_000).toISOString(),
    validUntil: new Date(Date.now() - 3_600_000).toISOString(),
  });
  await grantRole(a, {
    userId: futureA.id,
    roleCode: "company_admin",
    companyId: companyA,
    validFrom: new Date(Date.now() + 3_600_000).toISOString(),
  });
  revokedAssignmentId = await grantRole(a, {
    userId: revokedA.id,
    roleCode: "company_admin",
    companyId: companyA,
  });
  await a
    .from("role_assignments")
    .update({ revoked_at: new Date().toISOString() })
    .eq("id", revokedAssignmentId);

  await a.from("profiles").update({ is_active: false }).eq("id", inactiveA.id);
}, 180_000);

afterAll(async () => {
  await cleanup(
    a,
    [companyA, companyB, companyC],
    [adminA, memberA, inactiveA, adminB, expiredA, revokedA, futureA, adminC].map((u) => u.id),
  );
});

describe("Autenticação", () => {
  it("F1-AUTH-001: anônimo não enxerga empresas", async () => {
    const { data, error } = await anon().from("companies").select("id");
    expect(error).toBeNull();
    expect(data).toEqual([]);
  });

  it("F1-AUTH-002: credenciais válidas autenticam", async () => {
    const { data, error } = await anon().auth.signInWithPassword({
      email: adminA.email,
      password: PASSWORD,
    });
    expect(error).toBeNull();
    expect(data.user?.id).toBe(adminA.id);
  });

  it("F1-AUTH-003: credenciais inválidas são rejeitadas", async () => {
    const { data, error } = await anon().auth.signInWithPassword({
      email: adminA.email,
      password: "senha-errada",
    });
    expect(error).not.toBeNull();
    expect(data.session).toBeNull();
  });

  it("F1-AUTH-004: RPCs de segurança não são executáveis por anônimo", async () => {
    const { error } = await anon().rpc("is_platform_admin", { _user_id: adminA.id });
    expect(error).not.toBeNull();
  });
});

describe("Usuário inativo", () => {
  it("F1-USR-001: usuário inativo perde acesso às empresas", async () => {
    const { data } = await inactiveA.db.from("companies").select("id");
    expect(data).toEqual([]);
  });

  it("F1-USR-002: usuário inativo perde permissões efetivas", async () => {
    const { error } = await inactiveA.db
      .from("units")
      .insert({ company_id: companyA, name: "Unidade inativa" });
    expect(error).not.toBeNull();
  });
});

describe("Isolamento multiempresa", () => {
  it("F1-ISO-001: admin A só enxerga a empresa A", async () => {
    const { data } = await adminA.db.from("companies").select("id");
    const ids = (data ?? []).map((r) => r.id);
    expect(ids).toContain(companyA);
    expect(ids).not.toContain(companyB);
  });

  it("F1-ISO-002: acesso cruzado direto por id retorna vazio", async () => {
    const { data } = await adminA.db.from("companies").select("id").eq("id", companyB);
    expect(data).toEqual([]);
  });

  it("F1-ISO-003: escrita cruzada entre empresas é negada", async () => {
    const { error } = await adminA.db
      .from("units")
      .insert({ company_id: companyB, name: "Invasao" });
    expect(error).not.toBeNull();
  });

  it("F1-ISO-004: membros de outra empresa não são listados", async () => {
    const { data } = await adminB.db.from("memberships").select("id").eq("company_id", companyA);
    expect(data).toEqual([]);
  });

  it("F1-ISO-005: perfis de outra empresa não são legíveis", async () => {
    const { data } = await adminB.db.from("profiles").select("id").eq("id", adminA.id);
    expect(data).toEqual([]);
  });
});

describe("RBAC", () => {
  it("F1-RBAC-001: papel com permissão executa a ação", async () => {
    const { error } = await adminA.db
      .from("units")
      .insert({ company_id: companyA, name: `Unidade ${run}` });
    expect(error).toBeNull();
  });

  it("F1-RBAC-002: ausência de permissão → acesso negado", async () => {
    const { error } = await memberA.db
      .from("units")
      .insert({ company_id: companyA, name: "Unidade sem permissao" });
    expect(error).not.toBeNull();
  });

  it("F1-RBAC-003: leitura sensível exige permissão específica", async () => {
    const { data } = await memberA.db.from("audit_events").select("id").eq("company_id", companyA);
    expect(data).toEqual([]);
  });

  it("F1-RBAC-004: vigência futura ainda não concede permissão", async () => {
    const { error } = await futureA.db
      .from("units")
      .insert({ company_id: companyA, name: "Unidade futura" });
    expect(error).not.toBeNull();
  });

  it("F1-RBAC-005: papel expirado não concede permissão", async () => {
    const { error } = await expiredA.db
      .from("units")
      .insert({ company_id: companyA, name: "Unidade expirada" });
    expect(error).not.toBeNull();
  });

  it("F1-RBAC-006: papel revogado não concede permissão", async () => {
    const { error } = await revokedA.db
      .from("units")
      .insert({ company_id: companyA, name: "Unidade revogada" });
    expect(error).not.toBeNull();
  });
});

describe("Proteções de segurança", () => {
  it("F1-SEC-001: autoelevação é bloqueada", async () => {
    const { data: role } = await a.from("roles").select("id").eq("code", "platform_admin").single();
    const { error } = await adminA.db.from("role_assignments").insert({
      user_id: adminA.id,
      role_id: role!.id,
      scope: "company",
      company_id: companyA,
      granted_by: adminA.id,
    });
    expect(error).not.toBeNull();
  });

  it("F1-SEC-002: último administrador ativo não pode ser revogado", async () => {
    const { error } = await a
      .from("role_assignments")
      .update({ revoked_at: new Date().toISOString() })
      .eq("id", adminCAssignmentId);
    expect(error?.message ?? "").toMatch(/administrador ativo/i);
  });

  it("F1-SEC-003: usuário comum não pode conceder papéis", async () => {
    const { data: role } = await a.from("roles").select("id").eq("code", "company_admin").single();
    const { error } = await memberA.db.from("role_assignments").insert({
      user_id: revokedA.id,
      role_id: role!.id,
      scope: "company",
      company_id: companyA,
      granted_by: memberA.id,
    });
    expect(error).not.toBeNull();
  });
});

describe("Auditoria imutável", () => {
  it("F1-AUD-001: auditoria registra as operações e é legível por quem tem audit.read", async () => {
    const { data } = await adminA.db
      .from("audit_events")
      .select("id, action, object_type")
      .eq("company_id", companyA)
      .limit(5);
    expect((data ?? []).length).toBeGreaterThan(0);
  });

  it("F1-AUD-002: UPDATE em auditoria é bloqueado (inclusive service_role)", async () => {
    const { data: row } = await a
      .from("audit_events")
      .select("id")
      .eq("company_id", companyA)
      .limit(1)
      .single();
    const { error } = await a.from("audit_events").update({ action: "tampered" }).eq("id", row!.id);
    expect(error?.message ?? "").toMatch(/append-only/i);
  });

  it("F1-AUD-003: DELETE em auditoria é bloqueado (inclusive service_role)", async () => {
    const { data: row } = await a
      .from("audit_events")
      .select("id")
      .eq("company_id", companyA)
      .limit(1)
      .single();
    const { error } = await a.from("audit_events").delete().eq("id", row!.id);
    expect(error?.message ?? "").toMatch(/append-only/i);
  });

  it("F1-AUD-004: TRUNCATE em auditoria é negado para anon/authenticated/service_role", async () => {
    expect(DB_URL, "SUPABASE_DB_URL necessária para este teste").toBeTruthy();
    const sql = postgres(DB_URL!, { max: 1, prepare: false });
    try {
      for (const role of ["anon", "authenticated", "service_role"]) {
        let denied = false;
        try {
          await sql.begin(async (tx) => {
            await tx.unsafe(`set local role ${role}`);
            await tx.unsafe("truncate table public.audit_events");
          });
        } catch (e) {
          denied = /permission denied|must be owner|append-only/i.test(String(e));
        }
        expect(denied, `TRUNCATE deveria ser negado para ${role}`).toBe(true);
      }
    } finally {
      await sql.end();
    }
  });
});

describe("Políticas versionadas", () => {
  it("F1-POL-001: versão de política é criada por quem tem policy.manage", async () => {
    const { data: pol, error: e1 } = await adminA.db
      .from("policies")
      .insert({ company_id: companyA, code: `pol-${run}`, name: "Política de teste" })
      .select("id")
      .single();
    expect(e1).toBeNull();
    const { error: e2 } = await adminA.db.from("policy_versions").insert({
      policy_id: pol!.id,
      company_id: companyA,
      version: 1,
      content: { regra: "v1" },
    });
    expect(e2).toBeNull();
  });

  it("F1-POL-002: versão de política é imutável", async () => {
    const { data: row } = await a
      .from("policy_versions")
      .select("id")
      .eq("company_id", companyA)
      .limit(1)
      .single();
    const { error } = await a
      .from("policy_versions")
      .update({ content: { regra: "adulterada" } })
      .eq("id", row!.id);
    expect(error?.message ?? "").toMatch(/immutable/i);
  });

  it("F1-POL-003: sem policy.manage não se cria política", async () => {
    const { error } = await memberA.db
      .from("policies")
      .insert({ company_id: companyA, code: `x-${run}`, name: "Negada" });
    expect(error).not.toBeNull();
  });
});

describe("Anexos", () => {
  it("F1-ATT-001: upload de metadado exige attachment.write", async () => {
    const { error } = await adminA.db.from("attachments").insert({
      company_id: companyA,
      object_type: "teste",
      storage_path: `${companyA}/arquivo-${run}.txt`,
      file_name: `arquivo-${run}.txt`,
      uploaded_by: adminA.id,
    });
    expect(error).toBeNull();
  });

  it("F1-ATT-002: sem attachment.write o registro é negado", async () => {
    const { error } = await memberA.db.from("attachments").insert({
      company_id: companyA,
      object_type: "teste",
      storage_path: `${companyA}/negado-${run}.txt`,
      file_name: "negado.txt",
      uploaded_by: memberA.id,
    });
    expect(error).not.toBeNull();
  });

  it("F1-ATT-003: anexos são isolados por empresa", async () => {
    const { data } = await adminB.db.from("attachments").select("id").eq("company_id", companyA);
    expect(data).toEqual([]);
  });

  it("F1-ATT-004: bucket de anexos é privado", async () => {
    const url = `${process.env["SUPABASE_URL"]}/storage/v1/object/public/attachments/${companyA}/arquivo-${run}.txt`;
    const res = await fetch(url);
    expect(res.ok).toBe(false);
  });
});

describe("Idempotência", () => {
  const key = `idem-${run}`;
  it("F1-IDEM-001: mesma chave e mesmo payload → replay", async () => {
    const payload = { valor: 10 };
    const first = await adminA.db.rpc("claim_idempotency_key", {
      _company_id: companyA,
      _operation: "teste.f1",
      _key: key,
      _request: payload,
      _response: { ok: true },
    });
    expect(first.error).toBeNull();
    expect((first.data as { status: string }).status).toBe("created");

    const second = await adminA.db.rpc("claim_idempotency_key", {
      _company_id: companyA,
      _operation: "teste.f1",
      _key: key,
      _request: payload,
      _response: { ok: true },
    });
    expect((second.data as { status: string }).status).toBe("replayed");
  });

  it("F1-IDEM-002: mesma chave e payload diferente → conflito", async () => {
    const res = await adminA.db.rpc("claim_idempotency_key", {
      _company_id: companyA,
      _operation: "teste.f1",
      _key: key,
      _request: { valor: 99 },
      _response: { ok: true },
    });
    expect((res.data as { status: string }).status).toBe("conflict");
  });

  it("F1-IDEM-003: chave de idempotência é isolada por usuário", async () => {
    const { data } = await memberA.db.from("idempotency_keys").select("id").eq("key", key);
    expect(data).toEqual([]);
  });
});

describe("Sequências", () => {
  it("F1-SEQ-001: sequência gera valores incrementais no escopo", async () => {
    const scope = `seq-${run}`;
    const v1 = await adminA.db.rpc("next_sequence_value", {
      _company_id: companyA,
      _scope_key: scope,
      _prefix: "TST",
    });
    const v2 = await adminA.db.rpc("next_sequence_value", {
      _company_id: companyA,
      _scope_key: scope,
      _prefix: "TST",
    });
    expect(v1.error).toBeNull();
    expect(v1.data).toBe("TST-000001");
    expect(v2.data).toBe("TST-000002");
  });

  it("F1-SEQ-002: não-membro não gera sequência da empresa", async () => {
    const { error } = await adminB.db.rpc("next_sequence_value", {
      _company_id: companyA,
      _scope_key: `seq-neg-${run}`,
      _prefix: "TST",
    });
    expect(error).not.toBeNull();
  });
});

describe("Notificações", () => {
  it("F1-NOT-001: notificação é criada por quem tem notification.send", async () => {
    const { error } = await adminA.db.rpc("notify_user", {
      _user_id: memberA.id,
      _company_id: companyA,
      _title: `Aviso ${run}`,
      _body: "corpo",
      _category: "system",
      _payload: {},
    });
    expect(error).toBeNull();
  });

  it("F1-NOT-002: sem notification.send a criação é negada", async () => {
    const { error } = await memberA.db.rpc("notify_user", {
      _user_id: adminA.id,
      _company_id: companyA,
      _title: "Negado",
      _body: null,
      _category: "system",
      _payload: {},
    });
    expect(error).not.toBeNull();
  });

  it("F1-NOT-003: cada usuário só lê as próprias notificações", async () => {
    const mine = await memberA.db.from("notifications").select("id, title");
    expect((mine.data ?? []).some((n) => n.title === `Aviso ${run}`)).toBe(true);
    const others = await adminA.db.from("notifications").select("id").eq("user_id", memberA.id);
    expect(others.data).toEqual([]);
  });
});

describe("Aprovações", () => {
  let requestId: string;

  it("F1-APR-001: solicitação exige approval.request", async () => {
    const { error } = await memberA.db.from("approval_requests").insert({
      company_id: companyA,
      object_type: "teste",
      status: "pending",
      requested_by: memberA.id,
      payload: {},
    });
    expect(error).not.toBeNull();
  });

  it("F1-APR-002: solicitação válida é criada", async () => {
    const { data, error } = await adminA.db
      .from("approval_requests")
      .insert({
        company_id: companyA,
        object_type: "teste",
        status: "pending",
        requested_by: adminA.id,
        payload: { motivo: "f1" },
      })
      .select("id")
      .single();
    expect(error).toBeNull();
    requestId = data!.id;
  });

  it("F1-APR-003: decisão exige approval.decide", async () => {
    const ok = await adminA.db
      .from("approval_requests")
      .update({ status: "approved", decided_by: adminA.id, decided_at: new Date().toISOString() })
      .eq("id", requestId)
      .select("id");
    expect(ok.error).toBeNull();
    expect((ok.data ?? []).length).toBe(1);

    const negado = await memberA.db
      .from("approval_requests")
      .update({ status: "rejected" })
      .eq("id", requestId)
      .select("id");
    expect(negado.data ?? []).toEqual([]);
  });

  it("F1-APR-004: aprovações não são apagáveis nem visíveis a outra empresa", async () => {
    const del = await adminA.db.from("approval_requests").delete().eq("id", requestId).select("id");
    expect(del.data ?? []).toEqual([]);
    const cross = await adminB.db.from("approval_requests").select("id").eq("id", requestId);
    expect(cross.data).toEqual([]);
  });
});
