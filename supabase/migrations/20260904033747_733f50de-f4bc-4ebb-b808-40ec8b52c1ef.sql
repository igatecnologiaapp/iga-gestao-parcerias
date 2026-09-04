-- ============ ENUMS ============
CREATE TYPE public.opportunity_stage AS ENUM
  ('new','qualified','contact','diagnosis','demo','proposal','negotiation','won','lost');
CREATE TYPE public.activity_type AS ENUM
  ('call','whatsapp','email','meeting','visit','demo','note');
CREATE TYPE public.proposal_status AS ENUM
  ('draft','pending_approval','approved','rejected','sent','accepted','declined','expired','superseded','cancelled');
CREATE TYPE public.loss_reason AS ENUM
  ('price','timing','competitor','no_fit','no_budget','no_response','internal','other');

-- ============ OPORTUNIDADES ============
CREATE TABLE public.opportunities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id),
  lead_id uuid NOT NULL REFERENCES public.leads(id),
  code text,
  name text NOT NULL,
  partner_id uuid REFERENCES public.partners(id),
  territory_id uuid REFERENCES public.territories(id),
  owner_id uuid,
  stage public.opportunity_stage NOT NULL DEFAULT 'new',
  stage_changed_at timestamptz NOT NULL DEFAULT now(),
  source text,
  channel text,
  campaign text,
  referral_code text,
  expected_setup_amount numeric(14,2),
  expected_monthly_amount numeric(14,2),
  expected_close_date date,
  won_product_id uuid REFERENCES public.products(id),
  won_plan_id uuid REFERENCES public.plans(id),
  won_price_policy_id uuid REFERENCES public.price_policies(id),
  won_proposal_id uuid,
  won_setup_amount numeric(14,2),
  won_monthly_amount numeric(14,2),
  lost_reason public.loss_reason,
  lost_competitor text,
  lost_notes text,
  closed_at timestamptz,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (lead_id)
);
CREATE INDEX idx_opp_company_stage ON public.opportunities(company_id, stage);
CREATE INDEX idx_opp_partner ON public.opportunities(partner_id);
GRANT SELECT, INSERT, UPDATE ON public.opportunities TO authenticated;
GRANT ALL ON public.opportunities TO service_role;
ALTER TABLE public.opportunities ENABLE ROW LEVEL SECURITY;
CREATE POLICY opp_select ON public.opportunities FOR SELECT TO authenticated
  USING (public.has_permission(auth.uid(), company_id, 'opportunity.read')
         OR partner_id IN (SELECT public.my_partner_ids())
         OR owner_id = auth.uid());
CREATE POLICY opp_insert ON public.opportunities FOR INSERT TO authenticated
  WITH CHECK (public.has_permission(auth.uid(), company_id, 'opportunity.manage'));
CREATE POLICY opp_update ON public.opportunities FOR UPDATE TO authenticated
  USING (public.has_permission(auth.uid(), company_id, 'opportunity.manage')
         OR partner_id IN (SELECT public.my_partner_ids()))
  WITH CHECK (public.has_permission(auth.uid(), company_id, 'opportunity.manage')
              OR partner_id IN (SELECT public.my_partner_ids()));

CREATE TABLE public.opportunity_stage_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id),
  opportunity_id uuid NOT NULL REFERENCES public.opportunities(id),
  from_stage public.opportunity_stage,
  to_stage public.opportunity_stage NOT NULL,
  reason text,
  actor_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.opportunity_stage_events TO authenticated;
GRANT ALL ON public.opportunity_stage_events TO service_role;
ALTER TABLE public.opportunity_stage_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY ose_select ON public.opportunity_stage_events FOR SELECT TO authenticated
  USING (public.has_permission(auth.uid(), company_id, 'opportunity.read')
         OR opportunity_id IN (SELECT o.id FROM public.opportunities o
                               WHERE o.partner_id IN (SELECT public.my_partner_ids())));
CREATE TRIGGER t_ose_immutable BEFORE UPDATE OR DELETE ON public.opportunity_stage_events
  FOR EACH ROW EXECUTE FUNCTION public.tg_acceptance_immutable();

CREATE OR REPLACE FUNCTION public.opportunity_transition_allowed(_from public.opportunity_stage, _to public.opportunity_stage)
RETURNS boolean LANGUAGE sql IMMUTABLE SET search_path = public AS $$
  SELECT CASE
    WHEN _from IN ('won','lost') THEN false
    WHEN _to = 'lost' THEN true
    WHEN _to = 'won' THEN _from IN ('proposal','negotiation')
    WHEN _from = _to THEN false
    ELSE array_position(ARRAY['new','qualified','contact','diagnosis','demo','proposal','negotiation']::text[], _to::text)
       > array_position(ARRAY['new','qualified','contact','diagnosis','demo','proposal','negotiation']::text[], _from::text)
  END;
$$;

CREATE OR REPLACE FUNCTION public.tg_opportunity_stage_guard()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.opportunity_stage_events(company_id, opportunity_id, from_stage, to_stage, actor_id)
    VALUES (NEW.company_id, NEW.id, NULL, NEW.stage, auth.uid());
    RETURN NEW;
  END IF;
  IF NEW.stage IS DISTINCT FROM OLD.stage THEN
    IF NOT public.opportunity_transition_allowed(OLD.stage, NEW.stage) THEN
      RAISE EXCEPTION 'Transição de pipeline inválida: % -> %', OLD.stage, NEW.stage;
    END IF;
    NEW.stage_changed_at := now();
    IF NEW.stage IN ('won','lost') AND NEW.closed_at IS NULL THEN NEW.closed_at := now(); END IF;
    INSERT INTO public.opportunity_stage_events(company_id, opportunity_id, from_stage, to_stage, reason, actor_id)
    VALUES (NEW.company_id, NEW.id, OLD.stage, NEW.stage, NEW.metadata->>'stage_reason', auth.uid());
  END IF;
  RETURN NEW;
END; $$;
CREATE TRIGGER t_opp_stage_init AFTER INSERT ON public.opportunities
  FOR EACH ROW EXECUTE FUNCTION public.tg_opportunity_stage_guard();
CREATE TRIGGER t_opp_stage_guard BEFORE UPDATE ON public.opportunities
  FOR EACH ROW EXECUTE FUNCTION public.tg_opportunity_stage_guard();

