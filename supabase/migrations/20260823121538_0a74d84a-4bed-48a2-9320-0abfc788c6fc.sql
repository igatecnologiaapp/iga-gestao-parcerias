-- =====================================================================
-- FASE 2 — PARCEIROS, TERRITÓRIOS E ONBOARDING
-- Reutiliza integralmente a Fundação da Fase 1 (RLS, has_permission,
-- audit trail, anexos, notificações, idempotência, sequências).
-- =====================================================================

-- ============ ENUMS ============
CREATE TYPE public.candidate_status AS ENUM (
  'prospect','triage','prequalified','interview','approved','formalization',
  'onboarding','training','certification','activation',
  'rejected','withdrawn','suspended','archived'
);

CREATE TYPE public.partner_status AS ENUM (
  'onboarding','training','certification_pending','active','attention','suspended','inactive','exit'
);

CREATE TYPE public.territory_scope_type AS ENUM ('country','state','city','region','custom');
CREATE TYPE public.territory_mode AS ENUM ('open','recommended_base','preferred','protected');
CREATE TYPE public.partner_territory_status AS ENUM ('pending','active','revoked','expired');
CREATE TYPE public.checklist_item_status AS ENUM ('pending','in_progress','done','waived','blocked');
CREATE TYPE public.training_status AS ENUM ('not_started','in_progress','completed','failed','expired');
CREATE TYPE public.certification_status AS ENUM ('pending','approved','failed','expired','revoked');

-- ============ PERMISSÕES (framework Fase 1) ============
INSERT INTO public.permissions(code, module, description) VALUES
  ('candidate.read','parceiros','Visualizar candidatos'),
  ('candidate.manage','parceiros','Criar e editar candidatos'),
  ('candidate.evaluate','parceiros','Avaliar e decidir etapas do funil'),
  ('partner.read','parceiros','Visualizar parceiros'),
  ('partner.manage','parceiros','Criar e editar parceiros'),
  ('onboarding.manage','parceiros','Gerenciar onboarding'),
  ('training.manage','parceiros','Gerenciar treinamentos'),
  ('certification.manage','parceiros','Gerenciar certificações'),
  ('territory.read','territorios','Visualizar territórios'),
  ('territory.manage','territorios','Gerenciar territórios'),
  ('payee.read_masked','pagamentos','Visualizar dados de pagamento mascarados'),
  ('payee.manage','pagamentos','Gerenciar dados de pagamento')
ON CONFLICT (code) DO NOTHING;

INSERT INTO public.role_permissions(role_id, permission_id)
SELECT r.id, p.id FROM public.roles r CROSS JOIN public.permissions p
WHERE r.code IN ('platform_admin','company_admin')
ON CONFLICT DO NOTHING;

INSERT INTO public.role_permissions(role_id, permission_id)
SELECT r.id, p.id FROM public.roles r JOIN public.permissions p
  ON p.code IN ('candidate.read','partner.read','territory.read','payee.read_masked')
WHERE r.code = 'company_auditor'
ON CONFLICT DO NOTHING;

INSERT INTO public.role_permissions(role_id, permission_id)
SELECT r.id, p.id FROM public.roles r JOIN public.permissions p
  ON p.code IN ('candidate.read','candidate.manage','candidate.evaluate','partner.read',
                'onboarding.manage','training.manage','territory.read','payee.read_masked')
WHERE r.code = 'unit_manager'
ON CONFLICT DO NOTHING;

-- ============ CANDIDATES ============
CREATE TABLE public.candidates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  unit_id uuid REFERENCES public.units(id) ON DELETE SET NULL,
  code text,
  full_name text NOT NULL,
  document text,
  email text,
  phone text,
  whatsapp text,
  city text,
  state text,
  source_channel text,
  campaign text,
  referral text,
  approach text,
  experience text,
  notes text,
  owner_id uuid,
  status public.candidate_status NOT NULL DEFAULT 'prospect',
  status_changed_at timestamptz NOT NULL DEFAULT now(),
  applied_at timestamptz NOT NULL DEFAULT now(),
  approved_at timestamptz,
  closed_at timestamptz,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_candidates_company ON public.candidates(company_id, status);
GRANT SELECT, INSERT, UPDATE ON public.candidates TO authenticated;
GRANT ALL ON public.candidates TO service_role;
ALTER TABLE public.candidates ENABLE ROW LEVEL SECURITY;
CREATE POLICY cand_select ON public.candidates FOR SELECT TO authenticated
  USING (public.has_permission(auth.uid(), company_id, 'candidate.read'));
CREATE POLICY cand_insert ON public.candidates FOR INSERT TO authenticated
  WITH CHECK (public.has_permission(auth.uid(), company_id, 'candidate.manage'));
CREATE POLICY cand_update ON public.candidates FOR UPDATE TO authenticated
  USING (public.has_permission(auth.uid(), company_id, 'candidate.manage')
         OR public.has_permission(auth.uid(), company_id, 'candidate.evaluate'))
  WITH CHECK (public.has_permission(auth.uid(), company_id, 'candidate.manage')
         OR public.has_permission(auth.uid(), company_id, 'candidate.evaluate'));

CREATE TRIGGER t_candidates_upd BEFORE UPDATE ON public.candidates
FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();
CREATE TRIGGER t_audit_candidates AFTER INSERT OR UPDATE OR DELETE ON public.candidates
FOR EACH ROW EXECUTE FUNCTION public.tg_audit_row();

-- histórico append-only de transições
CREATE TABLE public.candidate_stage_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.candidates(id) ON DELETE CASCADE,
  candidate_id uuid NOT NULL REFERENCES public.candidates(id) ON DELETE CASCADE,
  from_status public.candidate_status,
  to_status public.candidate_status NOT NULL,
  actor_id uuid,
  reason text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_cse_candidate ON public.candidate_stage_events(candidate_id, created_at DESC);
