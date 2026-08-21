# Relatório Técnico Integral — PA-F1

## 1. Identificação

| Campo | Valor |
| --- | --- |
| Projeto | Sistema de Gestão de Parcerias Comerciais — IGA Tecnologia |
| Etapa | PA-F1 — Fundação, Segurança e Governança |
| Documento base | IGA_Network_BR_PA-F1_Autorizacao_Fase_1.docx |
| Data do fechamento | 2026-08-20 |
| Status | Concluída — pronta para auditoria |
| Escopo autorizado | Fundação, segurança, RBAC, RLS, auditoria, infraestrutura base |
| Escopo bloqueado | Fase 2 (CRM, parceiros, contratos, financeiro, produtos) — não iniciada |

## 2. Detalhes da implementação

### 2.1 Modelo de dados (schema `public`)

| Domínio | Tabelas |
| --- | --- |
| Organização | `companies`, `units`, `company_settings` |
| Identidade | `profiles`, `memberships` |
| Autorização | `roles`, `permissions`, `role_permissions`, `role_assignments` |
| Governança | `audit_events`, `policies`, `policy_versions`, `approval_requests` |
| Infraestrutura | `attachments`, `idempotency_keys`, `sequence_counters`, `notifications` |

Todas as tabelas do schema `public` têm RLS habilitada, `GRANT` explícito por papel e
carimbos `created_at`/`updated_at` com gatilho de atualização.

### 2.2 Autorização

- Papéis de sistema: `platform_admin`, `company_admin`, `company_auditor`, `unit_manager`, `member`.
- 15 permissões atômicas (`company.*`, `unit.manage`, `user.read`, `role.assign`,
  `membership.manage`, `audit.read`, `policy.manage`, `attachment.*`, `approval.*`,
  `sequence.use`, `settings.manage`, `notification.send`).
- Concessões têm vigência (`valid_from` / `valid_until`) e revogação (`revoked_at`, `revoked_by`, `reason`).
- Decisão de acesso ocorre **no banco**, via funções `SECURITY DEFINER`
  (`is_user_active`, `is_company_member`, `has_permission`, `is_platform_admin`, `my_company_ids`)
  usadas dentro das políticas RLS. O front-end apenas reflete o estado; nunca decide acesso.

### 2.3 Proteções estruturais

| Proteção | Mecanismo |
| --- | --- |
| Autoelevação de privilégio | Gatilho `tg_no_self_elevation` + política RLS em `role_assignments` |
| Perda do último administrador | Gatilho `tg_protect_last_admin` |
| Auditoria imutável | Gatilho `tg_audit_immutable` (UPDATE/DELETE) + ausência de `GRANT` de UPDATE/DELETE |
| Versão de política imutável | Gatilho `tg_policy_version_immutable` |
| Usuário desativado | `is_user_active` incorporada a todas as funções de autorização |
| Anexos | Bucket privado `attachments`, acesso somente por URL assinada de curta duração |
| Idempotência | `claim_idempotency_key` com hash do payload (created / replayed / conflict) |
| Sequências | `next_sequence_value` com incremento atômico por empresa e escopo |

### 2.4 Aplicação (TanStack Start)

- Funções de servidor autenticadas em `src/lib/foundation.functions.ts` (middleware de bearer token).
- Rotas protegidas sob `src/routes/_authenticated/`: Painel, Empresas, Usuários, Auditoria, Governança.
- Rotas públicas: página institucional (`/`) e autenticação (`/auth`, e-mail/senha + Google).

## 3. Correções desta rodada

### F1-SEC-001 — Arquivo `.env` versionado

- `.env` e `.env.*` adicionados ao `.gitignore` (com exceção `!.env.example`).
- Criado `.env.example` com chaves de exemplo e separação explícita entre variáveis de
  cliente (publicáveis) e de servidor (secretas).
- Varredura do repositório por segredos (`sb_secret_*`, JWTs `eyJhbGciOi…`, chaves privadas,
  atribuições de `SERVICE_ROLE_KEY`): **nenhuma ocorrência real** — as únicas correspondências
  são comparações de prefixo em `src/integrations/supabase/*`, sem valor sensível.
