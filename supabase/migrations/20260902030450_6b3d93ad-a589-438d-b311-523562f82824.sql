CREATE OR REPLACE FUNCTION public.tg_protected_territory_guard()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.mode = 'protected' AND NEW.status <> 'revoked'::partner_territory_status THEN
    IF NEW.valid_until IS NULL THEN
      RAISE EXCEPTION 'Território protegido exige vigência com término definido';
    END IF;
    IF NEW.status = 'active'::partner_territory_status AND (NEW.approved_by IS NULL OR NEW.approved_at IS NULL) THEN
      RAISE EXCEPTION 'Território protegido exige aprovação explícita';
    END IF;
    IF EXISTS (
      SELECT 1 FROM public.partner_territories pt
      WHERE pt.territory_id = NEW.territory_id
        AND pt.id <> NEW.id
        AND pt.partner_id <> NEW.partner_id
        AND pt.mode = 'protected'::territory_mode
        AND pt.status IN ('pending'::partner_territory_status, 'active'::partner_territory_status)
        AND tstzrange(pt.valid_from, COALESCE(pt.valid_until, 'infinity'::timestamptz))
            && tstzrange(NEW.valid_from, COALESCE(NEW.valid_until, 'infinity'::timestamptz))
    ) THEN
      RAISE EXCEPTION 'Já existe proteção vigente para este território no período informado';
    END IF;
  END IF;
  RETURN NEW;
END; $function$;

CREATE OR REPLACE FUNCTION public.tg_payee_history()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE v_fields text[] := ARRAY[]::text[];
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.payee_profile_events(company_id, payee_profile_id, partner_id, event, actor_id)
    VALUES (NEW.company_id, NEW.id, NEW.partner_id, 'created', auth.uid());
    RETURN NEW;
  END IF;
  IF NEW.holder_name IS DISTINCT FROM OLD.holder_name THEN v_fields := array_append(v_fields, 'holder_name'); END IF;
  IF NEW.holder_document IS DISTINCT FROM OLD.holder_document THEN v_fields := array_append(v_fields, 'holder_document'); END IF;
  IF NEW.bank_code IS DISTINCT FROM OLD.bank_code THEN v_fields := array_append(v_fields, 'bank_code'); END IF;
  IF NEW.bank_branch IS DISTINCT FROM OLD.bank_branch THEN v_fields := array_append(v_fields, 'bank_branch'); END IF;
  IF NEW.bank_account IS DISTINCT FROM OLD.bank_account THEN v_fields := array_append(v_fields, 'bank_account'); END IF;
  IF NEW.pix_key IS DISTINCT FROM OLD.pix_key THEN v_fields := array_append(v_fields, 'pix_key'); END IF;
  IF NEW.status IS DISTINCT FROM OLD.status THEN v_fields := array_append(v_fields, 'status'); END IF;
  IF NEW.ownership_validated IS DISTINCT FROM OLD.ownership_validated THEN v_fields := array_append(v_fields, 'ownership_validated'); END IF;
  IF array_length(v_fields, 1) IS NOT NULL THEN
    INSERT INTO public.payee_profile_events(company_id, payee_profile_id, partner_id, event, actor_id, changed_fields)
    VALUES (NEW.company_id, NEW.id, NEW.partner_id, 'updated', auth.uid(), v_fields);
    INSERT INTO public.audit_events(actor_id, company_id, action, object_type, object_id, context)
    VALUES (auth.uid(), NEW.company_id, 'payee.update', 'payee_profiles', NEW.id::text,
            jsonb_build_object('changed_fields', to_jsonb(v_fields)));
  END IF;
  RETURN NEW;
END; $function$;