/**
 * PA-F1 — F1-CONC-001: 20 solicitações concorrentes de sequência.
 * Critério: 20 valores gerados, todos únicos, contíguos de 1 a 20, sem erro.
 * Evidência gravada em tests/fase1/evidencias/.
 */
import { afterAll, beforeAll, expect, it } from "vitest";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  addMembership,
  admin,
  cleanup,
  createCompany,
  createUser,
  grantRole,
  runId,
  type TestUser,
} from "./helpers";

const a = admin();
const run = runId();
const EVID = join(dirname(fileURLToPath(import.meta.url)), "evidencias");

let company: string;
let user: TestUser;

beforeAll(async () => {
  company = await createCompany(a, `F1 Concorrencia ${run}`);
  user = await createUser(a, "conc", run);
  await addMembership(a, user.id, company);
  await grantRole(a, { userId: user.id, roleCode: "unit_manager", companyId: company });
}, 180_000);

afterAll(async () => {
  await cleanup(a, [company], [user.id]);
});

it("F1-CONC-001: 20 chamadas simultâneas geram 20 números únicos e contíguos", async () => {
  const scope = `conc-${run}`;
  const started = new Date().toISOString();

  const results = await Promise.all(
    Array.from({ length: 20 }, () =>
      user.db.rpc("next_sequence_value", {
        _company_id: company,
        _scope_key: scope,
        _prefix: "CONC",
      }),
    ),
  );

  const errors = results.filter((r) => r.error).map((r) => r.error!.message);
  const values = results.filter((r) => !r.error).map((r) => r.data as string);
  const numbers = values.map((v) => Number(v.split("-")[1])).sort((x, y) => x - y);

  mkdirSync(EVID, { recursive: true });
  writeFileSync(
    join(EVID, "F1-CONC-001.json"),
    JSON.stringify(
      {
        teste: "F1-CONC-001",
        descricao: "20 solicitações concorrentes de next_sequence_value",
        iniciado_em: started,
        finalizado_em: new Date().toISOString(),
        solicitacoes: 20,
        sucessos: values.length,
        erros: errors,
        valores: values,
        unicos: new Set(values).size,
        contiguo_1_a_20: numbers.every((n, i) => n === i + 1),
      },
      null,
      2,
    ),
  );

  expect(errors).toEqual([]);
  expect(values).toHaveLength(20);
  expect(new Set(values).size).toBe(20);
  expect(numbers).toEqual(Array.from({ length: 20 }, (_, i) => i + 1));
});
