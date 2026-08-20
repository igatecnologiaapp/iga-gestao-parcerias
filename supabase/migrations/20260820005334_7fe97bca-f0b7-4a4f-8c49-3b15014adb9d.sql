
-- ================= AUDIT =================
CREATE TABLE public.audit_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id uuid,
  company_id uuid REFERENCES public.companies(id) ON DELETE SET NULL,
  action text NOT NULL,
  object_type text NOT NULL,
  object_id text,
  before_state jsonb,
  after_state jsonb,
  context jsonb NOT NULL DEFAULT '{}'::jsonb,
  correlation_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_audit_company ON public.audit_events(company_id, created_at DESC);
CREATE INDEX idx_audit_object ON public.audit_events(object_type, object_id);

GRANT SELECT, INSERT ON public.audit_events TO authenticated;
GRANT SELECT, INSERT ON public.audit_events TO service_role;
REVOKE UPDATE, DELETE, TRUNCATE ON public.audit_events FROM authenticated, anon, service_role;
ALTER TABLE public.audit_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY audit_select ON public.audit_events FOR SELECT TO authenticated
  USING (public.has_permission(auth.uid(), company_id, 'audit.read') OR public.is_platform_admin(auth.uid()));
CREATE POLICY audit_insert ON public.audit_events FOR INSERT TO authenticated
  WITH CHECK (actor_id = auth.uid());
-- no UPDATE/DELETE policies: immutable by default deny
CREATE OR REPLACE FUNCTION public.tg_audit_immutable()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN RAISE EXCEPTION 'audit_events is append-only'; END; $$;
CREATE TRIGGER t_audit_no_update BEFORE UPDATE OR DELETE ON public.audit_events
FOR EACH ROW EXECUTE FUNCTION public.tg_audit_immutable();