GRANT SELECT ON public.candidate_stage_events TO authenticated;
GRANT ALL ON public.candidate_stage_events TO service_role;
ALTER TABLE public.candidate_stage_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY cse_select ON public.candidate_stage_events FOR SELECT TO authenticated
  USING (public.has_permission(auth.uid(), company_id, 'candidate.read'));

CREATE OR REPLACE FUNCTION public.tg_candidate_stage_immutable()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN RAISE EXCEPTION 'candidate_stage_events is append-only'; END; $$;
CREATE TRIGGER t_cse_immutable BEFORE UPDATE OR DELETE ON public.candidate_stage_events
FOR EACH ROW EXECUTE FUNCTION public.tg_candidate_stage_immutable();

-- máquina de estados do candidato
CREATE OR REPLACE FUNCTION public.candidate_transition_allowed(_from public.candidate_status, _to public.candidate_status)
RETURNS boolean LANGUAGE sql IMMUTABLE SET search_path = public AS $$
  SELECT CASE
    WHEN _from = _to THEN true
    WHEN _from IN ('rejected','withdrawn','archived') THEN _to = 'archived'
    WHEN _to IN ('rejected','withdrawn','suspended','archived') THEN true
    WHEN _from = 'suspended' THEN _to IN ('prospect','triage','prequalified','interview','approved','formalization','onboarding','training','certification','activation')
    WHEN _from = 'prospect' THEN _to = 'triage'
    WHEN _from = 'triage' THEN _to = 'prequalified'
    WHEN _from = 'prequalified' THEN _to = 'interview'
    WHEN _from = 'interview' THEN _to = 'approved'
    WHEN _from = 'approved' THEN _to = 'formalization'
    WHEN _from = 'formalization' THEN _to = 'onboarding'
    WHEN _from = 'onboarding' THEN _to = 'training'
    WHEN _from = 'training' THEN _to = 'certification'
    WHEN _from = 'certification' THEN _to = 'activation'
    ELSE false
  END;
$$;

CREATE OR REPLACE FUNCTION public.tg_candidate_status_guard()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.candidate_stage_events(company_id, candidate_id, from_status, to_status, actor_id)
    VALUES (NEW.company_id, NEW.id, NULL, NEW.status, auth.uid());
    RETURN NEW;
  END IF;
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    IF NOT public.candidate_transition_allowed(OLD.status, NEW.status) THEN
      RAISE EXCEPTION 'Transição de status inválida: % -> %', OLD.status, NEW.status;
    END IF;
    NEW.status_changed_at := now();
    IF NEW.status = 'approved' AND NEW.approved_at IS NULL THEN NEW.approved_at := now(); END IF;
    IF NEW.status IN ('rejected','withdrawn','archived') AND NEW.closed_at IS NULL THEN NEW.closed_at := now(); END IF;
    INSERT INTO public.candidate_stage_events(company_id, candidate_id, from_status, to_status, actor_id)
    VALUES (NEW.company_id, NEW.id, OLD.status, NEW.status, auth.uid());
  END IF;
  RETURN NEW;
END; $$;
CREATE TRIGGER t_candidate_status_guard BEFORE UPDATE ON public.candidates
FOR EACH ROW EXECUTE FUNCTION public.tg_candidate_status_guard();
CREATE TRIGGER t_candidate_status_init AFTER INSERT ON public.candidates
FOR EACH ROW EXECUTE FUNCTION public.tg_candidate_status_guard();

-- avaliações
CREATE TABLE public.candidate_evaluations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.candidates(id) ON DELETE CASCADE,
  candidate_id uuid NOT NULL REFERENCES public.candidates(id) ON DELETE CASCADE,
  stage public.candidate_status NOT NULL,
  decision text NOT NULL,
  criteria jsonb NOT NULL DEFAULT '{}'::jsonb,
  notes text,
  evaluator_id uuid NOT NULL,
  evaluated_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.candidate_evaluations TO authenticated;
GRANT ALL ON public.candidate_evaluations TO service_role;
ALTER TABLE public.candidate_evaluations ENABLE ROW LEVEL SECURITY;
CREATE POLICY ceval_select ON public.candidate_evaluations FOR SELECT TO authenticated
  USING (public.has_permission(auth.uid(), company_id, 'candidate.read'));
CREATE POLICY ceval_insert ON public.candidate_evaluations FOR INSERT TO authenticated
  WITH CHECK (evaluator_id = auth.uid() AND public.has_permission(auth.uid(), company_id, 'candidate.evaluate'));
CREATE TRIGGER t_audit_ceval AFTER INSERT OR UPDATE OR DELETE ON public.candidate_evaluations
FOR EACH ROW EXECUTE FUNCTION public.tg_audit_row();

-- ============ PARTNERS ============
CREATE TABLE public.partners (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  candidate_id uuid UNIQUE REFERENCES public.candidates(id) ON DELETE SET NULL,
  user_id uuid,
  code text NOT NULL,
  display_name text NOT NULL,
  document text,
  email text,
  phone text,
  city text,
  state text,
  source_channel text,
  owner_id uuid,
  status public.partner_status NOT NULL DEFAULT 'onboarding',
  status_changed_at timestamptz NOT NULL DEFAULT now(),
  activated_at timestamptz,
  exited_at timestamptz,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (company_id, code)
);
CREATE INDEX idx_partners_company ON public.partners(company_id, status);
CREATE INDEX idx_partners_user ON public.partners(user_id);
GRANT SELECT, INSERT, UPDATE ON public.partners TO authenticated;
GRANT ALL ON public.partners TO service_role;
ALTER TABLE public.partners ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.my_partner_ids()
RETURNS SETOF uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT p.id FROM public.partners p
  WHERE p.user_id = auth.uid() AND public.is_user_active(auth.uid());
