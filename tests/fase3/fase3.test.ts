/** PA-F3 — CRM, Leads, Produtos e Política Comercial. */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { addMembership, admin, anon, cleanup, createCompany, createUser, grantRole, runId, type TestUser } from "../fase1/helpers";

const run = runId(); const a = admin();
let companyA="", companyB="", product="", plan="", policy="", partnerA="", partnerB="", lead="", opportunity="";
let adminA:TestUser, adminB:TestUser, memberA:TestUser, partnerUserA:TestUser, partnerUserB:TestUser;
const rpc = (x: unknown) => x as Record<string, unknown>;

beforeAll(async()=>{
  companyA=await createCompany(a,`F3 Empresa A ${run}`); companyB=await createCompany(a,`F3 Empresa B ${run}`);
  adminA=await createUser(a,"f3adminA",run); adminB=await createUser(a,"f3adminB",run); memberA=await createUser(a,"f3member",run); partnerUserA=await createUser(a,"f3partnerA",run); partnerUserB=await createUser(a,"f3partnerB",run);
  for(const u of [adminA,memberA,partnerUserA,partnerUserB]) await addMembership(a,u.id,companyA); await addMembership(a,adminB.id,companyB);
  await grantRole(a,{userId:adminA.id,roleCode:"company_admin",companyId:companyA}); await grantRole(a,{userId:adminB.id,roleCode:"company_admin",companyId:companyB}); await grantRole(a,{userId:memberA.id,roleCode:"member",companyId:companyA});
  const p1=await a.from("partners").insert({company_id:companyA,code:`P-A-${run}`,display_name:"Parceiro A",user_id:partnerUserA.id,status:"active"}).select("id").single();
  const p2=await a.from("partners").insert({company_id:companyA,code:`P-B-${run}`,display_name:"Parceiro B",user_id:partnerUserB.id,status:"active"}).select("id").single(); partnerA=p1.data!.id; partnerB=p2.data!.id;
},120000);

afterAll(async()=>{
  for(const c of [companyA,companyB]){
    for(const t of ["proposal_items","commercial_proposals","commercial_activities","opportunity_stage_events","opportunities","lead_conflicts","lead_protection_events","lead_protections","lead_duplicate_flags","partner_referral_links","leads","price_policies","plans","products"]) await a.from(t).delete().eq("company_id",c);
    await a.from("partners").delete().eq("company_id",c);
  }
  await cleanup(a,[companyA,companyB],[adminA.id,adminB.id,memberA.id,partnerUserA.id,partnerUserB.id]);
},120000);

describe.sequential("F3-CAT — Produtos, planos e preço",()=>{
  it("F3-CAT-001 cria produto e plano separados",async()=>{const p=await adminA.db.from("products").insert({company_id:companyA,code:`PROD-${run}`,name:"IGA Gestão"}).select("id").single();expect(p.error).toBeNull();product=p.data!.id;const pl=await adminA.db.from("plans").insert({company_id:companyA,product_id:product,code:`PLAN-${run}`,name:"Profissional"}).select("id").single();expect(pl.error).toBeNull();plan=pl.data!.id;});
  it("F3-CAT-002 cria política de preço versionada",async()=>{const x=await adminA.db.from("price_policies").insert({company_id:companyA,product_id:product,plan_id:plan,version:1,name:"Tabela padrão",setup_price:1000,monthly_price:500,max_discount_percent:10,approval_threshold_percent:5}).select("id,version").single();expect(x.error).toBeNull();expect(x.data?.version).toBe(1);policy=x.data!.id;});
  it("F3-CAT-003 versão publicada é imutável",async()=>{const x=await adminA.db.from("price_policies").update({monthly_price:1}).eq("id",policy);expect(x.error).not.toBeNull();});
  it("F3-CAT-004 membro sem permissão não cria produto",async()=>{const x=await memberA.db.from("products").insert({company_id:companyA,code:`NO-${run}`,name:"Negado"});expect(x.error).not.toBeNull();});
  it("F3-CAT-005 isolamento multiempresa oculta catálogo",async()=>{const x=await adminB.db.from("products").select("id").eq("id",product);expect(x.data??[]).toHaveLength(0);});
});

