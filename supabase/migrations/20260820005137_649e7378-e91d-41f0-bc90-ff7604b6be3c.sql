
-- ============ ENUMS ============
CREATE TYPE public.role_scope AS ENUM ('platform','company','unit');
CREATE TYPE public.record_status AS ENUM ('active','inactive','suspended');

-- ============ UTIL ============
CREATE OR REPLACE FUNCTION public.tg_set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

-- ============ COMPANIES ============
CREATE TABLE public.companies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  legal_name text,
  tax_id text UNIQUE,
  status public.record_status NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.units (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name text NOT NULL,
  code text,
  status public.record_status NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (company_id, code)
);
CREATE INDEX idx_units_company ON public.units(company_id);

CREATE TABLE public.profiles (
  id uuid PRIMARY KEY,
  full_name text,
  email text,
  phone text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.memberships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  default_unit_id uuid REFERENCES public.units(id) ON DELETE SET NULL,
  status public.record_status NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, company_id)
);
CREATE INDEX idx_memberships_user ON public.memberships(user_id);
CREATE INDEX idx_memberships_company ON public.memberships(company_id);

CREATE TABLE public.roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  name text NOT NULL,
  scope public.role_scope NOT NULL,
  is_system boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  module text NOT NULL,
  description text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.role_permissions (
  role_id uuid NOT NULL REFERENCES public.roles(id) ON DELETE CASCADE,
  permission_id uuid NOT NULL REFERENCES public.permissions(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (role_id, permission_id)
);

CREATE TABLE public.role_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  role_id uuid NOT NULL REFERENCES public.roles(id) ON DELETE RESTRICT,
  scope public.role_scope NOT NULL,
  company_id uuid REFERENCES public.companies(id) ON DELETE CASCADE,
  unit_id uuid REFERENCES public.units(id) ON DELETE CASCADE,
  valid_from timestamptz NOT NULL DEFAULT now(),
  valid_until timestamptz,
  revoked_at timestamptz,
  revoked_by uuid,
  granted_by uuid,
  reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT ra_scope_shape CHECK (
    (scope = 'platform' AND company_id IS NULL AND unit_id IS NULL) OR
    (scope = 'company'  AND company_id IS NOT NULL AND unit_id IS NULL) OR
    (scope = 'unit'     AND company_id IS NOT NULL AND unit_id IS NOT NULL)
  )
);
CREATE INDEX idx_ra_user ON public.role_assignments(user_id);
CREATE INDEX idx_ra_company ON public.role_assignments(company_id);
CREATE UNIQUE INDEX uq_ra_active ON public.role_assignments(user_id, role_id, COALESCE(company_id,'00000000-0000-0000-0000-000000000000'::uuid), COALESCE(unit_id,'00000000-0000-0000-0000-000000000000'::uuid)) WHERE revoked_at IS NULL;

