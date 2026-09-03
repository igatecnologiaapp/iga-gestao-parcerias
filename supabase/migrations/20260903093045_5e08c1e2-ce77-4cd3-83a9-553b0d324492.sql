-- ============ ENUMS ============
CREATE TYPE public.lead_status AS ENUM ('new','contacted','qualified','disqualified','converted','archived');
CREATE TYPE public.lead_protection_status AS ENUM ('protected','expired','released','transferred','disputed');
CREATE TYPE public.lead_dup_status AS ENUM ('open','duplicate_confirmed','distinct_confirmed');
CREATE TYPE public.lead_conflict_status AS ENUM ('open','under_review','resolved','dismissed');
CREATE TYPE public.billing_period AS ENUM ('one_time','monthly','quarterly','semiannual','annual');

-- ============ PRODUTOS ============
CREATE TABLE public.products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id),
  code text NOT NULL,
  name text NOT NULL,
  description text,
  category text,
  status public.record_status NOT NULL DEFAULT 'active',
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (company_id, code)
);
GRANT SELECT, INSERT, UPDATE ON public.products TO authenticated;
GRANT ALL ON public.products TO service_role;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
CREATE POLICY prod_select ON public.products FOR SELECT TO authenticated
  USING (public.has_permission(auth.uid(), company_id, 'product.read'));
CREATE POLICY prod_insert ON public.products FOR INSERT TO authenticated
  WITH CHECK (public.has_permission(auth.uid(), company_id, 'product.manage'));
CREATE POLICY prod_update ON public.products FOR UPDATE TO authenticated
  USING (public.has_permission(auth.uid(), company_id, 'product.manage'))
  WITH CHECK (public.has_permission(auth.uid(), company_id, 'product.manage'));

-- ============ PLANOS ============
CREATE TABLE public.plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id),
  product_id uuid NOT NULL REFERENCES public.products(id),
  code text NOT NULL,
  name text NOT NULL,
  description text,
  status public.record_status NOT NULL DEFAULT 'active',
  sort_order integer NOT NULL DEFAULT 0,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (product_id, code)
);
GRANT SELECT, INSERT, UPDATE ON public.plans TO authenticated;
GRANT ALL ON public.plans TO service_role;
ALTER TABLE public.plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY plan_select ON public.plans FOR SELECT TO authenticated
  USING (public.has_permission(auth.uid(), company_id, 'product.read'));
CREATE POLICY plan_insert ON public.plans FOR INSERT TO authenticated
  WITH CHECK (public.has_permission(auth.uid(), company_id, 'product.manage'));
CREATE POLICY plan_update ON public.plans FOR UPDATE TO authenticated
  USING (public.has_permission(auth.uid(), company_id, 'product.manage'))
  WITH CHECK (public.has_permission(auth.uid(), company_id, 'product.manage'));

-- ============ POLÍTICA DE PREÇOS (versionada) ============
CREATE TABLE public.price_policies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id),
  product_id uuid NOT NULL REFERENCES public.products(id),
  plan_id uuid NOT NULL REFERENCES public.plans(id),
  version integer NOT NULL DEFAULT 1,
  name text NOT NULL,
  currency text NOT NULL DEFAULT 'BRL',
  setup_price numeric(14,2) NOT NULL DEFAULT 0,
  monthly_price numeric(14,2) NOT NULL DEFAULT 0,
  billing_period public.billing_period NOT NULL DEFAULT 'monthly',
  max_discount_percent numeric(5,2) NOT NULL DEFAULT 0,
  approval_threshold_percent numeric(5,2) NOT NULL DEFAULT 0,
  terms jsonb NOT NULL DEFAULT '{}'::jsonb,
  effective_from timestamptz NOT NULL DEFAULT now(),
  effective_to timestamptz,
  status public.record_status NOT NULL DEFAULT 'active',
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (plan_id, version)
);
GRANT SELECT, INSERT, UPDATE ON public.price_policies TO authenticated;
GRANT ALL ON public.price_policies TO service_role;
ALTER TABLE public.price_policies ENABLE ROW LEVEL SECURITY;
CREATE POLICY pp_select ON public.price_policies FOR SELECT TO authenticated
  USING (public.has_permission(auth.uid(), company_id, 'product.read'));
CREATE POLICY pp_insert ON public.price_policies FOR INSERT TO authenticated
  WITH CHECK (public.has_permission(auth.uid(), company_id, 'price_policy.manage'));
