# Relatório de Fechamento — Fase 3 (PA-F3)

**Projeto:** IGA Network BR — Sistema de Gestão de Parcerias  
**Escopo autorizado:** CRM, Leads, Produtos e Política Comercial  
**Situação:** implementação técnica concluída e submetida à homologação  
**Fase 4 e posteriores:** bloqueadas

## 1. Referências da entrega

- **Commit-base:** `6e10e67f1c843302331ef1f41b64592030775e40`
- **Commit final verificado:** `5b7730a35159cda85d6f81bb99e00fbe0f388ef1`
- **Migrações:**
  - `20260903093045_5e08c1e2-ce77-4cd3-83a9-553b0d324492.sql` — catálogo, políticas de preço, leads, deduplicação, proteção, conflitos, links de parceiro, RBAC, RLS e auditoria.
  - `20260904033747_733f50de-f4bc-4ebb-b808-40ec8b52c1ef.sql` — oportunidades, pipeline, atividades, propostas, snapshots, aprovações e operações críticas idempotentes.
  - `20260921003514_98703cb3-3c45-42a8-9420-9f32304acf17.sql` — correção tipada da resolução de conflitos e validação do parceiro vencedor.

## 2. Escopo entregue

| Bloco | Entrega |
| --- | --- |
| Catálogo | `Product`, `Plan` e `PricePolicy` separados, com vigência, versão, implantação, mensalidade, periodicidade e limites de desconto |
| Histórico de preços | Valores publicados imutáveis; propostas referenciam a política e preservam snapshot completo dos valores aplicados |
| Leads | Cadastro central com documento, contatos, localização, segmento, origem, canal, campanha, parceiro, território, responsável e status |
| Deduplicação | Busca por documento, telefone, e-mail e nome + cidade; ocorrências ambíguas são sinalizadas para resolução, sem bloqueio automático |
| Proteção comercial | Proteção independente de território, com vigência, origem, motivo, liberação, transferência, disputa e histórico imutável |
| Conflitos | Evidências, parceiros envolvidos, proteção e território preservados; decisão com justificativa e alçada pelo framework de aprovação existente |
| CRM | Conversão de Lead qualificado para Opportunity, preservando origem, parceiro, território e responsável |
| Pipeline | Etapas `new → qualified → contact → diagnosis → demo → proposal → negotiation → won/lost`, com validação e histórico imutável |
| Atividades | Ligação, WhatsApp, e-mail, reunião, visita, demonstração e observação, incluindo resultado e próxima ação |
| Propostas | Emissão idempotente, versões sucessivas, itens, snapshot, validade, condições, descontos e substituição rastreável |
| Aprovação comercial | Desconto fora da alçada cria solicitação; decisão registra responsável, justificativa e contexto antes/depois |
| Won/Lost | Ganho preserva produto, plano, política, implantação, mensalidade, parceiro e origem; perda exige motivo estruturado e admite concorrente/notas |
| Link/QR | Token público opaco por parceiro, canal e campanha para preservar a atribuição de entrada, sem dados sensíveis |
| Segurança | 14 permissões granulares, RLS multiempresa e por carteira, auditoria e idempotência sobre operações críticas |

## 3. Estruturas de dados

### Tabelas

- Catálogo: `products`, `plans`, `price_policies`.
- CRM: `leads`, `lead_duplicate_flags`, `opportunities`, `opportunity_stage_events`.
- Proteção e atribuição: `lead_protections`, `lead_protection_events`, `lead_conflicts`, `partner_referral_links`.
- Operação comercial: `commercial_activities`, `commercial_proposals`, `proposal_items`.
- Fundação reutilizada: `companies`, `partners`, `territories`, `permissions`, `role_permissions`, `approval_requests`, `audit_events`, `idempotency_keys` e sequências seguras.

### RPCs e funções principais

- Leads: `find_lead_duplicates`, `create_lead`, `assign_lead`.
- Proteção: `protect_lead`, `release_lead_protection`, `transfer_lead_protection`, `expire_lead_protections`.
- Conflitos: `open_lead_conflict`, `resolve_lead_conflict`.
- Oportunidades: `convert_lead_to_opportunity`, `advance_opportunity_stage`, `close_opportunity_won`, `close_opportunity_lost`, `opportunity_transition_allowed`.
- Propostas: `issue_proposal`, `decide_proposal_discount`.
- Gatilhos auxiliares: imutabilidade de política, histórico de proteção, guarda e histórico de pipeline, atualização pela atividade, timestamps e auditoria genérica.

## 4. Segurança, RLS e auditoria

- As tabelas da Fase 3 têm RLS habilitada; a visibilidade considera empresa, permissões, responsável e carteira do parceiro.
- Nenhum mecanismo paralelo de autenticação, autorização, auditoria, idempotência, sequência ou aprovação foi criado.
- Foram adicionadas as permissões `lead.read`, `lead.create`, `lead.manage`, `lead.assign`, `lead.protection.manage`, `opportunity.read`, `opportunity.manage`, `activity.create`, `proposal.read`, `proposal.create`, `proposal.approve`, `product.read`, `product.manage` e `price_policy.manage`.
- Eventos de etapa, atividades, itens de proposta e histórico de proteção são imutáveis na superfície operacional.
- Criação e atribuição de Lead, proteção, transferência, conflito, conversão, pipeline, propostas, descontos e Won/Lost deixam trilha direta ou por gatilho em `audit_events`.
- Operações críticas usam a fundação idempotente: criação de Lead, proteção/transferência, abertura de conflito, conversão, emissão de proposta e encerramento Won.
- O linter mantém 30 avisos de funções `SECURITY DEFINER` executáveis por `authenticated`. O desenho é intencional e segue o padrão homologado: RPCs expostas revogam `PUBLIC`/`anon`, validam autenticação, empresa e permissão internamente; funções exclusivas de gatilho têm execução revogada para usuários da aplicação.

