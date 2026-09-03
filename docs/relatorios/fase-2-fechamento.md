# Relatório de Fechamento — Fase 2 (PA-F2)

**Projeto:** IGA Network BR — Plataforma de Gestão de Parcerias
**Escopo autorizado:** Parceiros, Territórios e Onboarding
**Situação:** submetido à homologação
**Fase 3:** bloqueada

---

## 1. Escopo entregue

| Bloco | Entrega |
| --- | --- |
| Ciclo de parceria | Funil de candidato (`prospect → triage → prequalified → interview → approved`) separado do ciclo do parceiro (`onboarding → training → certification_pending → active → attention → suspended → inactive → exit`) |
| Recrutamento e seleção | Cadastro com origem, canal, campanha, indicação e abordagem; avaliações por etapa com decisão, critérios e avaliador; histórico de etapas imutável |
| Conversão | RPC idempotente `convert_candidate_to_partner`, permitida somente a partir de `approved`, preservando origem/canal e instanciando o checklist de onboarding vigente |
| Onboarding | Checklists versionáveis por empresa; instâncias por parceiro com status, responsável, evidência e data de conclusão; versões novas não alteram instâncias existentes |
| Capacitação e certificação | Trilhas, módulos, progresso por parceiro e certificações com validade — independentes do status do parceiro |
| Territórios | Modos `open`, `recommended_base`, `preferred` e `protected`; vigência com início/fim, aprovação explícita, revogação e substituição controlada |
| Payee profile | Dados bancários/PIX segregados, leitura mascarada por RPC, histórico de alterações por campo e auditoria de acesso não mascarado |
| Governança | RBAC granular (12 permissões novas), RLS multiempresa, auditoria append-only, idempotência em operações críticas |

### Superfície de aplicação

- `src/lib/partners.functions.ts` — server functions autenticadas (RLS aplicada no banco).
- `src/hooks/use-partners.ts` — camada de consulta (React Query).
- Rotas: `/candidatos`, `/parceiros`, `/territorios` (além das rotas da Fase 1).

---

## 2. Defeitos encontrados e corrigidos durante a homologação

| ID | Defeito | Correção |
| --- | --- | --- |
| F2-BUG-001 | `candidate_stage_events.company_id` e `candidate_evaluations.company_id` referenciavam a tabela de candidatos em vez de empresas, impedindo o registro de histórico e avaliações | Chaves estrangeiras recriadas apontando para `companies` |
| F2-BUG-002 | `assign_partner_territory` falhava com erro de tipo (`42804`) ao gravar o status do vínculo | Conversão explícita para o tipo `partner_territory_status` |
| F2-BUG-003 | Alterações de território não entravam na trilha de auditoria | Gatilho de auditoria adicionado em `partner_territories` |
| F2-BUG-004 | Território protegido era aceito sem prazo final de vigência (regra só era verificada na ativação) e não havia bloqueio de sobreposição entre parceiros | Guarda reforçada: vigência obrigatória na solicitação e bloqueio de proteções sobrepostas no mesmo território/período |
| F2-BUG-005 | Histórico de payee gravava lista de campos alterados vazia (erro de literal de array) | Uso de `array_append`; campos alterados agora são registrados corretamente |

Todos os defeitos foram corrigidos por migração e reverificados pela bateria automatizada.

---

## 3. Bateria de testes

Execução contra o backend real, com fixtures isoladas por execução e limpeza ao final.

| Suíte | Casos | Resultado |
| --- | --- | --- |
| `tests/fase2/fase2.test.ts` | 35 | 35 aprovados |
| `tests/fase1/fase1.test.ts` + `tests/fase1/concorrencia.test.ts` (regressão) | 44 | 44 aprovados |
| **Total** | **79** | **79 aprovados** |

### Cobertura da Fase 2

- **F2-CAND (8)** — bloqueio anônimo, criação como `prospect`, isolamento multiempresa, recusa de salto de etapa, evento de etapa gerado, histórico imutável, avaliação imutável com avaliador registrado, bloqueio de usuário sem permissão.
- **F2-CONV (5)** — conversão antes da aprovação recusada; conversão após aprovação preserva origem e vínculo com o candidato; idempotência (mesma chave não duplica parceiro); checklist instanciado; empresa alheia não converte.
- **F2-ONB (3)** — nova versão do checklist não altera instâncias vigentes; conclusão registra responsável e data; item não pode ser excluído.
- **F2-CAP (3)** — progresso de trilha registrado; certificação preservada durante suspensão do parceiro; trilha de outra empresa invisível.
- **F2-TER (7)** — território existe sem parceiro; atribuição comum aceita; atribuição idempotente; protegido exige vigência com término; protegido vigente bloqueia sobreposição; isolamento multiempresa; alterações auditadas.
- **F2-PAY (6)** — leitura mascarada não devolve dados completos; membro comum sem acesso; empresa alheia sem acesso; histórico registra campos alterados; histórico não guarda valores em claro; registro não pode ser excluído pelo app.
- **F2-SEC (3)** — anônimo sem leitura em todas as tabelas da fase; mudança de status do parceiro auditada; parceiro não pode ser excluído pelo app.

Regressão da Fase 1 reexecutada integralmente após todas as migrações desta fase, sem falhas.

---

## 4. Decisões de segurança

- Autorização é decidida exclusivamente no banco (RLS + funções `SECURITY DEFINER` com verificação de permissão interna). O frontend apenas reflete o que o banco autoriza.
- Dados bancários/PIX nunca trafegam em claro para telas de consulta: a leitura padrão é mascarada; acesso completo exige `payee.manage` e é registrado.
- Trilhas append-only: `audit_events`, `candidate_stage_events`, `candidate_evaluations`, `partner_policy_acceptances`, `payee_profile_events`.
- Operações críticas (conversão, atribuição de território, aceite de política) são idempotentes por chave.
- Alerta do linter "SECURITY DEFINER executável por usuários autenticados" permanece **aceito e homologado**: as RPCs precisam ser chamáveis pelo usuário autenticado e validam permissão internamente; as funções internas de autorização têm `EXECUTE` revogado.

---

## 5. Pendências e riscos residuais

1. Aprovação de território protegido ainda depende de atualização direta do vínculo (`pending → active`) por quem tem `territory.manage`; um fluxo formal de aprovação via `approval_requests` fica sugerido para fase futura.
2. Anexos de evidência de onboarding são referenciados, mas o upload é feito pela tela genérica de anexos.
3. Acompanhamento de 90 dias registra marcos manualmente; não há agendamento automático de lembretes.
4. Notificações de mudança de status do parceiro não são disparadas automaticamente.
5. Certificações vencidas não mudam de status automaticamente (não há rotina agendada).

Nenhuma dessas pendências pertence ao escopo autorizado da Fase 2.

---

## 6. Escopo explicitamente não implementado

CRM, leads, propostas, contratos, comissões, payout, integração bancária, Score Network e recursos de IA permanecem fora do escopo e não foram iniciados.