CREATE POLICY pp_update ON public.price_policies FOR UPDATE TO authenticated
  USING (public.has_permission(auth.uid(), company_id, 'price_policy.manage'))
  WITH CHECK (public.has_permission(auth.uid(), company_id, 'price_policy.manage'));

-- valores de uma versão publicada são imutáveis: só vigência/status podem mudar
CREATE OR REPLACE FUNCTION public.tg_price_policy_immutable()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.product_id IS DISTINCT FROM OLD.product_id
     OR NEW.plan_id IS DISTINCT FROM OLD.plan_id
     OR NEW.version IS DISTINCT FROM OLD.version
     OR NEW.currency IS DISTINCT FROM OLD.currency
     OR NEW.setup_price IS DISTINCT FROM OLD.setup_price
     OR NEW.monthly_price IS DISTINCT FROM OLD.monthly_price
     OR NEW.billing_period IS DISTINCT FROM OLD.billing_period
     OR NEW.max_discount_percent IS DISTINCT FROM OLD.max_discount_percent
     OR NEW.approval_threshold_percent IS DISTINCT FROM OLD.approval_threshold_percent
     OR NEW.terms IS DISTINCT FROM OLD.terms
     OR NEW.effective_from IS DISTINCT FROM OLD.effective_from THEN
    RAISE EXCEPTION 'Valores de uma versão de política de preço são imutáveis: crie uma nova versão';
  END IF;
  RETURN NEW;
END; $$;
CREATE TRIGGER t_pp_immutable BEFORE UPDATE ON public.price_policies
  FOR EACH ROW EXECUTE FUNCTION public.tg_price_policy_immutable();

-- ============ LEADS ============
CREATE TABLE public.leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id),
  unit_id uuid REFERENCES public.units(id),
  code text,
  company_name text NOT NULL,
  trade_name text,
  segment text,
  document text,
  contact_name text,
  phone text,
  whatsapp text,
  email text,
  address text,
  district text,
  city text,
  state text,
  postal_code text,
  source text,
  channel text,
  campaign text,
  referral_code text,
  external_id text,
  partner_id uuid REFERENCES public.partners(id),
  territory_id uuid REFERENCES public.territories(id),
  owner_id uuid,
  status public.lead_status NOT NULL DEFAULT 'new',
  status_changed_at timestamptz NOT NULL DEFAULT now(),
  qualification jsonb NOT NULL DEFAULT '{}'::jsonb,
  notes text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  last_activity_at timestamptz,
  converted_at timestamptz,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_leads_company_status ON public.leads(company_id, status);
CREATE INDEX idx_leads_partner ON public.leads(partner_id);
CREATE INDEX idx_leads_document ON public.leads(company_id, document);
CREATE INDEX idx_leads_region_segment ON public.leads(company_id, state, city, segment);
GRANT SELECT, INSERT, UPDATE ON public.leads TO authenticated;
GRANT ALL ON public.leads TO service_role;
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
CREATE POLICY lead_select ON public.leads FOR SELECT TO authenticated
  USING (
    public.has_permission(auth.uid(), company_id, 'lead.read')
    OR partner_id IN (SELECT public.my_partner_ids())
    OR owner_id = auth.uid()
  );
CREATE POLICY lead_insert ON public.leads FOR INSERT TO authenticated
  WITH CHECK (
    public.has_permission(auth.uid(), company_id, 'lead.create')
    OR public.has_permission(auth.uid(), company_id, 'lead.manage')
  );
CREATE POLICY lead_update ON public.leads FOR UPDATE TO authenticated
  USING (
    public.has_permission(auth.uid(), company_id, 'lead.manage')
    OR public.has_permission(auth.uid(), company_id, 'lead.assign')
    OR partner_id IN (SELECT public.my_partner_ids())
  )
  WITH CHECK (
    public.has_permission(auth.uid(), company_id, 'lead.manage')
    OR public.has_permission(auth.uid(), company_id, 'lead.assign')
    OR partner_id IN (SELECT public.my_partner_ids())
  );

CREATE OR REPLACE FUNCTION public.tg_lead_status_stamp()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    NEW.status_changed_at := now();
    IF NEW.status = 'converted' AND NEW.converted_at IS NULL THEN NEW.converted_at := now(); END IF;
  END IF;
  RETURN NEW;
END; $$;
CREATE TRIGGER t_lead_status_stamp BEFORE UPDATE ON public.leads
  FOR EACH ROW EXECUTE FUNCTION public.tg_lead_status_stamp();