$$;
REVOKE EXECUTE ON FUNCTION public.my_partner_ids() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.my_partner_ids() TO authenticated, service_role;

CREATE POLICY partner_select ON public.partners FOR SELECT TO authenticated
  USING (public.has_permission(auth.uid(), company_id, 'partner.read') OR user_id = auth.uid());
CREATE POLICY partner_insert ON public.partners FOR INSERT TO authenticated
  WITH CHECK (public.has_permission(auth.uid(), company_id, 'partner.manage'));
CREATE POLICY partner_update ON public.partners FOR UPDATE TO authenticated
  USING (public.has_permission(auth.uid(), company_id, 'partner.manage'))
  WITH CHECK (public.has_permission(auth.uid(), company_id, 'partner.manage'));

CREATE TRIGGER t_partners_upd BEFORE UPDATE ON public.partners
FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();
CREATE TRIGGER t_audit_partners AFTER INSERT OR UPDATE OR DELETE ON public.partners
FOR EACH ROW EXECUTE FUNCTION public.tg_audit_row();

CREATE OR REPLACE FUNCTION public.tg_partner_status_stamp()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    NEW.status_changed_at := now();
    IF NEW.status = 'active' AND NEW.activated_at IS NULL THEN NEW.activated_at := now(); END IF;
    IF NEW.status = 'exit' AND NEW.exited_at IS NULL THEN NEW.exited_at := now(); END IF;
  END IF;
  RETURN NEW;
END; $$;
CREATE TRIGGER t_partner_status_stamp BEFORE UPDATE ON public.partners
FOR EACH ROW EXECUTE FUNCTION public.tg_partner_status_stamp();

-- ============ TERRITÓRIOS ============
CREATE TABLE public.territories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  code text NOT NULL,
  name text NOT NULL,
  scope_type public.territory_scope_type NOT NULL DEFAULT 'city',
  coverage jsonb NOT NULL DEFAULT '{}'::jsonb,
  default_mode public.territory_mode NOT NULL DEFAULT 'open',
  status public.record_status NOT NULL DEFAULT 'active',
  valid_from timestamptz NOT NULL DEFAULT now(),
  valid_until timestamptz,
  owner_id uuid,
  notes text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (company_id, code)
);
GRANT SELECT, INSERT, UPDATE ON public.territories TO authenticated;
GRANT ALL ON public.territories TO service_role;
ALTER TABLE public.territories ENABLE ROW LEVEL SECURITY;
CREATE POLICY terr_insert ON public.territories FOR INSERT TO authenticated
  WITH CHECK (public.has_permission(auth.uid(), company_id, 'territory.manage'));
CREATE POLICY terr_update ON public.territories FOR UPDATE TO authenticated
  USING (public.has_permission(auth.uid(), company_id, 'territory.manage'))
  WITH CHECK (public.has_permission(auth.uid(), company_id, 'territory.manage'));
CREATE TRIGGER t_terr_upd BEFORE UPDATE ON public.territories
FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();
CREATE TRIGGER t_audit_terr AFTER INSERT OR UPDATE OR DELETE ON public.territories
FOR EACH ROW EXECUTE FUNCTION public.tg_audit_row();

CREATE TABLE public.partner_territories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  partner_id uuid NOT NULL REFERENCES public.partners(id) ON DELETE CASCADE,
  territory_id uuid NOT NULL REFERENCES public.territories(id) ON DELETE CASCADE,
  mode public.territory_mode NOT NULL DEFAULT 'open',
  status public.partner_territory_status NOT NULL DEFAULT 'pending',
  valid_from timestamptz NOT NULL DEFAULT now(),
  valid_until timestamptz,
  approved_by uuid,
  approved_at timestamptz,
  reason text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_pt_partner ON public.partner_territories(partner_id, status);
GRANT SELECT, INSERT, UPDATE ON public.partner_territories TO authenticated;
GRANT ALL ON public.partner_territories TO service_role;
ALTER TABLE public.partner_territories ENABLE ROW LEVEL SECURITY;
CREATE POLICY pt_select ON public.partner_territories FOR SELECT TO authenticated
  USING (public.has_permission(auth.uid(), company_id, 'territory.read')
         OR partner_id IN (SELECT public.my_partner_ids()));
CREATE POLICY pt_insert ON public.partner_territories FOR INSERT TO authenticated
  WITH CHECK (public.has_permission(auth.uid(), company_id, 'territory.manage'));
CREATE POLICY pt_update ON public.partner_territories FOR UPDATE TO authenticated
  USING (public.has_permission(auth.uid(), company_id, 'territory.manage'))
  WITH CHECK (public.has_permission(auth.uid(), company_id, 'territory.manage'));
CREATE TRIGGER t_pt_upd BEFORE UPDATE ON public.partner_territories
FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();
CREATE TRIGGER t_audit_pt AFTER INSERT OR UPDATE OR DELETE ON public.partner_territories
FOR EACH ROW EXECUTE FUNCTION public.tg_audit_row();

-- política de leitura de territories (depois de partner_territories existir)
CREATE POLICY terr_select ON public.territories FOR SELECT TO authenticated
  USING (public.has_permission(auth.uid(), company_id, 'territory.read')
         OR EXISTS (SELECT 1 FROM public.partner_territories pt
                    WHERE pt.territory_id = territories.id AND pt.partner_id IN (SELECT public.my_partner_ids())));

-- proteção territorial nunca é automática: exige aprovação explícita e vigência
CREATE OR REPLACE FUNCTION public.tg_protected_territory_guard()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.mode = 'protected' AND NEW.status = 'active' THEN
    IF NEW.approved_by IS NULL OR NEW.approved_at IS NULL THEN
      RAISE EXCEPTION 'Território protegido exige aprovação explícita';
    END IF;
    IF NEW.valid_until IS NULL THEN
      RAISE EXCEPTION 'Território protegido exige vigência com término definido';
    END IF;
  END IF;
  RETURN NEW;