describe.sequential("F3-LEAD — Lead, deduplicação e carteira",()=>{
  it("F3-LEAD-001 anônimo não executa criação",async()=>{const x=await anon().rpc("create_lead",{_company_id:companyA,_payload:{company_name:"Anônimo"},_idempotency_key:`anon-${run}`});expect(x.error).not.toBeNull();});
  it("F3-LEAD-002 criação preserva origem e responsável",async()=>{const x=await adminA.db.rpc("create_lead",{_company_id:companyA,_payload:{company_name:"Cliente Alfa",document:`123${run}`,email:`alfa.${run}@test.local`,phone:"11999998888",city:"São Paulo",source:"indicação",channel:"link",campaign:"F3",partner_id:partnerA},_idempotency_key:`lead-${run}`});expect(x.error).toBeNull();lead=rpc(x.data).lead_id as string;const r=await adminA.db.from("leads").select("source,channel,campaign,partner_id,owner_id").eq("id",lead).single();expect(r.data).toMatchObject({source:"indicação",channel:"link",campaign:"F3",partner_id:partnerA,owner_id:adminA.id});});
  it("F3-LEAD-003 criação é idempotente",async()=>{const x=await adminA.db.rpc("create_lead",{_company_id:companyA,_payload:{company_name:"Cliente Alfa",document:`123${run}`,email:`alfa.${run}@test.local`,phone:"11999998888",city:"São Paulo",source:"indicação",channel:"link",campaign:"F3",partner_id:partnerA},_idempotency_key:`lead-${run}`});expect(rpc(x.data).lead_id).toBe(lead);const c=await a.from("leads").select("id",{count:"exact",head:true}).eq("id",lead);expect(c.count).toBe(1);});
  it("F3-LEAD-004 duplicidade é apenas sinalizada",async()=>{const x=await adminA.db.rpc("create_lead",{_company_id:companyA,_payload:{company_name:"Cliente Alfa Filial",document:`123${run}`,email:`alfa.${run}@test.local`,city:"São Paulo"},_idempotency_key:`dup-${run}`});expect(x.error).toBeNull();const id=rpc(x.data).lead_id as string;const f=await a.from("lead_duplicate_flags").select("status,matched_on").eq("lead_id",id);expect(f.data?.length).toBeGreaterThan(0);expect(f.data?.[0]?.status).toBe("open");});
  it("F3-LEAD-005 outra empresa não vê o lead",async()=>{const x=await adminB.db.from("leads").select("id").eq("id",lead);expect(x.data??[]).toHaveLength(0);});
  it("F3-LEAD-006 carteira do parceiro isola outros parceiros",async()=>{const own=await partnerUserA.db.from("leads").select("id").eq("id",lead);const other=await partnerUserB.db.from("leads").select("id").eq("id",lead);expect(own.data).toHaveLength(1);expect(other.data??[]).toHaveLength(0);});
});

describe.sequential("F3-PROT — Proteção e conflitos",()=>{
  let protection="", conflict="";
  it("F3-PROT-001 cria proteção exclusiva com vigência",async()=>{const x=await adminA.db.rpc("protect_lead",{_lead_id:lead,_partner_id:partnerA,_valid_until:new Date(Date.now()+86400000).toISOString(),_reason:"Relacionamento prévio",_origin:"manual",_idempotency_key:`prot-${run}`});expect(x.error).toBeNull();protection=rpc(x.data).protection_id as string;});
  it("F3-PROT-002 outro parceiro não recebe proteção vigente",async()=>{const x=await adminA.db.rpc("protect_lead",{_lead_id:lead,_partner_id:partnerB,_valid_until:new Date(Date.now()+86400000).toISOString(),_reason:"Concorrente",_origin:"manual",_idempotency_key:`prot2-${run}`});expect(rpc(x.data).status).toBe("blocked");});
  it("F3-PROT-003 abre conflito com aprovação e evidência",async()=>{const x=await adminA.db.rpc("open_lead_conflict",{_lead_id:lead,_claimant_partner_id:partnerB,_evidence:{relationship:"anterior",proof:"visita"},_idempotency_key:`conf-${run}`});expect(x.error).toBeNull();conflict=rpc(x.data).conflict_id as string;expect(rpc(x.data).approval_request_id).toBeTruthy();const c=await a.from("lead_conflicts").select("status,evidence").eq("id",conflict).single();expect(c.data?.status).toBe("open");});
  it("F3-PROT-004 resolução exige alçada e registra decisão",async()=>{const x=await adminA.db.rpc("resolve_lead_conflict",{_conflict_id:conflict,_awarded_partner_id:partnerB,_resolution:"Evidência documental validada"});expect(x.error).toBeNull();const c=await a.from("lead_conflicts").select("status,awarded_partner_id,decided_by").eq("id",conflict).single();expect(c.data).toMatchObject({status:"resolved",awarded_partner_id:partnerB,decided_by:adminA.id});});
  it("F3-PROT-005 histórico de proteção é imutável",async()=>{const e=await a.from("lead_protection_events").select("id").eq("protection_id",protection).limit(1).single();const x=await a.from("lead_protection_events").update({reason:"alterado"}).eq("id",e.data!.id);expect(x.error).not.toBeNull();});
});