-- ============ DEDUPLICAÇÃO ============
CREATE TABLE public.lead_duplicate_flags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id),
  lead_id uuid NOT NULL REFERENCES public.leads(id),
  duplicate_of_lead_id uuid NOT NULL REFERENCES public.leads(id),
  matched_on text[] NOT NULL DEFAULT ARRAY[]::text[],
  score numeric(5,2) NOT NULL DEFAULT 0,
  status public.lead_dup_status NOT NULL DEFAULT 'open',
  resolution_notes text,
  resolved_by uuid,
  resolved_at timestamptz,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (lead_id, duplicate_of_lead_id)
);
GRANT SELECT, INSERT, UPDATE ON public.lead_duplicate_flags TO authenticated;
GRANT ALL ON public.lead_duplicate_flags TO service_role;
ALTER TABLE public.lead_duplicate_flags ENABLE ROW LEVEL SECURITY;
CREATE POLICY ldf_select ON public.lead_duplicate_flags FOR SELECT TO authenticated
  USING (public.has_permission(auth.uid(), company_id, 'lead.read'));
CREATE POLICY ldf_insert ON public.lead_duplicate_flags FOR INSERT TO authenticated
  WITH CHECK (public.has_permission(auth.uid(), company_id, 'lead.create')
              OR public.has_permission(auth.uid(), company_id, 'lead.manage'));
CREATE POLICY ldf_update ON public.lead_duplicate_flags FOR UPDATE TO authenticated
  USING (public.has_permission(auth.uid(), company_id, 'lead.manage'))
  WITH CHECK (public.has_permission(auth.uid(), company_id, 'lead.manage'));

-- ============ PROTEÇÃO COMERCIAL DO LEAD ============
CREATE TABLE public.lead_protections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id),
  lead_id uuid NOT NULL REFERENCES public.leads(id),
  partner_id uuid NOT NULL REFERENCES public.partners(id),
  status public.lead_protection_status NOT NULL DEFAULT 'protected',
  origin text NOT NULL DEFAULT 'manual',
  reason text,
  valid_from timestamptz NOT NULL DEFAULT now(),
  valid_until timestamptz NOT NULL,
  released_at timestamptz,
  transferred_to_partner_id uuid REFERENCES public.partners(id),
  granted_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_lead_protections_lead ON public.lead_protections(lead_id, status);
GRANT SELECT, INSERT, UPDATE ON public.lead_protections TO authenticated;
GRANT ALL ON public.lead_protections TO service_role;
ALTER TABLE public.lead_protections ENABLE ROW LEVEL SECURITY;
CREATE POLICY lp_select ON public.lead_protections FOR SELECT TO authenticated
  USING (public.has_permission(auth.uid(), company_id, 'lead.read')
         OR partner_id IN (SELECT public.my_partner_ids()));
CREATE POLICY lp_insert ON public.lead_protections FOR INSERT TO authenticated
  WITH CHECK (public.has_permission(auth.uid(), company_id, 'lead.protection.manage'));
CREATE POLICY lp_update ON public.lead_protections FOR UPDATE TO authenticated
  USING (public.has_permission(auth.uid(), company_id, 'lead.protection.manage'))
  WITH CHECK (public.has_permission(auth.uid(), company_id, 'lead.protection.manage'));

-- proteção vigente é exclusiva por lead
CREATE UNIQUE INDEX uq_lead_protection_active ON public.lead_protections(lead_id)
  WHERE status = 'protected';

CREATE TABLE public.lead_protection_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id),
  protection_id uuid REFERENCES public.lead_protections(id),
  lead_id uuid NOT NULL REFERENCES public.leads(id),
  partner_id uuid REFERENCES public.partners(id),
  event text NOT NULL,
  from_status public.lead_protection_status,
  to_status public.lead_protection_status,
  reason text,
  actor_id uuid,
  context jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.lead_protection_events TO authenticated;
GRANT ALL ON public.lead_protection_events TO service_role;
ALTER TABLE public.lead_protection_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY lpe_select ON public.lead_protection_events FOR SELECT TO authenticated
  USING (public.has_permission(auth.uid(), company_id, 'lead.read')
         OR partner_id IN (SELECT public.my_partner_ids()));
CREATE TRIGGER t_lpe_immutable BEFORE UPDATE OR DELETE ON public.lead_protection_events
  FOR EACH ROW EXECUTE FUNCTION public.tg_acceptance_immutable();