END; $$;
CREATE TRIGGER t_protected_guard BEFORE INSERT OR UPDATE ON public.partner_territories
FOR EACH ROW EXECUTE FUNCTION public.tg_protected_territory_guard();

-- ============ ONBOARDING ============
CREATE TABLE public.onboarding_checklists (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  code text NOT NULL,
  name text NOT NULL,
  version integer NOT NULL DEFAULT 1,
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (company_id, code, version)
);
GRANT SELECT, INSERT, UPDATE ON public.onboarding_checklists TO authenticated;
GRANT ALL ON public.onboarding_checklists TO service_role;
ALTER TABLE public.onboarding_checklists ENABLE ROW LEVEL SECURITY;
CREATE POLICY ock_select ON public.onboarding_checklists FOR SELECT TO authenticated
  USING (company_id IN (SELECT public.my_company_ids()));
CREATE POLICY ock_write ON public.onboarding_checklists FOR ALL TO authenticated
  USING (public.has_permission(auth.uid(), company_id, 'onboarding.manage'))
  WITH CHECK (public.has_permission(auth.uid(), company_id, 'onboarding.manage'));

CREATE TABLE public.onboarding_checklist_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  checklist_id uuid NOT NULL REFERENCES public.onboarding_checklists(id) ON DELETE CASCADE,
  code text NOT NULL,
  label text NOT NULL,
  category text NOT NULL DEFAULT 'geral',
  requires_evidence boolean NOT NULL DEFAULT false,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (checklist_id, code)
);
GRANT SELECT, INSERT, UPDATE ON public.onboarding_checklist_items TO authenticated;
GRANT ALL ON public.onboarding_checklist_items TO service_role;
ALTER TABLE public.onboarding_checklist_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY ocki_select ON public.onboarding_checklist_items FOR SELECT TO authenticated
  USING (company_id IN (SELECT public.my_company_ids()));
CREATE POLICY ocki_write ON public.onboarding_checklist_items FOR ALL TO authenticated
  USING (public.has_permission(auth.uid(), company_id, 'onboarding.manage'))
  WITH CHECK (public.has_permission(auth.uid(), company_id, 'onboarding.manage'));

CREATE TABLE public.partner_onboarding_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  partner_id uuid NOT NULL REFERENCES public.partners(id) ON DELETE CASCADE,
  checklist_id uuid REFERENCES public.onboarding_checklists(id) ON DELETE SET NULL,
  item_code text NOT NULL,
  label text NOT NULL,
  category text NOT NULL DEFAULT 'geral',
  status public.checklist_item_status NOT NULL DEFAULT 'pending',
  responsible_id uuid,
  evidence_attachment_id uuid REFERENCES public.attachments(id) ON DELETE SET NULL,
  notes text,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (partner_id, item_code)
);
GRANT SELECT, INSERT, UPDATE ON public.partner_onboarding_items TO authenticated;
GRANT ALL ON public.partner_onboarding_items TO service_role;
ALTER TABLE public.partner_onboarding_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY poi_select ON public.partner_onboarding_items FOR SELECT TO authenticated
  USING (public.has_permission(auth.uid(), company_id, 'onboarding.manage')
         OR public.has_permission(auth.uid(), company_id, 'partner.read')
         OR partner_id IN (SELECT public.my_partner_ids()));
CREATE POLICY poi_insert ON public.partner_onboarding_items FOR INSERT TO authenticated
  WITH CHECK (public.has_permission(auth.uid(), company_id, 'onboarding.manage'));
CREATE POLICY poi_update ON public.partner_onboarding_items FOR UPDATE TO authenticated
  USING (public.has_permission(auth.uid(), company_id, 'onboarding.manage'))
  WITH CHECK (public.has_permission(auth.uid(), company_id, 'onboarding.manage'));
CREATE TRIGGER t_poi_upd BEFORE UPDATE ON public.partner_onboarding_items
FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();
CREATE TRIGGER t_audit_poi AFTER INSERT OR UPDATE OR DELETE ON public.partner_onboarding_items
FOR EACH ROW EXECUTE FUNCTION public.tg_audit_row();

-- ============ ACEITES DE POLÍTICA ============
CREATE TABLE public.partner_policy_acceptances (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  partner_id uuid NOT NULL REFERENCES public.partners(id) ON DELETE CASCADE,
  policy_id uuid NOT NULL REFERENCES public.policies(id) ON DELETE CASCADE,
  policy_version_id uuid NOT NULL REFERENCES public.policy_versions(id) ON DELETE CASCADE,
  accepted_by uuid NOT NULL,
  accepted_at timestamptz NOT NULL DEFAULT now(),
  context jsonb NOT NULL DEFAULT '{}'::jsonb,
  evidence_attachment_id uuid REFERENCES public.attachments(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (partner_id, policy_version_id)
);
GRANT SELECT, INSERT ON public.partner_policy_acceptances TO authenticated;
GRANT ALL ON public.partner_policy_acceptances TO service_role;
ALTER TABLE public.partner_policy_acceptances ENABLE ROW LEVEL SECURITY;
CREATE POLICY ppa_select ON public.partner_policy_acceptances FOR SELECT TO authenticated
  USING (public.has_permission(auth.uid(), company_id, 'partner.read')
         OR partner_id IN (SELECT public.my_partner_ids()));
CREATE POLICY ppa_insert ON public.partner_policy_acceptances FOR INSERT TO authenticated
  WITH CHECK (public.has_permission(auth.uid(), company_id, 'partner.manage')
         OR partner_id IN (SELECT public.my_partner_ids()));
CREATE OR REPLACE FUNCTION public.tg_acceptance_immutable()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN RAISE EXCEPTION 'aceites de política são imutáveis'; END; $$;
CREATE TRIGGER t_ppa_immutable BEFORE UPDATE OR DELETE ON public.partner_policy_acceptances
FOR EACH ROW EXECUTE FUNCTION public.tg_acceptance_immutable();
CREATE TRIGGER t_audit_ppa AFTER INSERT ON public.partner_policy_acceptances
FOR EACH ROW EXECUTE FUNCTION public.tg_audit_row();

-- ============ TREINAMENTO ============
CREATE TABLE public.training_tracks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  code text NOT NULL,
  name text NOT NULL,
  description text,
  is_required boolean NOT NULL DEFAULT true,
  validity_months integer,
  status public.record_status NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (company_id, code)
);
GRANT SELECT, INSERT, UPDATE ON public.training_tracks TO authenticated;
GRANT ALL ON public.training_tracks TO service_role;
ALTER TABLE public.training_tracks ENABLE ROW LEVEL SECURITY;
CREATE POLICY tt_select ON public.training_tracks FOR SELECT TO authenticated
  USING (company_id IN (SELECT public.my_company_ids()));