-- ============ ATIVIDADES COMERCIAIS ============
CREATE TABLE public.commercial_activities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id),
  lead_id uuid REFERENCES public.leads(id),
  opportunity_id uuid REFERENCES public.opportunities(id),
  partner_id uuid REFERENCES public.partners(id),
  type public.activity_type NOT NULL,
  subject text,
  outcome text,
  notes text,
  next_action text,
  next_action_at timestamptz,
  occurred_at timestamptz NOT NULL DEFAULT now(),
  actor_id uuid NOT NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_activity_lead ON public.commercial_activities(lead_id, occurred_at DESC);
CREATE INDEX idx_activity_opp ON public.commercial_activities(opportunity_id, occurred_at DESC);
GRANT SELECT, INSERT ON public.commercial_activities TO authenticated;
GRANT ALL ON public.commercial_activities TO service_role;
ALTER TABLE public.commercial_activities ENABLE ROW LEVEL SECURITY;
CREATE POLICY act_select ON public.commercial_activities FOR SELECT TO authenticated
  USING (public.has_permission(auth.uid(), company_id, 'lead.read')
         OR public.has_permission(auth.uid(), company_id, 'opportunity.read')
         OR partner_id IN (SELECT public.my_partner_ids())
         OR actor_id = auth.uid());
CREATE POLICY act_insert ON public.commercial_activities FOR INSERT TO authenticated
  WITH CHECK (actor_id = auth.uid()
              AND (public.has_permission(auth.uid(), company_id, 'activity.create')
                   OR partner_id IN (SELECT public.my_partner_ids())));
CREATE TRIGGER t_act_immutable BEFORE UPDATE OR DELETE ON public.commercial_activities
  FOR EACH ROW EXECUTE FUNCTION public.tg_acceptance_immutable();

CREATE OR REPLACE FUNCTION public.tg_activity_touch_lead()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.lead_id IS NOT NULL THEN
    UPDATE public.leads SET last_activity_at = NEW.occurred_at WHERE id = NEW.lead_id;
  END IF;
  RETURN NEW;
END; $$;
CREATE TRIGGER t_act_touch AFTER INSERT ON public.commercial_activities
  FOR EACH ROW EXECUTE FUNCTION public.tg_activity_touch_lead();

-- ============ PROPOSTAS ============
CREATE TABLE public.commercial_proposals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id),
  lead_id uuid NOT NULL REFERENCES public.leads(id),
  opportunity_id uuid NOT NULL REFERENCES public.opportunities(id),
  partner_id uuid REFERENCES public.partners(id),
  code text,
  version integer NOT NULL DEFAULT 1,
  supersedes_id uuid REFERENCES public.commercial_proposals(id),
  status public.proposal_status NOT NULL DEFAULT 'draft',
  currency text NOT NULL DEFAULT 'BRL',
  total_setup_amount numeric(14,2) NOT NULL DEFAULT 0,
  total_monthly_amount numeric(14,2) NOT NULL DEFAULT 0,
  max_discount_percent numeric(5,2) NOT NULL DEFAULT 0,
  requires_approval boolean NOT NULL DEFAULT false,
  approval_request_id uuid REFERENCES public.approval_requests(id),
  approved_by uuid,
  approved_at timestamptz,
  decision_reason text,
  conditions text,
  valid_until timestamptz,
  issued_by uuid,
  issued_at timestamptz NOT NULL DEFAULT now(),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (opportunity_id, version)
);
GRANT SELECT, INSERT, UPDATE ON public.commercial_proposals TO authenticated;
GRANT ALL ON public.commercial_proposals TO service_role;
ALTER TABLE public.commercial_proposals ENABLE ROW LEVEL SECURITY;
CREATE POLICY prop_select ON public.commercial_proposals FOR SELECT TO authenticated
  USING (public.has_permission(auth.uid(), company_id, 'proposal.read')
         OR partner_id IN (SELECT public.my_partner_ids())
         OR issued_by = auth.uid());
CREATE POLICY prop_insert ON public.commercial_proposals FOR INSERT TO authenticated
  WITH CHECK (public.has_permission(auth.uid(), company_id, 'proposal.create'));
CREATE POLICY prop_update ON public.commercial_proposals FOR UPDATE TO authenticated
  USING (public.has_permission(auth.uid(), company_id, 'proposal.approve')
         OR (public.has_permission(auth.uid(), company_id, 'proposal.create') AND status IN ('draft','approved','sent')))
  WITH CHECK (public.has_permission(auth.uid(), company_id, 'proposal.approve')
              OR public.has_permission(auth.uid(), company_id, 'proposal.create'));

CREATE TABLE public.proposal_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id),
  proposal_id uuid NOT NULL REFERENCES public.commercial_proposals(id),
  product_id uuid NOT NULL REFERENCES public.products(id),
  plan_id uuid NOT NULL REFERENCES public.plans(id),
  price_policy_id uuid NOT NULL REFERENCES public.price_policies(id),
  price_policy_version integer NOT NULL,
  quantity integer NOT NULL DEFAULT 1,
  list_setup_price numeric(14,2) NOT NULL,
  list_monthly_price numeric(14,2) NOT NULL,
  discount_percent numeric(5,2) NOT NULL DEFAULT 0,
  final_setup_price numeric(14,2) NOT NULL,
  final_monthly_price numeric(14,2) NOT NULL,
  billing_period public.billing_period NOT NULL,
  within_policy boolean NOT NULL DEFAULT true,
  snapshot jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.proposal_items TO authenticated;
GRANT ALL ON public.proposal_items TO service_role;
ALTER TABLE public.proposal_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY pi_select ON public.proposal_items FOR SELECT TO authenticated
  USING (proposal_id IN (SELECT p.id FROM public.commercial_proposals p));
CREATE POLICY pi_insert ON public.proposal_items FOR INSERT TO authenticated
  WITH CHECK (public.has_permission(auth.uid(), company_id, 'proposal.create'));
CREATE TRIGGER t_pi_immutable BEFORE UPDATE OR DELETE ON public.proposal_items
  FOR EACH ROW EXECUTE FUNCTION public.tg_acceptance_immutable();

ALTER TABLE public.opportunities
  ADD CONSTRAINT opportunities_won_proposal_fkey FOREIGN KEY (won_proposal_id)
  REFERENCES public.commercial_proposals(id);