describe.sequential("F3-OPP — Pipeline, atividades e propostas",()=>{
  let proposalIn="", proposalOut="";
  it("F3-OPP-001 conversão exige qualificação",async()=>{const x=await adminA.db.rpc("convert_lead_to_opportunity",{_lead_id:lead,_idempotency_key:`opp-early-${run}`});expect(x.error).not.toBeNull();await adminA.db.from("leads").update({status:"qualified"}).eq("id",lead);});
  it("F3-OPP-002 converte Lead e preserva atribuição",async()=>{const x=await adminA.db.rpc("convert_lead_to_opportunity",{_lead_id:lead,_idempotency_key:`opp-${run}`});expect(x.error).toBeNull();opportunity=rpc(x.data).opportunity_id as string;const o=await a.from("opportunities").select("partner_id,source,channel,campaign").eq("id",opportunity).single();expect(o.data).toMatchObject({partner_id:partnerB,source:"indicação",channel:"link",campaign:"F3"});});
  it("F3-OPP-003 conversão é idempotente",async()=>{const x=await adminA.db.rpc("convert_lead_to_opportunity",{_lead_id:lead,_idempotency_key:`opp-${run}`});expect(rpc(x.data).opportunity_id).toBe(opportunity);});
  it("F3-OPP-004 pipeline bloqueia salto inválido",async()=>{const x=await adminA.db.from("opportunities").update({stage:"won"}).eq("id",opportunity);expect(x.error).not.toBeNull();});
  it("F3-OPP-005 pipeline registra transições",async()=>{for(const stage of ["qualified","contact","diagnosis","demo"]){const x=await adminA.db.rpc("advance_opportunity_stage",{_opportunity_id:opportunity,_stage:stage});expect(x.error).toBeNull();}const e=await a.from("opportunity_stage_events").select("id").eq("opportunity_id",opportunity);expect(e.data?.length).toBeGreaterThanOrEqual(5);});
  it("F3-OPP-006 atividade registra ator e próxima ação",async()=>{const x=await adminA.db.from("commercial_activities").insert({company_id:companyA,lead_id:lead,opportunity_id:opportunity,partner_id:partnerB,type:"visit",notes:"Diagnóstico",next_action:"Enviar proposta",actor_id:adminA.id}).select("actor_id,next_action").single();expect(x.data).toMatchObject({actor_id:adminA.id,next_action:"Enviar proposta"});});
  it("F3-PROP-001 desconto dentro da alçada aprova automaticamente",async()=>{const x=await adminA.db.rpc("issue_proposal",{_opportunity_id:opportunity,_items:[{price_policy_id:policy,quantity:1,discount_percent:4}],_idempotency_key:`pin-${run}`});expect(x.error).toBeNull();proposalIn=rpc(x.data).proposal_id as string;expect(rpc(x.data).requires_approval).toBe(false);});
  it("F3-PROP-002 nova versão preserva snapshot e exige aprovação fora da alçada",async()=>{const x=await adminA.db.rpc("issue_proposal",{_opportunity_id:opportunity,_items:[{price_policy_id:policy,quantity:1,discount_percent:8}],_idempotency_key:`pout-${run}`});expect(x.error).toBeNull();proposalOut=rpc(x.data).proposal_id as string;expect(rpc(x.data).requires_approval).toBe(true);expect(rpc(x.data).version).toBe(2);const old=await a.from("proposal_items").select("list_monthly_price,price_policy_version").eq("proposal_id",proposalIn).single();expect(old.data).toMatchObject({list_monthly_price:500,price_policy_version:1});});
  it("F3-PROP-003 emissão é idempotente",async()=>{const x=await adminA.db.rpc("issue_proposal",{_opportunity_id:opportunity,_items:[{price_policy_id:policy,quantity:1,discount_percent:8}],_idempotency_key:`pout-${run}`});expect(rpc(x.data).proposal_id).toBe(proposalOut);});
  it("F3-PROP-004 aprovação registra responsável e justificativa",async()=>{const x=await adminA.db.rpc("decide_proposal_discount",{_proposal_id:proposalOut,_approve:true,_reason:"Exceção estratégica aprovada"});expect(x.error).toBeNull();const p=await a.from("commercial_proposals").select("status,approved_by,decision_reason").eq("id",proposalOut).single();expect(p.data).toMatchObject({status:"approved",approved_by:adminA.id,decision_reason:"Exceção estratégica aprovada"});});
  it("F3-PROP-005 Won preserva produto, plano, preço e valores",async()=>{const x=await adminA.db.rpc("close_opportunity_won",{_opportunity_id:opportunity,_proposal_id:proposalOut,_idempotency_key:`won-${run}`});expect(x.error).toBeNull();const o=await a.from("opportunities").select("stage,won_product_id,won_plan_id,won_price_policy_id,won_monthly_amount").eq("id",opportunity).single();expect(o.data).toMatchObject({stage:"won",won_product_id:product,won_plan_id:plan,won_price_policy_id:policy,won_monthly_amount:460});});
  it("F3-AUD-001 operações críticas deixam trilha",async()=>{const x=await a.from("audit_events").select("action").eq("company_id",companyA).in("action",["lead.convert","opportunity.won","proposal.discount.approve"]);const actions=(x.data??[]).map(v=>v.action);expect(actions).toContain("lead.convert");expect(actions).toContain("opportunity.won");expect(actions).toContain("proposal.discount.approve");});
});