CREATE POLICY tt_write ON public.training_tracks FOR ALL TO authenticated
  USING (public.has_permission(auth.uid(), company_id, 'training.manage'))
  WITH CHECK (public.has_permission(auth.uid(), company_id, 'training.manage'));
CREATE TRIGGER t_tt_upd BEFORE UPDATE ON public.training_tracks
FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

CREATE TABLE public.training_modules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  track_id uuid NOT NULL REFERENCES public.training_tracks(id) ON DELETE CASCADE,
  code text NOT NULL,
  name text NOT NULL,
  content_url text,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (track_id, code)
);
GRANT SELECT, INSERT, UPDATE ON public.training_modules TO authenticated;
GRANT ALL ON public.training_modules TO service_role;
ALTER TABLE public.training_modules ENABLE ROW LEVEL SECURITY;
CREATE POLICY tm_select ON public.training_modules FOR SELECT TO authenticated
  USING (company_id IN (SELECT public.my_company_ids()));
CREATE POLICY tm_write ON public.training_modules FOR ALL TO authenticated
  USING (public.has_permission(auth.uid(), company_id, 'training.manage'))
  WITH CHECK (public.has_permission(auth.uid(), company_id, 'training.manage'));

CREATE TABLE public.partner_trainings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  partner_id uuid NOT NULL REFERENCES public.partners(id) ON DELETE CASCADE,
  track_id uuid NOT NULL REFERENCES public.training_tracks(id) ON DELETE CASCADE,
  module_id uuid REFERENCES public.training_modules(id) ON DELETE SET NULL,
  status public.training_status NOT NULL DEFAULT 'not_started',
  result text,
  score numeric,
  responsible_id uuid,
  started_at timestamptz,
  completed_at timestamptz,
  valid_until timestamptz,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_ptr_partner ON public.partner_trainings(partner_id, status);
GRANT SELECT, INSERT, UPDATE ON public.partner_trainings TO authenticated;
GRANT ALL ON public.partner_trainings TO service_role;
ALTER TABLE public.partner_trainings ENABLE ROW LEVEL SECURITY;
CREATE POLICY ptr_select ON public.partner_trainings FOR SELECT TO authenticated
  USING (public.has_permission(auth.uid(), company_id, 'training.manage')
         OR public.has_permission(auth.uid(), company_id, 'partner.read')
         OR partner_id IN (SELECT public.my_partner_ids()));
CREATE POLICY ptr_write ON public.partner_trainings FOR ALL TO authenticated
  USING (public.has_permission(auth.uid(), company_id, 'training.manage'))
  WITH CHECK (public.has_permission(auth.uid(), company_id, 'training.manage'));
CREATE TRIGGER t_ptr_upd BEFORE UPDATE ON public.partner_trainings
FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();
CREATE TRIGGER t_audit_ptr AFTER INSERT OR UPDATE OR DELETE ON public.partner_trainings
FOR EACH ROW EXECUTE FUNCTION public.tg_audit_row();

-- ============ CERTIFICAÇÕES ============
CREATE TABLE public.partner_certifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  partner_id uuid NOT NULL REFERENCES public.partners(id) ON DELETE CASCADE,
  type text NOT NULL,
  competency text NOT NULL,
  status public.certification_status NOT NULL DEFAULT 'pending',
  result text,
  issued_at timestamptz,
  valid_until timestamptz,
  responsible_id uuid,
  supersedes_id uuid REFERENCES public.partner_certifications(id) ON DELETE SET NULL,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_pcert_partner ON public.partner_certifications(partner_id, status);
GRANT SELECT, INSERT, UPDATE ON public.partner_certifications TO authenticated;
GRANT ALL ON public.partner_certifications TO service_role;
ALTER TABLE public.partner_certifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY pcert_select ON public.partner_certifications FOR SELECT TO authenticated
  USING (public.has_permission(auth.uid(), company_id, 'certification.manage')
         OR public.has_permission(auth.uid(), company_id, 'partner.read')
         OR partner_id IN (SELECT public.my_partner_ids()));
CREATE POLICY pcert_write ON public.partner_certifications FOR ALL TO authenticated
  USING (public.has_permission(auth.uid(), company_id, 'certification.manage'))
  WITH CHECK (public.has_permission(auth.uid(), company_id, 'certification.manage'));
CREATE TRIGGER t_pcert_upd BEFORE UPDATE ON public.partner_certifications
FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();
CREATE TRIGGER t_audit_pcert AFTER INSERT OR UPDATE OR DELETE ON public.partner_certifications
FOR EACH ROW EXECUTE FUNCTION public.tg_audit_row();