## 5. Superfície da aplicação

- `/leads` — tela mobile-first com cadastro curto, deduplicação, ações rápidas, atribuição, proteção, transferência, conflito e conversão.
- `/oportunidades` — pipeline, histórico de etapas, atividades, propostas versionadas, aprovação de desconto e Won/Lost.
- `/catalogo` — produtos, planos e políticas de preço versionadas.
- `src/lib/crm.functions.ts` — funções server-side autenticadas.
- `src/hooks/use-crm.ts` — consultas e cache React Query.
- `src/components/app-shell.tsx` — navegação da Fase 3.
- Metadados SEO próprios foram configurados nas novas rotas.

## 6. Testes e evidências

Execução final conjunta contra o backend real, com fixtures segregadas e limpeza:

| Suíte | Casos | Resultado |
| --- | ---: | --- |
| `tests/fase3/fase3.test.ts` | 31 | 31 aprovados |
| `tests/fase2/fase2.test.ts` | 35 | 35 aprovados |
| `tests/fase1/fase1.test.ts` | 43 | 43 aprovados |
| `tests/fase1/concorrencia.test.ts` | 1 | 1 aprovado |
| **Total** | **110** | **110 aprovados** |

A regressão homologada das Fases 1 e 2 totalizou **79/79 PASS**. A suíte nova da Fase 3 totalizou **31/31 PASS**. O teste de concorrência da Fase 1 continuou validando 20 chamadas simultâneas com 20 números únicos e contíguos. O build automatizado encerrou com **build OK**.

### Cobertura específica da Fase 3

- Produtos, planos, política versionada, imutabilidade e RBAC negativo.
- Criação, origem, idempotência, deduplicação não bloqueante e isolamento multiempresa/entre parceiros.
- Proteção exclusiva, bloqueio concorrente, conflito, aprovação, histórico imutável e expiração.
- Qualificação e conversão Lead → Opportunity com atribuição preservada.
- Pipeline válido/inválido, histórico, atividades e próxima ação.
- Propostas com snapshot, versionamento, desconto dentro e fora da alçada e decisão justificada.
- Won idempotente e preservação comercial; Lost com motivo estruturado.
- Auditoria de operações críticas e negações por falta de permissão.

## 7. Defeitos encontrados e corrigidos

| ID | Defeito | Correção |
| --- | --- | --- |
| F3-BUG-001 | `resolve_lead_conflict` atribuía texto a `lead_protection_status`, causando PostgreSQL `42804` | Migração corretiva com conversão explícita para o enum e validação multiempresa do parceiro vencedor |
| F3-BUG-002 | Teste de conversão esperava o parceiro anterior após o próprio cenário ter decidido o conflito para outro parceiro | Expectativa alinhada à transferência deliberada, confirmando que a oportunidade preserva a atribuição vigente no momento da conversão |
| F3-BUG-003 | Retornos de RPC e argumentos opcionais não atendiam à serialização estrita das Server Functions | Estruturas serializáveis explícitas e omissão de argumentos opcionais ausentes |
| F3-BUG-004 | Formulário de atividades enviava `undefined` em campos anuláveis e opções perdiam tipos literais | Normalização para `null` e listas tipadas |

## 8. Riscos e débitos conhecidos

1. A busca normalizada com `regexp_replace` em documento e telefone não é sargável; volume elevado poderá exigir colunas normalizadas/indexadas.
2. `find_lead_duplicates` aceita `lead.create` para viabilizar o alerta pré-cadastro. A resposta é limitada ao mesmo tenant, mas amplia a descoberta de possíveis cadastros para esse perfil.
3. A expiração está implementada como rotina segura e também ocorre antes de nova proteção; agendamento automático periódico não foi incluído.
4. O pipeline aceita avanço, Won e Lost, mas não retrocesso. Uma futura configuração administrativa de etapas deve preservar a mesma trilha histórica.
5. O QR visual não é renderizado nesta fase; o token/link opaco e a atribuição de origem estão implementados.
6. Captação automática, atribuição multi-touch e programa completo Indique e Ganhe permanecem fora do escopo.

## 9. Escopo bloqueado

Não foram implementados cálculo de comissão, recorrência, fechamento financeiro, payout, integração bancária, implantação técnica, capacidade técnica, suporte, Health Score, churn, OEC, incentivos internos, programa Indique e Ganhe completo, dashboards avançados, Score Network operacional, IA ou modelos preditivos.

A Fase 3 não é declarada homologada por este relatório; a decisão cabe à homologação formal. A Fase 4 permanece bloqueada, especialmente qualquer implementação financeira, de comissão ou payout.