- Segredos de servidor permanecem exclusivamente no cofre gerenciado do backend.
- **Ação pendente do responsável pelo repositório:** o arquivo já rastreado deve ser removido do
  índice (`git rm --cached .env`) e, por ter estado versionado, as chaves publicáveis devem ser
  rotacionadas por precaução. O agente não executa comandos de estado do Git.

### F1-TEST-001 — Bateria de testes e evidências

- Runner Vitest configurado (`vitest.config.ts`); scripts `npm test` e `npm run test:fase1`.
- Suíte em `tests/fase1/`, executada contra o backend real, com provisionamento e limpeza
  automáticos de fixtures (3 empresas e 8 usuários com papéis distintos).
- Evidência do teste de concorrência gravada em `tests/fase1/evidencias/F1-CONC-001.json`.

### F1-DOC-001 — Relatório técnico integral

- Este documento.

### Defeito encontrado e corrigido pela bateria

- **`claim_idempotency_key` falhava em 100% das chamadas** (`function digest(text, unknown) does not exist`):
  a função dependia da extensão `pgcrypto`, indisponível no `search_path`. Substituída pelo
  hash nativo `sha256(convert_to(...,'UTF8'))` via migração, com `EXECUTE` revogado de
  `PUBLIC`/`anon`. Sem a bateria de testes, o defeito chegaria à Fase 2.

## 4. Matriz de testes

Execução: 2026-08-20 — **44 testes, 44 aprovados, 0 falhas** (`npm run test:fase1`).

| ID | Cenário | Resultado esperado | Status |
| --- | --- | --- | --- |
| F1-AUTH-001 | Anônimo lista empresas | Nenhum registro | ✅ |
| F1-AUTH-002 | Login com credenciais válidas | Sessão emitida | ✅ |
| F1-AUTH-003 | Login com senha incorreta | Rejeitado | ✅ |
| F1-AUTH-004 | Anônimo chama função de segurança | Execução negada | ✅ |
| F1-USR-001 | Usuário desativado lista empresas | Nenhum registro | ✅ |
| F1-USR-002 | Usuário desativado tenta escrever | Negado | ✅ |
| F1-ISO-001 | Admin A lista empresas | Só a empresa A | ✅ |
| F1-ISO-002 | Admin A lê empresa B por id | Nenhum registro | ✅ |
| F1-ISO-003 | Admin A escreve na empresa B | Negado | ✅ |
| F1-ISO-004 | Admin B lista membros da empresa A | Nenhum registro | ✅ |
| F1-ISO-005 | Admin B lê perfil de usuário da empresa A | Nenhum registro | ✅ |
| F1-RBAC-001 | Papel com `unit.manage` cria unidade | Permitido | ✅ |
| F1-RBAC-002 | Papel sem `unit.manage` cria unidade | Negado | ✅ |
| F1-RBAC-003 | Papel sem `audit.read` lê auditoria | Nenhum registro | ✅ |
| F1-RBAC-004 | Concessão com vigência futura | Ainda sem permissão | ✅ |
| F1-RBAC-005 | Concessão expirada | Sem permissão | ✅ |
| F1-RBAC-006 | Concessão revogada | Sem permissão | ✅ |
| F1-SEC-001 | Usuário concede papel a si mesmo | Bloqueado | ✅ |
| F1-SEC-002 | Revogar último administrador da empresa | Bloqueado | ✅ |
| F1-SEC-003 | Usuário comum concede papel a terceiro | Negado | ✅ |
| F1-AUD-001 | Operações geram trilha legível por `audit.read` | Eventos presentes | ✅ |
| F1-AUD-002 | UPDATE em `audit_events` (inclusive service role) | Bloqueado | ✅ |
| F1-AUD-003 | DELETE em `audit_events` (inclusive service role) | Bloqueado | ✅ |
| F1-AUD-004 | TRUNCATE por `anon`/`authenticated`/`service_role` | Negado nos 3 papéis | ✅ |
| F1-POL-001 | Criação de política e versão com `policy.manage` | Permitido | ✅ |
| F1-POL-002 | Alteração de versão publicada | Bloqueada (imutável) | ✅ |
| F1-POL-003 | Criação de política sem permissão | Negada | ✅ |
| F1-ATT-001 | Registro de anexo com `attachment.write` | Permitido | ✅ |
| F1-ATT-002 | Registro de anexo sem permissão | Negado | ✅ |
| F1-ATT-003 | Anexos de outra empresa | Nenhum registro | ✅ |
| F1-ATT-004 | Acesso público direto ao arquivo | Negado (bucket privado) | ✅ |
| F1-IDEM-001 | Mesma chave, mesmo payload | `created` → `replayed` | ✅ |
| F1-IDEM-002 | Mesma chave, payload diferente | `conflict` | ✅ |
| F1-IDEM-003 | Chave de outro usuário | Nenhum registro | ✅ |
| F1-SEQ-001 | Duas chamadas sequenciais | `TST-000001`, `TST-000002` | ✅ |
| F1-SEQ-002 | Não-membro gera sequência da empresa | Negado | ✅ |
| F1-NOT-001 | Envio com `notification.send` | Permitido | ✅ |
| F1-NOT-002 | Envio sem permissão | Negado | ✅ |
| F1-NOT-003 | Leitura de notificações alheias | Nenhum registro | ✅ |
| F1-APR-001 | Solicitação sem `approval.request` | Negada | ✅ |
| F1-APR-002 | Solicitação válida | Criada | ✅ |
| F1-APR-003 | Decisão exige `approval.decide` | Só o autorizado altera | ✅ |
| F1-APR-004 | Exclusão / leitura cruzada de aprovação | Negadas | ✅ |
| **F1-CONC-001** | **20 solicitações simultâneas de sequência** | **20 valores únicos e contíguos de 1 a 20, sem erro** | ✅ |