-- ============ PRIMEIROS 90 DIAS ============
CREATE TABLE public.partner_followups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  partner_id uuid NOT NULL REFERENCES public.partners(id) ON DELETE CASCADE,
  milestone text NOT NULL,
  day_offset integer,
  pending_trainings text,
  difficulties text,
  support_needed text,
  activities text,
  evolution text,
  notes text,
  responsible_id uuid,
  occurred_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.partner_followups TO authenticated;
GRANT ALL ON public.partner_followups TO service_role;
ALTER TABLE public.partner_followups ENABLE ROW LEVEL SECURITY;
CREATE POLICY pfu_select ON public.partner_followups FOR SELECT TO authenticated
  USING (public.has_permission(auth.uid(), company_id, 'partner.read')
         OR partner_id IN (SELECT public.my_partner_ids()));
CREATE POLICY pfu_insert ON public.partner_followups FOR INSERT TO authenticated
  WITH CHECK (public.has_permission(auth.uid(), company_id, 'partner.manage'));
CREATE TRIGGER t_audit_pfu AFTER INSERT OR UPDATE OR DELETE ON public.partner_followups
FOR EACH ROW EXECUTE FUNCTION public.tg_audit_row();

-- ============ PAYEE PROFILE ============
-- Estrutura básica: nenhum payout, cálculo de comissão ou integração bancária.
CREATE TABLE public.payee_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  partner_id uuid NOT NULL UNIQUE REFERENCES public.partners(id) ON DELETE CASCADE,
  holder_name text NOT NULL,
  holder_document text NOT NULL,
  payee_type text NOT NULL DEFAULT 'pix',
  bank_code text,
  bank_branch text,
  bank_account text,
  pix_key text,
  ownership_validated boolean NOT NULL DEFAULT false,
  validated_by uuid,
  validated_at timestamptz,
  status public.record_status NOT NULL DEFAULT 'inactive',
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.payee_profiles TO authenticated;
GRANT ALL ON public.payee_profiles TO service_role;
ALTER TABLE public.payee_profiles ENABLE ROW LEVEL SECURITY;
-- Somente payee.manage lê a linha completa. Demais acessos usam a RPC mascarada.
CREATE POLICY payee_select ON public.payee_profiles FOR SELECT TO authenticated
  USING (public.has_permission(auth.uid(), company_id, 'payee.manage'));
CREATE POLICY payee_insert ON public.payee_profiles FOR INSERT TO authenticated
  WITH CHECK (public.has_permission(auth.uid(), company_id, 'payee.manage'));
CREATE POLICY payee_update ON public.payee_profiles FOR UPDATE TO authenticated
  USING (public.has_permission(auth.uid(), company_id, 'payee.manage'))
  WITH CHECK (public.has_permission(auth.uid(), company_id, 'payee.manage'));

CREATE TABLE public.payee_profile_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  payee_profile_id uuid REFERENCES public.payee_profiles(id) ON DELETE CASCADE,
  partner_id uuid NOT NULL REFERENCES public.partners(id) ON DELETE CASCADE,
  event text NOT NULL,
  actor_id uuid,
  changed_fields text[] NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.payee_profile_events TO authenticated;
GRANT ALL ON public.payee_profile_events TO service_role;
ALTER TABLE public.payee_profile_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY ppe_select ON public.payee_profile_events FOR SELECT TO authenticated
  USING (public.has_permission(auth.uid(), company_id, 'payee.manage')
         OR public.has_permission(auth.uid(), company_id, 'audit.read'));
CREATE TRIGGER t_ppe_immutable BEFORE UPDATE OR DELETE ON public.payee_profile_events
FOR EACH ROW EXECUTE FUNCTION public.tg_acceptance_immutable();

-- histórico de alterações sensíveis (sem valores sensíveis em claro no log)
CREATE OR REPLACE FUNCTION public.tg_payee_history()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_fields text[] := '{}';
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.payee_profile_events(company_id, payee_profile_id, partner_id, event, actor_id)
    VALUES (NEW.company_id, NEW.id, NEW.partner_id, 'created', auth.uid());
    RETURN NEW;
  END IF;
  IF NEW.holder_name IS DISTINCT FROM OLD.holder_name THEN v_fields := v_fields || 'holder_name'; END IF;
  IF NEW.holder_document IS DISTINCT FROM OLD.holder_document THEN v_fields := v_fields || 'holder_document'; END IF;
  IF NEW.bank_code IS DISTINCT FROM OLD.bank_code THEN v_fields := v_fields || 'bank_code'; END IF;
  IF NEW.bank_branch IS DISTINCT FROM OLD.bank_branch THEN v_fields := v_fields || 'bank_branch'; END IF;
  IF NEW.bank_account IS DISTINCT FROM OLD.bank_account THEN v_fields := v_fields || 'bank_account'; END IF;
  IF NEW.pix_key IS DISTINCT FROM OLD.pix_key THEN v_fields := v_fields || 'pix_key'; END IF;
  IF NEW.status IS DISTINCT FROM OLD.status THEN v_fields := v_fields || 'status'; END IF;
  IF array_length(v_fields, 1) IS NOT NULL THEN
    INSERT INTO public.payee_profile_events(company_id, payee_profile_id, partner_id, event, actor_id, changed_fields)
    VALUES (NEW.company_id, NEW.id, NEW.partner_id, 'updated', auth.uid(), v_fields);
    INSERT INTO public.audit_events(actor_id, company_id, action, object_type, object_id, context)
    VALUES (auth.uid(), NEW.company_id, 'payee.update', 'payee_profiles', NEW.id::text,
            jsonb_build_object('changed_fields', to_jsonb(v_fields)));
  END IF;
  RETURN NEW;