CREATE OR REPLACE FUNCTION public.log_audit_event(
  _company_id uuid, _action text, _object_type text, _object_id text,
  _before jsonb DEFAULT NULL, _after jsonb DEFAULT NULL,
  _context jsonb DEFAULT '{}'::jsonb, _correlation_id uuid DEFAULT NULL
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_id uuid;
BEGIN
  INSERT INTO public.audit_events(actor_id, company_id, action, object_type, object_id, before_state, after_state, context, correlation_id)
  VALUES (auth.uid(), _company_id, _action, _object_type, _object_id, _before, _after, COALESCE(_context,'{}'::jsonb), _correlation_id)
  RETURNING id INTO v_id;
  RETURN v_id;
END; $$;
REVOKE ALL ON FUNCTION public.log_audit_event(uuid,text,text,text,jsonb,jsonb,jsonb,uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.log_audit_event(uuid,text,text,text,jsonb,jsonb,jsonb,uuid) TO authenticated, service_role;

-- generic table auditing trigger
CREATE OR REPLACE FUNCTION public.tg_audit_row()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_company uuid; v_before jsonb; v_after jsonb; v_id text;
BEGIN
  v_before := CASE WHEN TG_OP = 'INSERT' THEN NULL ELSE to_jsonb(OLD) END;
  v_after  := CASE WHEN TG_OP = 'DELETE' THEN NULL ELSE to_jsonb(NEW) END;
  v_id := COALESCE(v_after->>'id', v_before->>'id');
  v_company := NULLIF(COALESCE(v_after->>'company_id', v_before->>'company_id'), '')::uuid;
  INSERT INTO public.audit_events(actor_id, company_id, action, object_type, object_id, before_state, after_state)
  VALUES (auth.uid(), v_company, lower(TG_OP), TG_TABLE_NAME, v_id, v_before, v_after);
  RETURN COALESCE(NEW, OLD);
END; $$;

CREATE TRIGGER t_audit_role_assignments AFTER INSERT OR UPDATE OR DELETE ON public.role_assignments
FOR EACH ROW EXECUTE FUNCTION public.tg_audit_row();
CREATE TRIGGER t_audit_memberships AFTER INSERT OR UPDATE OR DELETE ON public.memberships
FOR EACH ROW EXECUTE FUNCTION public.tg_audit_row();
CREATE TRIGGER t_audit_companies AFTER INSERT OR UPDATE OR DELETE ON public.companies
FOR EACH ROW EXECUTE FUNCTION public.tg_audit_row();
CREATE TRIGGER t_audit_units AFTER INSERT OR UPDATE OR DELETE ON public.units
FOR EACH ROW EXECUTE FUNCTION public.tg_audit_row();

-- ================= SETTINGS =================
CREATE TABLE public.company_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  key text NOT NULL,
  value jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (company_id, key)
);
CREATE TRIGGER t_settings_upd BEFORE UPDATE ON public.company_settings FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();
GRANT SELECT, INSERT, UPDATE, DELETE ON public.company_settings TO authenticated;
GRANT ALL ON public.company_settings TO service_role;
ALTER TABLE public.company_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY settings_select ON public.company_settings FOR SELECT TO authenticated
  USING (company_id IN (SELECT public.my_company_ids()));
CREATE POLICY settings_write ON public.company_settings FOR ALL TO authenticated
  USING (public.has_permission(auth.uid(), company_id, 'settings.manage'))
  WITH CHECK (public.has_permission(auth.uid(), company_id, 'settings.manage'));

-- ================= POLICY VERSIONS =================
CREATE TABLE public.policies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  code text NOT NULL,
  name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (company_id, code)
);
CREATE TABLE public.policy_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  policy_id uuid NOT NULL REFERENCES public.policies(id) ON DELETE CASCADE,
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  version integer NOT NULL,
  content jsonb NOT NULL DEFAULT '{}'::jsonb,
  effective_from timestamptz NOT NULL DEFAULT now(),
  effective_to timestamptz,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (policy_id, version)
);
GRANT SELECT, INSERT ON public.policies, public.policy_versions TO authenticated;
GRANT ALL ON public.policies, public.policy_versions TO service_role;
ALTER TABLE public.policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.policy_versions ENABLE ROW LEVEL SECURITY;
CREATE POLICY policies_select ON public.policies FOR SELECT TO authenticated
  USING (company_id IN (SELECT public.my_company_ids()));
CREATE POLICY policies_insert ON public.policies FOR INSERT TO authenticated
  WITH CHECK (public.has_permission(auth.uid(), company_id, 'policy.manage'));
CREATE POLICY pv_select ON public.policy_versions FOR SELECT TO authenticated
  USING (company_id IN (SELECT public.my_company_ids()));
CREATE POLICY pv_insert ON public.policy_versions FOR INSERT TO authenticated
  WITH CHECK (public.has_permission(auth.uid(), company_id, 'policy.manage'));
CREATE OR REPLACE FUNCTION public.tg_policy_version_immutable()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN RAISE EXCEPTION 'policy versions are immutable'; END; $$;
CREATE TRIGGER t_pv_immutable BEFORE UPDATE OR DELETE ON public.policy_versions
FOR EACH ROW EXECUTE FUNCTION public.tg_policy_version_immutable();

-- ================= ATTACHMENTS =================
CREATE TABLE public.attachments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  object_type text NOT NULL,
  object_id text,
  storage_path text NOT NULL UNIQUE,
  file_name text NOT NULL,
  mime_type text,
  size_bytes bigint,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  uploaded_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_attachments_company ON public.attachments(company_id);
GRANT SELECT, INSERT, DELETE ON public.attachments TO authenticated;
GRANT ALL ON public.attachments TO service_role;
ALTER TABLE public.attachments ENABLE ROW LEVEL SECURITY;
CREATE POLICY att_select ON public.attachments FOR SELECT TO authenticated
  USING (company_id IN (SELECT public.my_company_ids()) AND public.has_permission(auth.uid(), company_id, 'attachment.read'));