CREATE TRIGGER t_companies_upd BEFORE UPDATE ON public.companies FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();
CREATE TRIGGER t_units_upd BEFORE UPDATE ON public.units FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();
CREATE TRIGGER t_profiles_upd BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();
CREATE TRIGGER t_memberships_upd BEFORE UPDATE ON public.memberships FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();
CREATE TRIGGER t_ra_upd BEFORE UPDATE ON public.role_assignments FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- ============ AUTHZ FUNCTIONS (security definer) ============
CREATE OR REPLACE FUNCTION public.is_user_active(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE((SELECT p.is_active FROM public.profiles p WHERE p.id = _user_id), false);
$$;

CREATE OR REPLACE FUNCTION public.is_platform_admin(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.is_user_active(_user_id) AND EXISTS (
    SELECT 1 FROM public.role_assignments ra
    JOIN public.roles r ON r.id = ra.role_id
    WHERE ra.user_id = _user_id
      AND r.code = 'platform_admin'
      AND ra.scope = 'platform'
      AND ra.revoked_at IS NULL
      AND ra.valid_from <= now()
      AND (ra.valid_until IS NULL OR ra.valid_until > now())
  );
$$;

CREATE OR REPLACE FUNCTION public.is_company_member(_user_id uuid, _company_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.is_user_active(_user_id) AND EXISTS (
    SELECT 1 FROM public.memberships m
    WHERE m.user_id = _user_id AND m.company_id = _company_id AND m.status = 'active'
  );
$$;

-- default deny: no permission => false. platform_admin does NOT bypass company isolation implicitly
CREATE OR REPLACE FUNCTION public.has_permission(_user_id uuid, _company_id uuid, _permission text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.is_user_active(_user_id) AND EXISTS (
    SELECT 1
    FROM public.role_assignments ra
    JOIN public.role_permissions rp ON rp.role_id = ra.role_id
    JOIN public.permissions perm ON perm.id = rp.permission_id
    WHERE ra.user_id = _user_id
      AND perm.code = _permission
      AND ra.revoked_at IS NULL
      AND ra.valid_from <= now()
      AND (ra.valid_until IS NULL OR ra.valid_until > now())
      AND (
        ra.scope = 'platform'
        OR (_company_id IS NOT NULL AND ra.company_id = _company_id
            AND EXISTS (SELECT 1 FROM public.memberships m
                        WHERE m.user_id = _user_id AND m.company_id = _company_id AND m.status = 'active'))
      )
  );
$$;

CREATE OR REPLACE FUNCTION public.my_company_ids()
RETURNS SETOF uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT m.company_id FROM public.memberships m
  WHERE m.user_id = auth.uid() AND m.status = 'active' AND public.is_user_active(auth.uid());
$$;

-- ============ GRANTS ============
GRANT SELECT ON public.companies TO authenticated;
GRANT INSERT, UPDATE ON public.companies TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.units TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.memberships TO authenticated;
GRANT SELECT ON public.roles TO authenticated;
GRANT SELECT ON public.permissions TO authenticated;
GRANT SELECT ON public.role_permissions TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.role_assignments TO authenticated;
GRANT ALL ON public.companies, public.units, public.profiles, public.memberships,
  public.roles, public.permissions, public.role_permissions, public.role_assignments TO service_role;

-- ============ RLS ============
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.units ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.role_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY companies_select ON public.companies FOR SELECT TO authenticated
  USING (id IN (SELECT public.my_company_ids()) OR public.is_platform_admin(auth.uid()));
CREATE POLICY companies_insert ON public.companies FOR INSERT TO authenticated
  WITH CHECK (public.is_platform_admin(auth.uid()));
CREATE POLICY companies_update ON public.companies FOR UPDATE TO authenticated
  USING (public.has_permission(auth.uid(), id, 'company.update'))
  WITH CHECK (public.has_permission(auth.uid(), id, 'company.update'));

CREATE POLICY units_select ON public.units FOR SELECT TO authenticated
  USING (company_id IN (SELECT public.my_company_ids()) OR public.is_platform_admin(auth.uid()));
CREATE POLICY units_write ON public.units FOR INSERT TO authenticated
  WITH CHECK (public.has_permission(auth.uid(), company_id, 'unit.manage'));
CREATE POLICY units_update ON public.units FOR UPDATE TO authenticated
  USING (public.has_permission(auth.uid(), company_id, 'unit.manage'))
  WITH CHECK (public.has_permission(auth.uid(), company_id, 'unit.manage'));
CREATE POLICY units_delete ON public.units FOR DELETE TO authenticated
  USING (public.has_permission(auth.uid(), company_id, 'unit.manage'));

CREATE POLICY profiles_select_self ON public.profiles FOR SELECT TO authenticated
  USING (
    id = auth.uid()
    OR public.is_platform_admin(auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.memberships m
      WHERE m.user_id = public.profiles.id
        AND m.company_id IN (SELECT public.my_company_ids())
        AND public.has_permission(auth.uid(), m.company_id, 'user.read')
    )
  );
CREATE POLICY profiles_update_self ON public.profiles FOR UPDATE TO authenticated
  USING (id = auth.uid() OR public.is_platform_admin(auth.uid()))
  WITH CHECK (id = auth.uid() OR public.is_platform_admin(auth.uid()));

CREATE POLICY memberships_select ON public.memberships FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR company_id IN (SELECT public.my_company_ids()) OR public.is_platform_admin(auth.uid()));
CREATE POLICY memberships_insert ON public.memberships FOR INSERT TO authenticated
  WITH CHECK (public.has_permission(auth.uid(), company_id, 'membership.manage'));
CREATE POLICY memberships_update ON public.memberships FOR UPDATE TO authenticated
  USING (public.has_permission(auth.uid(), company_id, 'membership.manage'))
  WITH CHECK (public.has_permission(auth.uid(), company_id, 'membership.manage'));
CREATE POLICY memberships_delete ON public.memberships FOR DELETE TO authenticated
  USING (public.has_permission(auth.uid(), company_id, 'membership.manage'));

CREATE POLICY roles_select ON public.roles FOR SELECT TO authenticated USING (true);
CREATE POLICY permissions_select ON public.permissions FOR SELECT TO authenticated USING (true);
CREATE POLICY role_permissions_select ON public.role_permissions FOR SELECT TO authenticated USING (true);

CREATE POLICY ra_select ON public.role_assignments FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR (company_id IS NOT NULL AND company_id IN (SELECT public.my_company_ids())) OR public.is_platform_admin(auth.uid()));
CREATE POLICY ra_insert ON public.role_assignments FOR INSERT TO authenticated
  WITH CHECK (
    user_id <> auth.uid()
    AND granted_by = auth.uid()
    AND (
      (scope = 'platform' AND public.is_platform_admin(auth.uid()))
      OR (scope <> 'platform' AND public.has_permission(auth.uid(), company_id, 'role.assign'))
    )
  );
CREATE POLICY ra_update ON public.role_assignments FOR UPDATE TO authenticated
  USING (
    user_id <> auth.uid() AND (
      (scope = 'platform' AND public.is_platform_admin(auth.uid()))
      OR (scope <> 'platform' AND public.has_permission(auth.uid(), company_id, 'role.assign'))
    )
  )
  WITH CHECK (
    user_id <> auth.uid() AND (
      (scope = 'platform' AND public.is_platform_admin(auth.uid()))
      OR (scope <> 'platform' AND public.has_permission(auth.uid(), company_id, 'role.assign'))
    )
  );

-- ============ PROFILE AUTO-CREATION ============
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email), NEW.email)
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END; $$;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