END; $$;
CREATE TRIGGER t_payee_history AFTER INSERT ON public.payee_profiles
FOR EACH ROW EXECUTE FUNCTION public.tg_payee_history();
CREATE TRIGGER t_payee_history_upd BEFORE UPDATE ON public.payee_profiles
FOR EACH ROW EXECUTE FUNCTION public.tg_payee_history();

CREATE OR REPLACE FUNCTION public.mask_tail(_value text, _visible integer DEFAULT 4)
RETURNS text LANGUAGE sql IMMUTABLE SET search_path = public AS $$
  SELECT CASE
    WHEN _value IS NULL OR length(_value) = 0 THEN NULL
    WHEN length(_value) <= _visible THEN repeat('*', length(_value))
    ELSE repeat('*', length(_value) - _visible) || right(_value, _visible)
  END;
$$;

-- leitura mascarada: exige payee.read_masked OU ser o próprio parceiro
CREATE OR REPLACE FUNCTION public.get_payee_profile_masked(_partner_id uuid)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE v public.payee_profiles; v_company uuid; v_owner uuid;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'unauthenticated'; END IF;
  SELECT company_id, user_id INTO v_company, v_owner FROM public.partners WHERE id = _partner_id;
  IF v_company IS NULL THEN RETURN NULL; END IF;
  IF NOT (public.has_permission(auth.uid(), v_company, 'payee.read_masked')
          OR public.has_permission(auth.uid(), v_company, 'payee.manage')
          OR v_owner = auth.uid()) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  SELECT * INTO v FROM public.payee_profiles WHERE partner_id = _partner_id;
  IF NOT FOUND THEN RETURN NULL; END IF;
  RETURN jsonb_build_object(
    'partner_id', v.partner_id,
    'payee_type', v.payee_type,
    'holder_name', v.holder_name,
    'holder_document', public.mask_tail(v.holder_document, 2),
    'bank_code', v.bank_code,
    'bank_branch', public.mask_tail(v.bank_branch, 1),
    'bank_account', public.mask_tail(v.bank_account, 2),
    'pix_key', public.mask_tail(v.pix_key, 3),
    'ownership_validated', v.ownership_validated,
    'status', v.status,
    'updated_at', v.updated_at
  );