CREATE OR REPLACE FUNCTION public.tg_lead_protection_history()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.lead_protection_events(company_id, protection_id, lead_id, partner_id, event, to_status, reason, actor_id)
    VALUES (NEW.company_id, NEW.id, NEW.lead_id, NEW.partner_id, 'granted', NEW.status, NEW.reason, auth.uid());
    RETURN NEW;
  END IF;
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    INSERT INTO public.lead_protection_events(company_id, protection_id, lead_id, partner_id, event, from_status, to_status, reason, actor_id,
                                              context)
    VALUES (NEW.company_id, NEW.id, NEW.lead_id, NEW.partner_id, 'status_changed', OLD.status, NEW.status, NEW.reason, auth.uid(),
            jsonb_build_object('transferred_to_partner_id', NEW.transferred_to_partner_id));
  END IF;
  RETURN NEW;
END; $$;
CREATE TRIGGER t_lp_history_ins AFTER INSERT ON public.lead_protections
  FOR EACH ROW EXECUTE FUNCTION public.tg_lead_protection_history();
CREATE TRIGGER t_lp_history_upd AFTER UPDATE ON public.lead_protections
  FOR EACH ROW EXECUTE FUNCTION public.tg_lead_protection_history();

-- ============ CONFLITO DE LEADS ============
CREATE TABLE public.lead_conflicts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id),
  lead_id uuid NOT NULL REFERENCES public.leads(id),
  claimant_partner_id uuid NOT NULL REFERENCES public.partners(id),
  counterpart_partner_id uuid REFERENCES public.partners(id),
  status public.lead_conflict_status NOT NULL DEFAULT 'open',
  evidence jsonb NOT NULL DEFAULT '{}'::jsonb,
  protection_id uuid REFERENCES public.lead_protections(id),
  territory_id uuid REFERENCES public.territories(id),
  approval_request_id uuid REFERENCES public.approval_requests(id),
  resolution text,
  awarded_partner_id uuid REFERENCES public.partners(id),
  decided_by uuid,
  decided_at timestamptz,
  opened_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.lead_conflicts TO authenticated;
GRANT ALL ON public.lead_conflicts TO service_role;
ALTER TABLE public.lead_conflicts ENABLE ROW LEVEL SECURITY;
CREATE POLICY lc_select ON public.lead_conflicts FOR SELECT TO authenticated
  USING (public.has_permission(auth.uid(), company_id, 'lead.read')
         OR claimant_partner_id IN (SELECT public.my_partner_ids())
         OR counterpart_partner_id IN (SELECT public.my_partner_ids()));
CREATE POLICY lc_insert ON public.lead_conflicts FOR INSERT TO authenticated
  WITH CHECK (public.has_permission(auth.uid(), company_id, 'lead.protection.manage')
              OR public.has_permission(auth.uid(), company_id, 'lead.manage'));
CREATE POLICY lc_update ON public.lead_conflicts FOR UPDATE TO authenticated
  USING (public.has_permission(auth.uid(), company_id, 'lead.protection.manage'))
  WITH CHECK (public.has_permission(auth.uid(), company_id, 'lead.protection.manage'));

-- ============ LINK / QR DO PARCEIRO ============
CREATE TABLE public.partner_referral_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id),
  partner_id uuid NOT NULL REFERENCES public.partners(id),
  public_token text NOT NULL UNIQUE,
  label text,
  channel text,
  campaign text,
  status public.record_status NOT NULL DEFAULT 'active',
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.partner_referral_links TO authenticated;
GRANT ALL ON public.partner_referral_links TO service_role;
ALTER TABLE public.partner_referral_links ENABLE ROW LEVEL SECURITY;
CREATE POLICY prl_select ON public.partner_referral_links FOR SELECT TO authenticated
  USING (public.has_permission(auth.uid(), company_id, 'lead.read')
         OR partner_id IN (SELECT public.my_partner_ids()));
CREATE POLICY prl_insert ON public.partner_referral_links FOR INSERT TO authenticated
  WITH CHECK (public.has_permission(auth.uid(), company_id, 'lead.manage'));
CREATE POLICY prl_update ON public.partner_referral_links FOR UPDATE TO authenticated
  USING (public.has_permission(auth.uid(), company_id, 'lead.manage'))
  WITH CHECK (public.has_permission(auth.uid(), company_id, 'lead.manage'));