### Evidência F1-CONC-001

`tests/fase1/evidencias/F1-CONC-001.json` (gerado na execução):

- 20 solicitações disparadas em paralelo, 20 sucessos, 0 erros;
- 20 valores distintos (`CONC-000001` … `CONC-000020`), sem lacunas e sem duplicidade;
- ordem de retorno embaralhada — confirma paralelismo real, com serialização garantida
  pelo `UPDATE ... RETURNING` atômico em `sequence_counters`.

## 5. Pendências e riscos

| # | Item | Severidade | Situação |
| --- | --- | --- | --- |
| 1 | Remoção de `.env` do índice do Git e rotação preventiva das chaves publicáveis | Alta | **Pendente — ação humana** (o agente não executa comandos de estado do Git) |
| 2 | Funções `SECURITY DEFINER` executáveis por usuários autenticados (9 avisos do linter) | Baixa — aceito | Decisão de projeto: são o ponto de entrada da autorização e validam `auth.uid()`/permissão internamente; `EXECUTE` revogado de `PUBLIC`/`anon` |
| 3 | Auditoria cresce indefinidamente (append-only, sem particionamento/retenção) | Média | Definir política de retenção/arquivamento antes do volume de produção |
| 4 | Linhas de auditoria geradas pelos testes não são removíveis (por design) | Baixa | Recomenda-se executar a bateria fora do ambiente de produção |
| 5 | Testes dependem da chave de serviço e da URL do banco para provisionar fixtures | Média | Executar somente em ambiente controlado; variáveis nunca versionadas |
| 6 | Fluxo de aprovações e notificações existe como infraestrutura, sem consumidores de negócio | Informativo | Depende da Fase 2 (não autorizada) |
| 7 | MFA e política de expiração de senha | Média | Fora do escopo autorizado da PA-F1 |

## 6. Declaração de escopo

Nenhum artefato da Fase 2 (CRM, parceiros, contratos, propostas, financeiro, produtos) foi
criado ou iniciado. O desenvolvimento está **interrompido** aguardando auditoria.
