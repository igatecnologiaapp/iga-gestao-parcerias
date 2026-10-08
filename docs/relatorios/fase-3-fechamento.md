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

## 10. Saneamento pós-homologação técnica e reorganização da navegação

### Configuração de publicação

O incidente anterior ocorreu quando o build deixou de receber as configurações públicas do cliente. A configuração instalada de `@lovable.dev/vite-tanstack-config` executa `loadEnv(mode, process.cwd(), "VITE_")` e injeta essas variáveis como `import.meta.env.*` no bundle. Este mecanismo foi confirmado no pacote instalado, não presumido.

O `.env` gerado e atualmente versionado foi preservado, sem editar ou remover suas configurações. Contém somente URL, identificador e chave publishable públicos, nos nomes de cliente e servidor. Verificação automatizada confirmou somente esses seis nomes permitidos e ausência de marcadores de service_role, sb_secret e chave privada. `.env.example` preservado. Segredos reais devem continuar no armazenamento protegido, nunca nesse arquivo. Não se afirma que todas as alternativas de injeção da plataforma exigem versionamento: preservou-se o método comprovadamente funcional deste projeto, sem arriscar nova interrupção. Vite permanece na linha 7.x.

### Navegação antes/depois

Antes: onze links planos; celular com faixa horizontal de links.

Depois: categorias expansíveis com no máximo dois níveis e menu lateral recolhível no celular:

- Início: Dashboard (nome do painel existente, sem criar dashboard novo).
- Parceiros: Candidatos; Parceiros; Onboarding; Treinamentos e certificações; Acompanhamento 90 dias; Territórios.
- Comercial: Leads; Proteção e conflitos; Oportunidades e pipeline; Atividades comerciais; Propostas.
- Produtos e preços: Produtos, planos e preços, na tela existente.
- Governança: Políticas versionadas; Auditoria. Políticas são mostradas somente com `policy.manage`, evitando encaminhar usuários operacionais às ferramentas técnicas existentes nessa tela. Não foram inventadas telas de aceites ou aprovações.
- Administração: Empresas e unidades; Usuários, papéis e permissões.
- Menu da conta: identidade já cadastrada, Alterar senha e Sair. Não foi criada nova tela de perfil.

Abas de detalhe são controladas pelo parâmetro `tab`; acessar um submenu seleciona a aba ao abrir o registro. Sem um registro selecionado, permanece a listagem existente, não uma tela global fictícia. Dados para pagamento continuam no detalhe do parceiro, com mascaramento, RBAC e auditoria existentes. Nenhum menu Financeiro foi criado.

Visibilidade considera as permissões da primeira empresa ativa, a mesma usada pelas páginas; não combina permissões de outras empresas. Categorias vazias são ocultadas. Sem vínculo, a conta usada no teste real vê apenas Início. Não há um papel RBAC específico chamado partner no esquema homologado; a carteira continua protegida pelas políticas existentes. Não foi atribuído papel nem ampliado acesso de qualquer conta para viabilizar testes.

### Arquivos e URLs

Alterações desta complementação: `src/components/app-shell.tsx`, `src/routes/_authenticated/leads.tsx`, `src/routes/_authenticated/oportunidades.tsx`, `src/routes/_authenticated/parceiros.tsx`, `AGENTS.md`, `roadmap.md` e este relatório. A primeira parte da reorganização foi registrada no commit-base abaixo. Nenhuma URL foi renomeada ou removida; apenas `tab` foi acrescentado às três rotas existentes. Nenhuma migração, RLS, regra comercial ou função server-side alterada.

### Evidências e pendências

- Build automatizado: **build OK** após os ajustes.
- Navegador: acesso autenticado via sessão autorizada, refresh, carregamento das dez URLs de módulos, logout e redirecionamento de URL protegida após logout passaram; nenhum erro JavaScript observado.
- Desktop 1280×1800 e celular 390×844: menu e gaveta móvel conferidos por screenshots.
- Página publicada `/auth`: botão Entrar renderizado, sem erro de variáveis ou tela em branco.
- Login por senha não foi testado: nenhuma senha real foi solicitada; foi usada sessão autorizada. Validação de perfis administrativos/parceiros e dados de detalhe permanece limitada pela ausência de vínculos/papéis na conta disponível.
- Os **110 testes foram invocados**, mas os quatro arquivos falharam na preparação: `createCompany: new row violates row-level security policy for table "companies"`. Portanto **110 casos pulados, não 110 aprovados** nesta execução. Houve também erro secundário de limpeza por fixture não criada. Não se enfraqueceu RLS nem se alteraram as suítes homologadas para mascarar essa falha. A última execução homologada 110/110 permanece somente evidência histórica, não resultado desta entrega.
- Necessário clicar em **Publicar → Atualizar** para levar os menus à versão pública. A versão pública atual foi verificada; a reorganização nova ainda não foi republicada nem homologada.
- Commit-base desta complementação: `eb057e17df0d761aeb79223223d467ad863b7afe`. O commit final será gerado pela plataforma após esta resposta e não estava disponível para verificação; não foi inventado um hash.

**Conclusão:** alterações de navegação entregues para validação, com regressão e homologação por perfis ainda pendentes. Fase 4 bloqueada; nenhuma funcionalidade financeira adicional implementada. Desenvolvimento interrompido aguardando a IGA Tecnologia.