-- ============ updated_at + auditoria ============
CREATE TRIGGER t_products_upd BEFORE UPDATE ON public.products FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();
CREATE TRIGGER t_plans_upd BEFORE UPDATE ON public.plans FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();
CREATE TRIGGER t_pp_upd BEFORE UPDATE ON public.price_policies FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();
CREATE TRIGGER t_leads_upd BEFORE UPDATE ON public.leads FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();
CREATE TRIGGER t_ldf_upd BEFORE UPDATE ON public.lead_duplicate_flags FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();
CREATE TRIGGER t_lp_upd BEFORE UPDATE ON public.lead_protections FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();
CREATE TRIGGER t_lc_upd BEFORE UPDATE ON public.lead_conflicts FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();
CREATE TRIGGER t_prl_upd BEFORE UPDATE ON public.partner_referral_links FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

CREATE TRIGGER t_audit_products AFTER INSERT OR UPDATE OR DELETE ON public.products FOR EACH ROW EXECUTE FUNCTION public.tg_audit_row();
CREATE TRIGGER t_audit_plans AFTER INSERT OR UPDATE OR DELETE ON public.plans FOR EACH ROW EXECUTE FUNCTION public.tg_audit_row();
CREATE TRIGGER t_audit_pp AFTER INSERT OR UPDATE OR DELETE ON public.price_policies FOR EACH ROW EXECUTE FUNCTION public.tg_audit_row();
CREATE TRIGGER t_audit_leads AFTER INSERT OR UPDATE OR DELETE ON public.leads FOR EACH ROW EXECUTE FUNCTION public.tg_audit_row();
CREATE TRIGGER t_audit_ldf AFTER INSERT OR UPDATE OR DELETE ON public.lead_duplicate_flags FOR EACH ROW EXECUTE FUNCTION public.tg_audit_row();
CREATE TRIGGER t_audit_lp AFTER INSERT OR UPDATE OR DELETE ON public.lead_protections FOR EACH ROW EXECUTE FUNCTION public.tg_audit_row();
CREATE TRIGGER t_audit_lc AFTER INSERT OR UPDATE OR DELETE ON public.lead_conflicts FOR EACH ROW EXECUTE FUNCTION public.tg_audit_row();
CREATE TRIGGER t_audit_prl AFTER INSERT OR UPDATE OR DELETE ON public.partner_referral_links FOR EACH ROW EXECUTE FUNCTION public.tg_audit_row();

-- ============ PERMISSÕES (Fase 3) ============
INSERT INTO public.permissions(code, module, description) VALUES
  ('lead.read','crm','Ler leads da empresa'),
  ('lead.create','crm','Criar leads'),
  ('lead.manage','crm','Gerenciar leads'),
  ('lead.assign','crm','Atribuir leads a parceiros/responsáveis'),
  ('lead.protection.manage','crm','Gerenciar proteção comercial de leads'),
  ('opportunity.read','crm','Ler oportunidades'),
  ('opportunity.manage','crm','Gerenciar oportunidades e pipeline'),
  ('activity.create','crm','Registrar atividades comerciais'),
  ('proposal.read','crm','Ler propostas comerciais'),
  ('proposal.create','crm','Criar/emitir propostas comerciais'),
  ('proposal.approve','crm','Aprovar descontos e condições fora da política'),
  ('product.read','catalogo','Ler catálogo de produtos e planos'),
  ('product.manage','catalogo','Gerenciar produtos e planos'),
  ('price_policy.manage','catalogo','Gerenciar políticas de preço')
ON CONFLICT (code) DO NOTHING;

INSERT INTO public.role_permissions(role_id, permission_id)
SELECT r.id, p.id FROM public.roles r, public.permissions p
WHERE r.code IN ('platform_admin','company_admin')
  AND p.code IN ('lead.read','lead.create','lead.manage','lead.assign','lead.protection.manage',
                 'opportunity.read','opportunity.manage','activity.create',
                 'proposal.read','proposal.create','proposal.approve',
                 'product.read','product.manage','price_policy.manage')
ON CONFLICT DO NOTHING;

INSERT INTO public.role_permissions(role_id, permission_id)
SELECT r.id, p.id FROM public.roles r, public.permissions p
WHERE r.code = 'unit_manager'
  AND p.code IN ('lead.read','lead.create','lead.manage','lead.assign',
                 'opportunity.read','opportunity.manage','activity.create',
                 'proposal.read','proposal.create','product.read')
ON CONFLICT DO NOTHING;

INSERT INTO public.role_permissions(role_id, permission_id)
SELECT r.id, p.id FROM public.roles r, public.permissions p
WHERE r.code = 'company_auditor'
  AND p.code IN ('lead.read','opportunity.read','proposal.read','product.read')
ON CONFLICT DO NOTHING;