CREATE TRIGGER t_opp_upd BEFORE UPDATE ON public.opportunities FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();
CREATE TRIGGER t_prop_upd BEFORE UPDATE ON public.commercial_proposals FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();
CREATE TRIGGER t_audit_opp AFTER INSERT OR UPDATE OR DELETE ON public.opportunities FOR EACH ROW EXECUTE FUNCTION public.tg_audit_row();
CREATE TRIGGER t_audit_prop AFTER INSERT OR UPDATE OR DELETE ON public.commercial_proposals FOR EACH ROW EXECUTE FUNCTION public.tg_audit_row();
CREATE TRIGGER t_audit_act AFTER INSERT ON public.commercial_activities FOR EACH ROW EXECUTE FUNCTION public.tg_audit_row();

-- ============ RPCs ============

-- Deduplicação (apenas sinaliza)
CREATE OR REPLACE FUNCTION public.find_lead_duplicates(
  _company_id uuid, _document text DEFAULT NULL, _email text DEFAULT NULL,
  _phone text DEFAULT NULL, _company_name text DEFAULT NULL, _city text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE v_res jsonb;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'unauthenticated'; END IF;
  IF NOT (public.has_permission(auth.uid(), _company_id, 'lead.read')
          OR public.has_permission(auth.uid(), _company_id, 'lead.create')
          OR public.has_permission(auth.uid(), _company_id, 'lead.manage')) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  SELECT COALESCE(jsonb_agg(x), '[]'::jsonb) INTO v_res FROM (
    SELECT l.id AS lead_id, l.company_name, l.city, l.status,
           (CASE WHEN _document IS NOT NULL AND l.document IS NOT NULL
                  AND regexp_replace(l.document,'\D','','g') = regexp_replace(_document,'\D','','g') THEN 'document' END) AS m1,
           (CASE WHEN _email IS NOT NULL AND l.email IS NOT NULL AND lower(l.email) = lower(_email) THEN 'email' END) AS m2,
           (CASE WHEN _phone IS NOT NULL AND l.phone IS NOT NULL
                  AND right(regexp_replace(l.phone,'\D','','g'),9) = right(regexp_replace(_phone,'\D','','g'),9) THEN 'phone' END) AS m3,
           (CASE WHEN _company_name IS NOT NULL AND _city IS NOT NULL
                  AND lower(l.company_name) = lower(_company_name) AND lower(COALESCE(l.city,'')) = lower(_city) THEN 'name_city' END) AS m4
    FROM public.leads l
    WHERE l.company_id = _company_id AND l.status <> 'archived'
  ) x WHERE x.m1 IS NOT NULL OR x.m2 IS NOT NULL OR x.m3 IS NOT NULL OR x.m4 IS NOT NULL;
  RETURN v_res;
END; $$;

-- Criação idempotente de Lead + sinalização de duplicidade
CREATE OR REPLACE FUNCTION public.create_lead(_company_id uuid, _payload jsonb, _idempotency_key text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_claim jsonb; v_id uuid; v_code text; v_dups jsonb; d jsonb; v_partner uuid;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'unauthenticated'; END IF;
  IF NOT (public.has_permission(auth.uid(), _company_id, 'lead.create')
          OR public.has_permission(auth.uid(), _company_id, 'lead.manage')) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  v_claim := public.claim_idempotency_key(_company_id, 'lead.create', _idempotency_key, _payload);
  IF v_claim->>'status' = 'conflict' THEN RETURN jsonb_build_object('status','conflict'); END IF;
  IF v_claim->>'status' = 'replayed' THEN RETURN COALESCE(v_claim->'response', jsonb_build_object('status','replayed')); END IF;

  -- origem por link/QR do parceiro (token público, sem dado sensível)
  v_partner := NULLIF(_payload->>'partner_id','')::uuid;
  IF v_partner IS NULL AND COALESCE(_payload->>'referral_code','') <> '' THEN
    SELECT partner_id INTO v_partner FROM public.partner_referral_links
     WHERE company_id = _company_id AND public_token = _payload->>'referral_code' AND status = 'active';
  END IF;

  v_code := public.next_sequence_value(_company_id, 'lead', 'LEAD');

  INSERT INTO public.leads(company_id, unit_id, code, company_name, trade_name, segment, document,
                           contact_name, phone, whatsapp, email, address, district, city, state, postal_code,
                           source, channel, campaign, referral_code, external_id, partner_id, territory_id,
                           owner_id, notes, metadata, created_by)
  VALUES (_company_id, NULLIF(_payload->>'unit_id','')::uuid, v_code,
          _payload->>'company_name', _payload->>'trade_name', _payload->>'segment', _payload->>'document',
          _payload->>'contact_name', _payload->>'phone', _payload->>'whatsapp', _payload->>'email',
          _payload->>'address', _payload->>'district', _payload->>'city', upper(NULLIF(_payload->>'state','')),
          _payload->>'postal_code', _payload->>'source', _payload->>'channel', _payload->>'campaign',
          _payload->>'referral_code', _payload->>'external_id', v_partner,
          NULLIF(_payload->>'territory_id','')::uuid,
          COALESCE(NULLIF(_payload->>'owner_id','')::uuid, auth.uid()),
          _payload->>'notes', COALESCE(_payload->'metadata','{}'::jsonb), auth.uid())
  RETURNING id INTO v_id;

  v_dups := public.find_lead_duplicates(_company_id, _payload->>'document', _payload->>'email',
                                        _payload->>'phone', _payload->>'company_name', _payload->>'city');
  FOR d IN SELECT * FROM jsonb_array_elements(v_dups) LOOP
    IF (d->>'lead_id')::uuid <> v_id THEN
      INSERT INTO public.lead_duplicate_flags(company_id, lead_id, duplicate_of_lead_id, matched_on, score, created_by)
      VALUES (_company_id, v_id, (d->>'lead_id')::uuid,
              ARRAY(SELECT v FROM unnest(ARRAY[d->>'m1', d->>'m2', d->>'m3', d->>'m4']) v WHERE v IS NOT NULL),
              25 * (SELECT count(*) FROM unnest(ARRAY[d->>'m1', d->>'m2', d->>'m3', d->>'m4']) v WHERE v IS NOT NULL),
              auth.uid())
      ON CONFLICT DO NOTHING;
    END IF;
  END LOOP;

  UPDATE public.idempotency_keys
     SET response = jsonb_build_object('status','created','lead_id', v_id, 'code', v_code, 'duplicates', v_dups)
   WHERE operation = 'lead.create' AND key = _idempotency_key;

  RETURN jsonb_build_object('status','created','lead_id', v_id, 'code', v_code, 'duplicates', v_dups);
END; $$;

-- Atribuição de Lead
CREATE OR REPLACE FUNCTION public.assign_lead(_lead_id uuid, _partner_id uuid DEFAULT NULL,
                                              _owner_id uuid DEFAULT NULL, _reason text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_company uuid;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'unauthenticated'; END IF;
  SELECT company_id INTO v_company FROM public.leads WHERE id = _lead_id;
  IF v_company IS NULL THEN RAISE EXCEPTION 'lead não encontrado'; END IF;
  IF NOT (public.has_permission(auth.uid(), v_company, 'lead.assign')
          OR public.has_permission(auth.uid(), v_company, 'lead.manage')) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  IF _partner_id IS NOT NULL AND NOT EXISTS (
      SELECT 1 FROM public.partners WHERE id = _partner_id AND company_id = v_company) THEN
    RAISE EXCEPTION 'parceiro inválido para esta empresa';
  END IF;
  UPDATE public.leads
     SET partner_id = COALESCE(_partner_id, partner_id),
         owner_id = COALESCE(_owner_id, owner_id)
   WHERE id = _lead_id;
  INSERT INTO public.audit_events(actor_id, company_id, action, object_type, object_id, context)
  VALUES (auth.uid(), v_company, 'lead.assign', 'leads', _lead_id::text,
          jsonb_build_object('partner_id', _partner_id, 'owner_id', _owner_id, 'reason', _reason));
  RETURN jsonb_build_object('status','ok','lead_id', _lead_id);
END; $$;

-- Proteção comercial do Lead
CREATE OR REPLACE FUNCTION public.protect_lead(_lead_id uuid, _partner_id uuid, _valid_until timestamptz,
                                               _reason text DEFAULT NULL, _origin text DEFAULT 'manual',
                                               _idempotency_key text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_company uuid; v_claim jsonb; v_id uuid; v_existing public.lead_protections;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'unauthenticated'; END IF;
  SELECT company_id INTO v_company FROM public.leads WHERE id = _lead_id;
  IF v_company IS NULL THEN RAISE EXCEPTION 'lead não encontrado'; END IF;
  IF NOT public.has_permission(auth.uid(), v_company, 'lead.protection.manage') THEN RAISE EXCEPTION 'forbidden'; END IF;
  IF _valid_until IS NULL OR _valid_until <= now() THEN RAISE EXCEPTION 'proteção exige vigência futura'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.partners WHERE id = _partner_id AND company_id = v_company) THEN
    RAISE EXCEPTION 'parceiro inválido para esta empresa';
  END IF;

  v_claim := public.claim_idempotency_key(v_company, 'lead.protect', _idempotency_key,
             jsonb_build_object('lead_id', _lead_id, 'partner_id', _partner_id, 'valid_until', _valid_until));
  IF v_claim->>'status' = 'conflict' THEN RETURN jsonb_build_object('status','conflict'); END IF;
  IF v_claim->>'status' = 'replayed' THEN
    SELECT id INTO v_id FROM public.lead_protections
     WHERE lead_id = _lead_id AND partner_id = _partner_id ORDER BY created_at DESC LIMIT 1;
    RETURN jsonb_build_object('status','replayed','protection_id', v_id);
  END IF;

  -- expira automaticamente proteções vencidas antes de avaliar exclusividade
  UPDATE public.lead_protections SET status = 'expired'
   WHERE lead_id = _lead_id AND status = 'protected' AND valid_until <= now();

  SELECT * INTO v_existing FROM public.lead_protections
   WHERE lead_id = _lead_id AND status = 'protected' LIMIT 1;
  IF v_existing.id IS NOT NULL AND v_existing.partner_id <> _partner_id THEN
    RETURN jsonb_build_object('status','blocked','reason','lead já protegido para outro parceiro',
                              'protection_id', v_existing.id, 'partner_id', v_existing.partner_id);
  END IF;
  IF v_existing.id IS NOT NULL THEN
    RETURN jsonb_build_object('status','replayed','protection_id', v_existing.id);
  END IF;

  INSERT INTO public.lead_protections(company_id, lead_id, partner_id, origin, reason, valid_until, granted_by)
  VALUES (v_company, _lead_id, _partner_id, COALESCE(_origin,'manual'), _reason, _valid_until, auth.uid())
  RETURNING id INTO v_id;

  RETURN jsonb_build_object('status','created','protection_id', v_id);
END; $$;

CREATE OR REPLACE FUNCTION public.release_lead_protection(_protection_id uuid, _reason text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_company uuid;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'unauthenticated'; END IF;
  SELECT company_id INTO v_company FROM public.lead_protections WHERE id = _protection_id;
  IF v_company IS NULL THEN RAISE EXCEPTION 'proteção não encontrada'; END IF;
  IF NOT public.has_permission(auth.uid(), v_company, 'lead.protection.manage') THEN RAISE EXCEPTION 'forbidden'; END IF;
  UPDATE public.lead_protections
     SET status = 'released', released_at = now(), reason = COALESCE(_reason, reason)
   WHERE id = _protection_id AND status IN ('protected','disputed');
  RETURN jsonb_build_object('status','ok','protection_id', _protection_id);
END; $$;

CREATE OR REPLACE FUNCTION public.transfer_lead_protection(_protection_id uuid, _to_partner_id uuid,
                                                           _reason text, _idempotency_key text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v public.lead_protections; v_claim jsonb; v_new uuid;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'unauthenticated'; END IF;
  SELECT * INTO v FROM public.lead_protections WHERE id = _protection_id;
  IF v.id IS NULL THEN RAISE EXCEPTION 'proteção não encontrada'; END IF;
  IF NOT public.has_permission(auth.uid(), v.company_id, 'lead.protection.manage') THEN RAISE EXCEPTION 'forbidden'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.partners WHERE id = _to_partner_id AND company_id = v.company_id) THEN
    RAISE EXCEPTION 'parceiro inválido para esta empresa';
  END IF;

  v_claim := public.claim_idempotency_key(v.company_id, 'lead.protection.transfer', _idempotency_key,
             jsonb_build_object('protection_id', _protection_id, 'to_partner_id', _to_partner_id));
  IF v_claim->>'status' = 'conflict' THEN RETURN jsonb_build_object('status','conflict'); END IF;
  IF v_claim->>'status' = 'replayed' THEN
    SELECT id INTO v_new FROM public.lead_protections
     WHERE lead_id = v.lead_id AND partner_id = _to_partner_id ORDER BY created_at DESC LIMIT 1;
    RETURN jsonb_build_object('status','replayed','protection_id', v_new);
  END IF;

  UPDATE public.lead_protections
     SET status = 'transferred', transferred_to_partner_id = _to_partner_id,
         released_at = now(), reason = COALESCE(_reason, reason)
   WHERE id = _protection_id;

  INSERT INTO public.lead_protections(company_id, lead_id, partner_id, origin, reason, valid_until, granted_by)
  VALUES (v.company_id, v.lead_id, _to_partner_id, 'transfer', _reason, v.valid_until, auth.uid())
  RETURNING id INTO v_new;

  UPDATE public.leads SET partner_id = _to_partner_id WHERE id = v.lead_id;
  RETURN jsonb_build_object('status','created','protection_id', v_new, 'from_protection_id', _protection_id);
END; $$;

CREATE OR REPLACE FUNCTION public.expire_lead_protections(_company_id uuid)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_count integer;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'unauthenticated'; END IF;
  IF NOT public.has_permission(auth.uid(), _company_id, 'lead.protection.manage') THEN RAISE EXCEPTION 'forbidden'; END IF;
  WITH upd AS (
    UPDATE public.lead_protections SET status = 'expired'
     WHERE company_id = _company_id AND status = 'protected' AND valid_until <= now()
    RETURNING 1)
  SELECT count(*) INTO v_count FROM upd;
  RETURN v_count;
END; $$;

-- Conflito de leads (usa o framework de aprovação da Fase 1)
CREATE OR REPLACE FUNCTION public.open_lead_conflict(_lead_id uuid, _claimant_partner_id uuid,
                                                     _evidence jsonb DEFAULT '{}'::jsonb,
                                                     _idempotency_key text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_company uuid; v_claim jsonb; v_prot public.lead_protections; v_terr uuid; v_id uuid; v_appr uuid; v_counter uuid;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'unauthenticated'; END IF;
  SELECT company_id, territory_id INTO v_company, v_terr FROM public.leads WHERE id = _lead_id;
  IF v_company IS NULL THEN RAISE EXCEPTION 'lead não encontrado'; END IF;
  IF NOT (public.has_permission(auth.uid(), v_company, 'lead.protection.manage')
          OR public.has_permission(auth.uid(), v_company, 'lead.manage')) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  v_claim := public.claim_idempotency_key(v_company, 'lead.conflict.open', _idempotency_key,
             jsonb_build_object('lead_id', _lead_id, 'claimant', _claimant_partner_id));
  IF v_claim->>'status' = 'conflict' THEN RETURN jsonb_build_object('status','conflict'); END IF;
  IF v_claim->>'status' = 'replayed' THEN
    SELECT id INTO v_id FROM public.lead_conflicts
     WHERE lead_id = _lead_id AND claimant_partner_id = _claimant_partner_id ORDER BY created_at DESC LIMIT 1;
    RETURN jsonb_build_object('status','replayed','conflict_id', v_id);
  END IF;

  SELECT * INTO v_prot FROM public.lead_protections WHERE lead_id = _lead_id AND status = 'protected' LIMIT 1;
  v_counter := v_prot.partner_id;

  INSERT INTO public.approval_requests(company_id, object_type, object_id, reference, status, requested_by, payload)
  VALUES (v_company, 'lead_conflicts', _lead_id::text, 'Conflito de lead', 'pending', auth.uid(),
          jsonb_build_object('lead_id', _lead_id, 'claimant_partner_id', _claimant_partner_id,
                             'counterpart_partner_id', v_counter, 'evidence', _evidence,
                             'protection_id', v_prot.id, 'territory_id', v_terr))
  RETURNING id INTO v_appr;

  INSERT INTO public.lead_conflicts(company_id, lead_id, claimant_partner_id, counterpart_partner_id,
                                    evidence, protection_id, territory_id, approval_request_id, opened_by)
  VALUES (v_company, _lead_id, _claimant_partner_id, v_counter,
          COALESCE(_evidence,'{}'::jsonb) || jsonb_build_object('opened_at', now()),
          v_prot.id, v_terr, v_appr, auth.uid())
  RETURNING id INTO v_id;

  IF v_prot.id IS NOT NULL THEN
    UPDATE public.lead_protections SET status = 'disputed' WHERE id = v_prot.id;
  END IF;

  RETURN jsonb_build_object('status','created','conflict_id', v_id, 'approval_request_id', v_appr);
END; $$;

CREATE OR REPLACE FUNCTION public.resolve_lead_conflict(_conflict_id uuid, _awarded_partner_id uuid, _resolution text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v public.lead_conflicts;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'unauthenticated'; END IF;
  SELECT * INTO v FROM public.lead_conflicts WHERE id = _conflict_id;
  IF v.id IS NULL THEN RAISE EXCEPTION 'conflito não encontrado'; END IF;
  IF NOT public.has_permission(auth.uid(), v.company_id, 'approval.decide') THEN RAISE EXCEPTION 'forbidden'; END IF;
  IF _resolution IS NULL OR length(trim(_resolution)) = 0 THEN RAISE EXCEPTION 'justificativa obrigatória'; END IF;

  UPDATE public.lead_conflicts
     SET status = 'resolved', awarded_partner_id = _awarded_partner_id,
         resolution = _resolution, decided_by = auth.uid(), decided_at = now()
   WHERE id = _conflict_id;

  UPDATE public.approval_requests
     SET status = 'approved', decided_by = auth.uid(), decided_at = now(), decision_reason = _resolution
   WHERE id = v.approval_request_id;

  UPDATE public.lead_protections
     SET status = CASE WHEN partner_id = _awarded_partner_id THEN 'protected' ELSE 'released' END,
         released_at = CASE WHEN partner_id = _awarded_partner_id THEN NULL ELSE now() END
   WHERE lead_id = v.lead_id AND status = 'disputed';

  UPDATE public.leads SET partner_id = _awarded_partner_id WHERE id = v.lead_id;

  INSERT INTO public.audit_events(actor_id, company_id, action, object_type, object_id, context)
  VALUES (auth.uid(), v.company_id, 'lead.conflict.resolve', 'lead_conflicts', _conflict_id::text,
          jsonb_build_object('awarded_partner_id', _awarded_partner_id, 'resolution', _resolution));

  RETURN jsonb_build_object('status','resolved','conflict_id', _conflict_id);
END; $$;

-- Lead -> Opportunity
CREATE OR REPLACE FUNCTION public.convert_lead_to_opportunity(_lead_id uuid, _idempotency_key text,
                                                              _name text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE l public.leads; v_claim jsonb; v_id uuid; v_code text;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'unauthenticated'; END IF;
  SELECT * INTO l FROM public.leads WHERE id = _lead_id;
  IF l.id IS NULL THEN RAISE EXCEPTION 'lead não encontrado'; END IF;
  IF NOT public.has_permission(auth.uid(), l.company_id, 'opportunity.manage') THEN RAISE EXCEPTION 'forbidden'; END IF;
  IF l.status NOT IN ('qualified','converted') THEN
    RAISE EXCEPTION 'Lead precisa estar qualificado para conversão (status atual: %)', l.status;
  END IF;

  SELECT id INTO v_id FROM public.opportunities WHERE lead_id = _lead_id;
  IF v_id IS NOT NULL THEN RETURN jsonb_build_object('status','replayed','opportunity_id', v_id); END IF;

  v_claim := public.claim_idempotency_key(l.company_id, 'lead.convert', _idempotency_key,
             jsonb_build_object('lead_id', _lead_id));
  IF v_claim->>'status' = 'conflict' THEN RETURN jsonb_build_object('status','conflict'); END IF;
  IF v_claim->>'status' = 'replayed' THEN
    SELECT id INTO v_id FROM public.opportunities WHERE lead_id = _lead_id;
    RETURN jsonb_build_object('status','replayed','opportunity_id', v_id);
  END IF;

  v_code := public.next_sequence_value(l.company_id, 'opportunity', 'OPP');

  INSERT INTO public.opportunities(company_id, lead_id, code, name, partner_id, territory_id, owner_id,
                                   source, channel, campaign, referral_code, created_by)
  VALUES (l.company_id, l.id, v_code, COALESCE(_name, l.company_name), l.partner_id, l.territory_id,
          COALESCE(l.owner_id, auth.uid()), l.source, l.channel, l.campaign, l.referral_code, auth.uid())
  RETURNING id INTO v_id;

  UPDATE public.leads SET status = 'converted' WHERE id = l.id AND status <> 'converted';

  INSERT INTO public.audit_events(actor_id, company_id, action, object_type, object_id, context)
  VALUES (auth.uid(), l.company_id, 'lead.convert', 'opportunities', v_id::text,
          jsonb_build_object('lead_id', l.id, 'code', v_code));

  RETURN jsonb_build_object('status','created','opportunity_id', v_id, 'code', v_code);
END; $$;

CREATE OR REPLACE FUNCTION public.advance_opportunity_stage(_opportunity_id uuid, _stage public.opportunity_stage,
                                                            _reason text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE o public.opportunities;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'unauthenticated'; END IF;
  SELECT * INTO o FROM public.opportunities WHERE id = _opportunity_id;
  IF o.id IS NULL THEN RAISE EXCEPTION 'oportunidade não encontrada'; END IF;
  IF NOT (public.has_permission(auth.uid(), o.company_id, 'opportunity.manage')
          OR o.partner_id IN (SELECT public.my_partner_ids())) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  IF _stage = 'won' THEN RAISE EXCEPTION 'Use close_opportunity_won para encerrar como ganho'; END IF;
  UPDATE public.opportunities
     SET stage = _stage, metadata = metadata || jsonb_build_object('stage_reason', _reason)
   WHERE id = _opportunity_id;
  RETURN jsonb_build_object('status','ok','opportunity_id', _opportunity_id, 'stage', _stage);
END; $$;

CREATE OR REPLACE FUNCTION public.close_opportunity_won(_opportunity_id uuid, _proposal_id uuid,
                                                        _idempotency_key text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE o public.opportunities; p public.commercial_proposals; it public.proposal_items; v_claim jsonb;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'unauthenticated'; END IF;
  SELECT * INTO o FROM public.opportunities WHERE id = _opportunity_id;
  IF o.id IS NULL THEN RAISE EXCEPTION 'oportunidade não encontrada'; END IF;
  IF NOT public.has_permission(auth.uid(), o.company_id, 'opportunity.manage') THEN RAISE EXCEPTION 'forbidden'; END IF;
  IF o.stage = 'won' THEN RETURN jsonb_build_object('status','replayed','opportunity_id', o.id); END IF;

  SELECT * INTO p FROM public.commercial_proposals WHERE id = _proposal_id AND opportunity_id = _opportunity_id;
  IF p.id IS NULL THEN RAISE EXCEPTION 'proposta inválida para esta oportunidade'; END IF;
  IF p.status NOT IN ('approved','sent','accepted') THEN
    RAISE EXCEPTION 'Proposta precisa estar aprovada para encerrar como ganho (situação: %)', p.status;
  END IF;

  v_claim := public.claim_idempotency_key(o.company_id, 'opportunity.won', _idempotency_key,
             jsonb_build_object('opportunity_id', _opportunity_id, 'proposal_id', _proposal_id));
  IF v_claim->>'status' = 'conflict' THEN RETURN jsonb_build_object('status','conflict'); END IF;
  IF v_claim->>'status' = 'replayed' THEN RETURN jsonb_build_object('status','replayed','opportunity_id', o.id); END IF;

  SELECT * INTO it FROM public.proposal_items WHERE proposal_id = p.id ORDER BY created_at LIMIT 1;

  UPDATE public.opportunities
     SET stage = 'won', won_proposal_id = p.id, won_product_id = it.product_id, won_plan_id = it.plan_id,
         won_price_policy_id = it.price_policy_id,
         won_setup_amount = p.total_setup_amount, won_monthly_amount = p.total_monthly_amount,
         metadata = metadata || jsonb_build_object('stage_reason','proposta aceita')
   WHERE id = _opportunity_id;

  UPDATE public.commercial_proposals SET status = 'accepted' WHERE id = p.id;

  INSERT INTO public.audit_events(actor_id, company_id, action, object_type, object_id, context)
  VALUES (auth.uid(), o.company_id, 'opportunity.won', 'opportunities', o.id::text,
          jsonb_build_object('proposal_id', p.id, 'partner_id', o.partner_id, 'source', o.source,
                             'price_policy_id', it.price_policy_id,
                             'setup', p.total_setup_amount, 'monthly', p.total_monthly_amount));

  RETURN jsonb_build_object('status','won','opportunity_id', o.id);
END; $$;

CREATE OR REPLACE FUNCTION public.close_opportunity_lost(_opportunity_id uuid, _reason public.loss_reason,
                                                         _competitor text DEFAULT NULL, _notes text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE o public.opportunities;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'unauthenticated'; END IF;
  SELECT * INTO o FROM public.opportunities WHERE id = _opportunity_id;
  IF o.id IS NULL THEN RAISE EXCEPTION 'oportunidade não encontrada'; END IF;
  IF NOT public.has_permission(auth.uid(), o.company_id, 'opportunity.manage') THEN RAISE EXCEPTION 'forbidden'; END IF;
  IF o.stage = 'lost' THEN RETURN jsonb_build_object('status','replayed','opportunity_id', o.id); END IF;
  IF _reason IS NULL THEN RAISE EXCEPTION 'motivo de perda é obrigatório'; END IF;

  UPDATE public.opportunities
     SET stage = 'lost', lost_reason = _reason, lost_competitor = _competitor, lost_notes = _notes,
         metadata = metadata || jsonb_build_object('stage_reason', _reason::text)
   WHERE id = _opportunity_id;

  INSERT INTO public.audit_events(actor_id, company_id, action, object_type, object_id, context)
  VALUES (auth.uid(), o.company_id, 'opportunity.lost', 'opportunities', o.id::text,
          jsonb_build_object('reason', _reason, 'competitor', _competitor));

  RETURN jsonb_build_object('status','lost','opportunity_id', o.id);
END; $$;

-- Emissão de proposta com snapshot de preços e alçada de desconto
CREATE OR REPLACE FUNCTION public.issue_proposal(_opportunity_id uuid, _items jsonb, _idempotency_key text,
                                                 _valid_until timestamptz DEFAULT NULL,
                                                 _conditions text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE o public.opportunities; v_claim jsonb; v_prop uuid; v_prev public.commercial_proposals;
        it jsonb; pp public.price_policies; v_disc numeric; v_qty integer;
        v_setup numeric := 0; v_monthly numeric := 0; v_maxdisc numeric := 0;
        v_needs boolean := false; v_version integer; v_code text; v_appr uuid; v_within boolean;
        v_fs numeric; v_fm numeric;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'unauthenticated'; END IF;
  SELECT * INTO o FROM public.opportunities WHERE id = _opportunity_id;
  IF o.id IS NULL THEN RAISE EXCEPTION 'oportunidade não encontrada'; END IF;
  IF NOT public.has_permission(auth.uid(), o.company_id, 'proposal.create') THEN RAISE EXCEPTION 'forbidden'; END IF;
  IF o.stage IN ('won','lost') THEN RAISE EXCEPTION 'oportunidade encerrada'; END IF;
  IF _items IS NULL OR jsonb_array_length(_items) = 0 THEN RAISE EXCEPTION 'proposta exige ao menos um item'; END IF;

  v_claim := public.claim_idempotency_key(o.company_id, 'proposal.issue', _idempotency_key,
             jsonb_build_object('opportunity_id', _opportunity_id, 'items', _items));
  IF v_claim->>'status' = 'conflict' THEN RETURN jsonb_build_object('status','conflict'); END IF;
  IF v_claim->>'status' = 'replayed' THEN
    RETURN COALESCE(v_claim->'response', jsonb_build_object('status','replayed'));
  END IF;

  SELECT * INTO v_prev FROM public.commercial_proposals
   WHERE opportunity_id = _opportunity_id ORDER BY version DESC LIMIT 1;
  v_version := COALESCE(v_prev.version, 0) + 1;
  v_code := public.next_sequence_value(o.company_id, 'proposal', 'PROP');

  INSERT INTO public.commercial_proposals(company_id, lead_id, opportunity_id, partner_id, code, version,
                                          supersedes_id, status, conditions, valid_until, issued_by)
  VALUES (o.company_id, o.lead_id, o.id, o.partner_id, v_code, v_version, v_prev.id, 'draft',
          _conditions, COALESCE(_valid_until, now() + interval '15 days'), auth.uid())
  RETURNING id INTO v_prop;

  IF v_prev.id IS NOT NULL AND v_prev.status NOT IN ('accepted','declined','cancelled') THEN
    UPDATE public.commercial_proposals SET status = 'superseded' WHERE id = v_prev.id;
  END IF;

  FOR it IN SELECT * FROM jsonb_array_elements(_items) LOOP
    SELECT * INTO pp FROM public.price_policies
     WHERE id = (it->>'price_policy_id')::uuid AND company_id = o.company_id AND status = 'active'
       AND effective_from <= now() AND (effective_to IS NULL OR effective_to > now());
    IF pp.id IS NULL THEN RAISE EXCEPTION 'política de preço inexistente ou fora de vigência'; END IF;

    v_disc := COALESCE((it->>'discount_percent')::numeric, 0);
    IF v_disc < 0 OR v_disc > 100 THEN RAISE EXCEPTION 'desconto inválido'; END IF;
    v_qty := COALESCE((it->>'quantity')::integer, 1);
    v_within := v_disc <= pp.max_discount_percent;
    IF v_disc > pp.max_discount_percent OR v_disc > pp.approval_threshold_percent THEN v_needs := true; END IF;
    IF v_disc > v_maxdisc THEN v_maxdisc := v_disc; END IF;

    v_fs := round(pp.setup_price * v_qty * (1 - v_disc/100), 2);
    v_fm := round(pp.monthly_price * v_qty * (1 - v_disc/100), 2);
    v_setup := v_setup + v_fs;
    v_monthly := v_monthly + v_fm;

    INSERT INTO public.proposal_items(company_id, proposal_id, product_id, plan_id, price_policy_id,
                                      price_policy_version, quantity, list_setup_price, list_monthly_price,
                                      discount_percent, final_setup_price, final_monthly_price,
                                      billing_period, within_policy, snapshot)
    VALUES (o.company_id, v_prop, pp.product_id, pp.plan_id, pp.id, pp.version, v_qty,
            pp.setup_price, pp.monthly_price, v_disc, v_fs, v_fm, pp.billing_period, v_within,
            jsonb_build_object('policy_name', pp.name, 'currency', pp.currency,
                               'max_discount_percent', pp.max_discount_percent,
                               'approval_threshold_percent', pp.approval_threshold_percent,
                               'setup_price', pp.setup_price, 'monthly_price', pp.monthly_price,
                               'captured_at', now()));
  END LOOP;

  IF v_needs THEN
    INSERT INTO public.approval_requests(company_id, object_type, object_id, reference, status, requested_by, payload)
    VALUES (o.company_id, 'commercial_proposals', v_prop::text, v_code, 'pending', auth.uid(),
            jsonb_build_object('opportunity_id', o.id, 'proposal_id', v_prop, 'max_discount_percent', v_maxdisc,
                               'before', jsonb_build_object('setup', (SELECT COALESCE(sum(list_setup_price*quantity),0) FROM public.proposal_items WHERE proposal_id = v_prop),
                                                            'monthly', (SELECT COALESCE(sum(list_monthly_price*quantity),0) FROM public.proposal_items WHERE proposal_id = v_prop)),
                               'after', jsonb_build_object('setup', v_setup, 'monthly', v_monthly)))
    RETURNING id INTO v_appr;
  END IF;

  UPDATE public.commercial_proposals
     SET total_setup_amount = v_setup, total_monthly_amount = v_monthly, max_discount_percent = v_maxdisc,
         requires_approval = v_needs, approval_request_id = v_appr,
         status = CASE WHEN v_needs THEN 'pending_approval'::public.proposal_status ELSE 'approved'::public.proposal_status END,
         approved_by = CASE WHEN v_needs THEN NULL ELSE auth.uid() END,
         approved_at = CASE WHEN v_needs THEN NULL ELSE now() END
   WHERE id = v_prop;

  IF o.stage NOT IN ('proposal','negotiation') THEN
    UPDATE public.opportunities SET stage = 'proposal',
           metadata = metadata || jsonb_build_object('stage_reason','proposta emitida')
     WHERE id = o.id;
  END IF;

  UPDATE public.idempotency_keys
     SET response = jsonb_build_object('status','created','proposal_id', v_prop, 'version', v_version,
                                       'requires_approval', v_needs)
   WHERE operation = 'proposal.issue' AND key = _idempotency_key;

  RETURN jsonb_build_object('status','created','proposal_id', v_prop, 'code', v_code, 'version', v_version,
                            'requires_approval', v_needs, 'approval_request_id', v_appr,
                            'total_setup_amount', v_setup, 'total_monthly_amount', v_monthly);
END; $$;

CREATE OR REPLACE FUNCTION public.decide_proposal_discount(_proposal_id uuid, _approve boolean, _reason text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE p public.commercial_proposals;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'unauthenticated'; END IF;
  SELECT * INTO p FROM public.commercial_proposals WHERE id = _proposal_id;
  IF p.id IS NULL THEN RAISE EXCEPTION 'proposta não encontrada'; END IF;
  IF NOT public.has_permission(auth.uid(), p.company_id, 'proposal.approve') THEN RAISE EXCEPTION 'forbidden'; END IF;
  IF p.status <> 'pending_approval' THEN RAISE EXCEPTION 'proposta não está pendente de aprovação'; END IF;
  IF _reason IS NULL OR length(trim(_reason)) = 0 THEN RAISE EXCEPTION 'justificativa obrigatória'; END IF;

  UPDATE public.commercial_proposals
     SET status = CASE WHEN _approve THEN 'approved'::public.proposal_status ELSE 'rejected'::public.proposal_status END,
         approved_by = auth.uid(), approved_at = now(), decision_reason = _reason
   WHERE id = _proposal_id;

  UPDATE public.approval_requests
     SET status = CASE WHEN _approve THEN 'approved' ELSE 'rejected' END,
         decided_by = auth.uid(), decided_at = now(), decision_reason = _reason
   WHERE id = p.approval_request_id;

  INSERT INTO public.audit_events(actor_id, company_id, action, object_type, object_id, context)
  VALUES (auth.uid(), p.company_id, CASE WHEN _approve THEN 'proposal.discount.approve' ELSE 'proposal.discount.reject' END,
          'commercial_proposals', p.id::text,
          jsonb_build_object('max_discount_percent', p.max_discount_percent, 'reason', _reason,
                             'before', jsonb_build_object('status', p.status),
                             'after', jsonb_build_object('status', CASE WHEN _approve THEN 'approved' ELSE 'rejected' END)));

  RETURN jsonb_build_object('status', CASE WHEN _approve THEN 'approved' ELSE 'rejected' END, 'proposal_id', p.id);
END; $$;

-- ============ EXECUTE: RPCs só para autenticados; funções de gatilho, para ninguém ============
REVOKE EXECUTE ON FUNCTION public.tg_lead_protection_history() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.tg_price_policy_immutable() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.tg_lead_status_stamp() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.tg_opportunity_stage_guard() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.tg_activity_touch_lead() FROM PUBLIC, anon, authenticated;

REVOKE EXECUTE ON FUNCTION public.find_lead_duplicates(uuid,text,text,text,text,text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.create_lead(uuid,jsonb,text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.assign_lead(uuid,uuid,uuid,text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.protect_lead(uuid,uuid,timestamptz,text,text,text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.release_lead_protection(uuid,text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.transfer_lead_protection(uuid,uuid,text,text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.expire_lead_protections(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.open_lead_conflict(uuid,uuid,jsonb,text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.resolve_lead_conflict(uuid,uuid,text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.convert_lead_to_opportunity(uuid,text,text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.advance_opportunity_stage(uuid,public.opportunity_stage,text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.close_opportunity_won(uuid,uuid,text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.close_opportunity_lost(uuid,public.loss_reason,text,text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.issue_proposal(uuid,jsonb,text,timestamptz,text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.decide_proposal_discount(uuid,boolean,text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.opportunity_transition_allowed(public.opportunity_stage,public.opportunity_stage) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.find_lead_duplicates(uuid,text,text,text,text,text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_lead(uuid,jsonb,text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.assign_lead(uuid,uuid,uuid,text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.protect_lead(uuid,uuid,timestamptz,text,text,text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.release_lead_protection(uuid,text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.transfer_lead_protection(uuid,uuid,text,text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.expire_lead_protections(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.open_lead_conflict(uuid,uuid,jsonb,text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.resolve_lead_conflict(uuid,uuid,text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.convert_lead_to_opportunity(uuid,text,text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.advance_opportunity_stage(uuid,public.opportunity_stage,text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.close_opportunity_won(uuid,uuid,text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.close_opportunity_lost(uuid,public.loss_reason,text,text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.issue_proposal(uuid,jsonb,text,timestamptz,text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.decide_proposal_discount(uuid,boolean,text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.opportunity_transition_allowed(public.opportunity_stage,public.opportunity_stage) TO authenticated;