END; $$;
REVOKE EXECUTE ON FUNCTION public.get_payee_profile_masked(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_payee_profile_masked(uuid) TO authenticated, service_role;

-- registro explícito de visualização de dados sensíveis
CREATE OR REPLACE FUNCTION public.log_payee_view(_partner_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_company uuid; v_id uuid;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'unauthenticated'; END IF;
  SELECT company_id INTO v_company FROM public.partners WHERE id = _partner_id;
  IF v_company IS NULL THEN RETURN; END IF;
  IF NOT public.has_permission(auth.uid(), v_company, 'payee.manage') THEN RAISE EXCEPTION 'forbidden'; END IF;
  SELECT id INTO v_id FROM public.payee_profiles WHERE partner_id = _partner_id;
  INSERT INTO public.payee_profile_events(company_id, payee_profile_id, partner_id, event, actor_id)
  VALUES (v_company, v_id, _partner_id, 'viewed_unmasked', auth.uid());
  INSERT INTO public.audit_events(actor_id, company_id, action, object_type, object_id)
  VALUES (auth.uid(), v_company, 'payee.view', 'payee_profiles', COALESCE(v_id::text, _partner_id::text));
END; $$;
REVOKE EXECUTE ON FUNCTION public.log_payee_view(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.log_payee_view(uuid) TO authenticated, service_role;

-- ============ CONVERSÃO CANDIDATE -> PARTNER (idempotente) ============
CREATE OR REPLACE FUNCTION public.convert_candidate_to_partner(
  _candidate_id uuid, _idempotency_key text, _checklist_code text DEFAULT 'onboarding_padrao'
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  c public.candidates; v_partner_id uuid; v_code text; v_claim jsonb; v_checklist uuid;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'unauthenticated'; END IF;
  SELECT * INTO c FROM public.candidates WHERE id = _candidate_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'candidato não encontrado'; END IF;
  IF NOT public.has_permission(auth.uid(), c.company_id, 'partner.manage') THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  IF c.status NOT IN ('approved','formalization','onboarding','training','certification','activation') THEN
    RAISE EXCEPTION 'Candidato precisa estar aprovado/formalizado para conversão (status atual: %)', c.status;
  END IF;

  SELECT id INTO v_partner_id FROM public.partners WHERE candidate_id = _candidate_id;
  IF v_partner_id IS NOT NULL THEN
    RETURN jsonb_build_object('status','replayed','partner_id', v_partner_id);
  END IF;

  v_claim := public.claim_idempotency_key(c.company_id, 'candidate.convert', _idempotency_key,
             jsonb_build_object('candidate_id', _candidate_id));
  IF v_claim->>'status' = 'conflict' THEN
    RETURN jsonb_build_object('status','conflict');
  END IF;
  IF v_claim->>'status' = 'replayed' THEN
    SELECT id INTO v_partner_id FROM public.partners WHERE candidate_id = _candidate_id;
    RETURN jsonb_build_object('status','replayed','partner_id', v_partner_id);
  END IF;

  v_code := public.next_sequence_value(c.company_id, 'partner', 'PAR');

  INSERT INTO public.partners(company_id, candidate_id, code, display_name, document, email, phone,
                              city, state, source_channel, owner_id, status, created_by)
  VALUES (c.company_id, c.id, v_code, c.full_name, c.document, c.email, c.phone,
          c.city, c.state, c.source_channel, c.owner_id, 'onboarding', auth.uid())
  RETURNING id INTO v_partner_id;

  SELECT id INTO v_checklist FROM public.onboarding_checklists
   WHERE company_id = c.company_id AND code = _checklist_code AND is_active
   ORDER BY version DESC LIMIT 1;

  IF v_checklist IS NOT NULL THEN
    INSERT INTO public.partner_onboarding_items(company_id, partner_id, checklist_id, item_code, label, category)
    SELECT c.company_id, v_partner_id, v_checklist, i.code, i.label, i.category
    FROM public.onboarding_checklist_items i WHERE i.checklist_id = v_checklist
    ON CONFLICT DO NOTHING;
  END IF;

  UPDATE public.candidates SET status = 'onboarding'
   WHERE id = c.id AND public.candidate_transition_allowed(c.status, 'onboarding');

  INSERT INTO public.audit_events(actor_id, company_id, action, object_type, object_id, context)
  VALUES (auth.uid(), c.company_id, 'candidate.convert', 'partners', v_partner_id::text,
          jsonb_build_object('candidate_id', c.id, 'partner_code', v_code));

  RETURN jsonb_build_object('status','created','partner_id', v_partner_id, 'code', v_code);
END; $$;
REVOKE EXECUTE ON FUNCTION public.convert_candidate_to_partner(uuid, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.convert_candidate_to_partner(uuid, text, text) TO authenticated, service_role;

-- ============ ATRIBUIÇÃO TERRITORIAL IDEMPOTENTE ============
CREATE OR REPLACE FUNCTION public.assign_partner_territory(
  _partner_id uuid, _territory_id uuid, _mode public.territory_mode,
  _valid_until timestamptz, _reason text, _idempotency_key text
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_company uuid; v_claim jsonb; v_id uuid;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'unauthenticated'; END IF;
  SELECT company_id INTO v_company FROM public.partners WHERE id = _partner_id;
  IF v_company IS NULL THEN RAISE EXCEPTION 'parceiro não encontrado'; END IF;
  IF NOT public.has_permission(auth.uid(), v_company, 'territory.manage') THEN RAISE EXCEPTION 'forbidden'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.territories WHERE id = _territory_id AND company_id = v_company) THEN
    RAISE EXCEPTION 'território inválido para esta empresa';
  END IF;

  v_claim := public.claim_idempotency_key(v_company, 'territory.assign', _idempotency_key,
             jsonb_build_object('partner_id', _partner_id, 'territory_id', _territory_id, 'mode', _mode));
  IF v_claim->>'status' = 'conflict' THEN RETURN jsonb_build_object('status','conflict'); END IF;
  IF v_claim->>'status' = 'replayed' THEN
    SELECT id INTO v_id FROM public.partner_territories
     WHERE partner_id = _partner_id AND territory_id = _territory_id AND status <> 'revoked'
     ORDER BY created_at DESC LIMIT 1;
    RETURN jsonb_build_object('status','replayed','partner_territory_id', v_id);
  END IF;

  -- encerra vigência anterior no mesmo território
  UPDATE public.partner_territories
     SET status = 'revoked', valid_until = now(), reason = COALESCE(reason,'substituído')
   WHERE partner_id = _partner_id AND territory_id = _territory_id AND status IN ('pending','active');

  INSERT INTO public.partner_territories(company_id, partner_id, territory_id, mode, status,
                                         valid_until, reason, created_by,
                                         approved_by, approved_at)
  VALUES (v_company, _partner_id, _territory_id, _mode,
          CASE WHEN _mode = 'protected' THEN 'pending' ELSE 'active' END,
          _valid_until, _reason, auth.uid(),
          CASE WHEN _mode = 'protected' THEN NULL ELSE auth.uid() END,
          CASE WHEN _mode = 'protected' THEN NULL ELSE now() END)
  RETURNING id INTO v_id;

  RETURN jsonb_build_object('status','created','partner_territory_id', v_id);
END; $$;
REVOKE EXECUTE ON FUNCTION public.assign_partner_territory(uuid, uuid, public.territory_mode, timestamptz, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.assign_partner_territory(uuid, uuid, public.territory_mode, timestamptz, text, text) TO authenticated, service_role;

-- ============ ACEITE DE POLÍTICA IDEMPOTENTE ============
CREATE OR REPLACE FUNCTION public.accept_policy_version(
  _partner_id uuid, _policy_version_id uuid, _context jsonb DEFAULT '{}'::jsonb, _idempotency_key text DEFAULT NULL
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_company uuid; v_owner uuid; v_policy uuid; v_pv_company uuid; v_id uuid;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'unauthenticated'; END IF;
  SELECT company_id, user_id INTO v_company, v_owner FROM public.partners WHERE id = _partner_id;
  IF v_company IS NULL THEN RAISE EXCEPTION 'parceiro não encontrado'; END IF;
  IF NOT (public.has_permission(auth.uid(), v_company, 'partner.manage') OR v_owner = auth.uid()) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  SELECT policy_id, company_id INTO v_policy, v_pv_company FROM public.policy_versions WHERE id = _policy_version_id;
  IF v_pv_company IS DISTINCT FROM v_company THEN RAISE EXCEPTION 'versão de política inválida'; END IF;

  SELECT id INTO v_id FROM public.partner_policy_acceptances
   WHERE partner_id = _partner_id AND policy_version_id = _policy_version_id;
  IF v_id IS NOT NULL THEN RETURN jsonb_build_object('status','replayed','acceptance_id', v_id); END IF;

  INSERT INTO public.partner_policy_acceptances(company_id, partner_id, policy_id, policy_version_id, accepted_by, context)
  VALUES (v_company, _partner_id, v_policy, _policy_version_id, auth.uid(), COALESCE(_context,'{}'::jsonb))
  RETURNING id INTO v_id;

  RETURN jsonb_build_object('status','created','acceptance_id', v_id);
END; $$;
REVOKE EXECUTE ON FUNCTION public.accept_policy_version(uuid, uuid, jsonb, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.accept_policy_version(uuid, uuid, jsonb, text) TO authenticated, service_role;