CREATE POLICY att_insert ON public.attachments FOR INSERT TO authenticated
  WITH CHECK (uploaded_by = auth.uid() AND public.has_permission(auth.uid(), company_id, 'attachment.write'));
CREATE POLICY att_delete ON public.attachments FOR DELETE TO authenticated
  USING (public.has_permission(auth.uid(), company_id, 'attachment.write'));

-- ================= IDEMPOTENCY =================
CREATE TABLE public.idempotency_keys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES public.companies(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  key text NOT NULL,
  operation text NOT NULL,
  request_hash text NOT NULL,
  status text NOT NULL DEFAULT 'completed',
  response jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (operation, key)
);
GRANT SELECT ON public.idempotency_keys TO authenticated;
GRANT ALL ON public.idempotency_keys TO service_role;
ALTER TABLE public.idempotency_keys ENABLE ROW LEVEL SECURITY;
CREATE POLICY idem_select ON public.idempotency_keys FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- returns: {status: 'replayed'|'created'|'conflict', response: jsonb}
CREATE OR REPLACE FUNCTION public.claim_idempotency_key(
  _company_id uuid, _operation text, _key text, _request jsonb, _response jsonb DEFAULT NULL
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_hash text; v_row public.idempotency_keys;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'unauthenticated'; END IF;
  IF _company_id IS NOT NULL AND NOT public.is_company_member(auth.uid(), _company_id) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  v_hash := encode(digest(COALESCE(_request,'{}'::jsonb)::text, 'sha256'), 'hex');
  SELECT * INTO v_row FROM public.idempotency_keys WHERE operation = _operation AND key = _key;
  IF FOUND THEN
    IF v_row.request_hash <> v_hash THEN
      RETURN jsonb_build_object('status','conflict');
    END IF;
    RETURN jsonb_build_object('status','replayed','response', v_row.response);
  END IF;
  INSERT INTO public.idempotency_keys(company_id, user_id, key, operation, request_hash, response)
  VALUES (_company_id, auth.uid(), _key, _operation, v_hash, _response);
  RETURN jsonb_build_object('status','created','response', _response);
EXCEPTION WHEN unique_violation THEN
  SELECT * INTO v_row FROM public.idempotency_keys WHERE operation = _operation AND key = _key;
  IF v_row.request_hash <> v_hash THEN RETURN jsonb_build_object('status','conflict'); END IF;
  RETURN jsonb_build_object('status','replayed','response', v_row.response);
END; $$;
REVOKE ALL ON FUNCTION public.claim_idempotency_key(uuid,text,text,jsonb,jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.claim_idempotency_key(uuid,text,text,jsonb,jsonb) TO authenticated, service_role;

-- ================= SEQUENCES =================
CREATE TABLE public.sequence_counters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  scope_key text NOT NULL,
  prefix text NOT NULL DEFAULT '',
  current_value bigint NOT NULL DEFAULT 0,
  padding integer NOT NULL DEFAULT 6,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (company_id, scope_key)
);
GRANT SELECT ON public.sequence_counters TO authenticated;
GRANT ALL ON public.sequence_counters TO service_role;
ALTER TABLE public.sequence_counters ENABLE ROW LEVEL SECURITY;
CREATE POLICY seq_select ON public.sequence_counters FOR SELECT TO authenticated
  USING (company_id IN (SELECT public.my_company_ids()));

CREATE OR REPLACE FUNCTION public.next_sequence_value(_company_id uuid, _scope_key text, _prefix text DEFAULT '')
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_val bigint; v_prefix text; v_pad integer;
BEGIN
  IF auth.uid() IS NOT NULL AND NOT public.is_company_member(auth.uid(), _company_id) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  INSERT INTO public.sequence_counters(company_id, scope_key, prefix, current_value)
  VALUES (_company_id, _scope_key, _prefix, 0)
  ON CONFLICT (company_id, scope_key) DO NOTHING;

  UPDATE public.sequence_counters
     SET current_value = current_value + 1, updated_at = now()
   WHERE company_id = _company_id AND scope_key = _scope_key
  RETURNING current_value, prefix, padding INTO v_val, v_prefix, v_pad;

  RETURN COALESCE(NULLIF(v_prefix,''), _scope_key) || '-' || lpad(v_val::text, v_pad, '0');
END; $$;
REVOKE ALL ON FUNCTION public.next_sequence_value(uuid,text,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.next_sequence_value(uuid,text,text) TO authenticated, service_role;

-- ================= NOTIFICATIONS =================
CREATE TABLE public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  company_id uuid REFERENCES public.companies(id) ON DELETE CASCADE,
  title text NOT NULL,
  body text,
  category text NOT NULL DEFAULT 'system',
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_notifications_user ON public.notifications(user_id, created_at DESC);
GRANT SELECT, UPDATE ON public.notifications TO authenticated;
GRANT ALL ON public.notifications TO service_role;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY notif_select ON public.notifications FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY notif_update ON public.notifications FOR UPDATE TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE OR REPLACE FUNCTION public.notify_user(_user_id uuid, _company_id uuid, _title text, _body text DEFAULT NULL, _category text DEFAULT 'system', _payload jsonb DEFAULT '{}'::jsonb)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_id uuid;
BEGIN
  IF _company_id IS NOT NULL AND NOT public.has_permission(auth.uid(), _company_id, 'notification.send') THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  INSERT INTO public.notifications(user_id, company_id, title, body, category, payload)
  VALUES (_user_id, _company_id, _title, _body, _category, COALESCE(_payload,'{}'::jsonb))
  RETURNING id INTO v_id;
  RETURN v_id;
END; $$;
REVOKE ALL ON FUNCTION public.notify_user(uuid,uuid,text,text,text,jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.notify_user(uuid,uuid,text,text,text,jsonb) TO authenticated, service_role;

-- ================= APPROVALS (infra mínima) =================
CREATE TABLE public.approval_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  object_type text NOT NULL,
  object_id text,
  reference text,
  status text NOT NULL DEFAULT 'pending',
  requested_by uuid NOT NULL,
  decided_by uuid,
  decided_at timestamptz,
  decision_reason text,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TRIGGER t_appr_upd BEFORE UPDATE ON public.approval_requests FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();
CREATE TRIGGER t_audit_approvals AFTER INSERT OR UPDATE OR DELETE ON public.approval_requests
FOR EACH ROW EXECUTE FUNCTION public.tg_audit_row();
GRANT SELECT, INSERT, UPDATE ON public.approval_requests TO authenticated;
GRANT ALL ON public.approval_requests TO service_role;
ALTER TABLE public.approval_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY appr_select ON public.approval_requests FOR SELECT TO authenticated
  USING (company_id IN (SELECT public.my_company_ids()) AND (requested_by = auth.uid() OR public.has_permission(auth.uid(), company_id, 'approval.decide')));
CREATE POLICY appr_insert ON public.approval_requests FOR INSERT TO authenticated
  WITH CHECK (requested_by = auth.uid() AND public.has_permission(auth.uid(), company_id, 'approval.request'));
CREATE POLICY appr_update ON public.approval_requests FOR UPDATE TO authenticated
  USING (public.has_permission(auth.uid(), company_id, 'approval.decide'))
  WITH CHECK (public.has_permission(auth.uid(), company_id, 'approval.decide'));

-- ================= LAST ADMIN PROTECTION =================
CREATE OR REPLACE FUNCTION public.tg_protect_last_admin()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_code text; v_remaining int;
BEGIN
  SELECT code INTO v_code FROM public.roles WHERE id = OLD.role_id;
  IF v_code <> 'company_admin' OR OLD.company_id IS NULL THEN RETURN NEW; END IF;
  IF TG_OP = 'UPDATE' AND OLD.revoked_at IS NULL AND (NEW.revoked_at IS NOT NULL OR (NEW.valid_until IS NOT NULL AND NEW.valid_until <= now())) THEN
    SELECT count(*) INTO v_remaining
    FROM public.role_assignments ra JOIN public.roles r ON r.id = ra.role_id
    WHERE r.code = 'company_admin' AND ra.company_id = OLD.company_id
      AND ra.id <> OLD.id AND ra.revoked_at IS NULL
      AND ra.valid_from <= now() AND (ra.valid_until IS NULL OR ra.valid_until > now());
    IF v_remaining = 0 THEN
      RAISE EXCEPTION 'A empresa deve manter ao menos um administrador ativo';
    END IF;
  END IF;
  RETURN NEW;
END; $$;
CREATE TRIGGER t_protect_last_admin BEFORE UPDATE ON public.role_assignments
FOR EACH ROW EXECUTE FUNCTION public.tg_protect_last_admin();

-- no self elevation, defense in depth beyond RLS
CREATE OR REPLACE FUNCTION public.tg_no_self_elevation()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NOT NULL AND NEW.user_id = auth.uid() THEN
    RAISE EXCEPTION 'Autoelevação não permitida';
  END IF;
  RETURN NEW;
END; $$;
CREATE TRIGGER t_no_self_elevation BEFORE INSERT OR UPDATE ON public.role_assignments
FOR EACH ROW EXECUTE FUNCTION public.tg_no_self_elevation();

-- ================= SEED ROLES / PERMISSIONS =================
INSERT INTO public.roles(code, name, scope, is_system) VALUES
  ('platform_admin','Administrador da Plataforma','platform',true),
  ('company_admin','Administrador da Empresa','company',true),
  ('company_auditor','Auditor da Empresa','company',true),
  ('unit_manager','Gestor de Unidade','unit',true),
  ('member','Membro','company',true);

INSERT INTO public.permissions(code, module, description) VALUES
  ('company.read','empresa','Visualizar empresa'),
  ('company.update','empresa','Editar empresa'),
  ('unit.manage','empresa','Gerenciar unidades'),
  ('user.read','usuarios','Visualizar usuários da empresa'),
  ('membership.manage','usuarios','Gerenciar vínculos de usuários'),
  ('role.assign','rbac','Atribuir e revogar papéis'),
  ('audit.read','auditoria','Consultar trilha de auditoria'),
  ('settings.manage','configuracoes','Gerenciar configurações'),
  ('policy.manage','governanca','Gerenciar políticas versionadas'),
  ('attachment.read','anexos','Visualizar anexos'),
  ('attachment.write','anexos','Enviar e excluir anexos'),
  ('notification.send','notificacoes','Enviar notificações'),
  ('approval.request','aprovacoes','Solicitar aprovação'),
  ('approval.decide','aprovacoes','Decidir aprovação'),
  ('sequence.use','sequencias','Gerar numeração');

INSERT INTO public.role_permissions(role_id, permission_id)
SELECT r.id, p.id FROM public.roles r CROSS JOIN public.permissions p
WHERE r.code IN ('platform_admin','company_admin');

INSERT INTO public.role_permissions(role_id, permission_id)
SELECT r.id, p.id FROM public.roles r JOIN public.permissions p ON p.code IN ('company.read','user.read','audit.read','attachment.read')
WHERE r.code = 'company_auditor';

INSERT INTO public.role_permissions(role_id, permission_id)
SELECT r.id, p.id FROM public.roles r JOIN public.permissions p ON p.code IN ('company.read','user.read','attachment.read','attachment.write','approval.request','sequence.use')
WHERE r.code = 'unit_manager';

INSERT INTO public.role_permissions(role_id, permission_id)
SELECT r.id, p.id FROM public.roles r JOIN public.permissions p ON p.code IN ('company.read','attachment.read')
WHERE r.code = 'member';
