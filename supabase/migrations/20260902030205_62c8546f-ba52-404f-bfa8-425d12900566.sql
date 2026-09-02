CREATE OR REPLACE FUNCTION public.assign_partner_territory(_partner_id uuid, _territory_id uuid, _mode territory_mode, _valid_until timestamp with time zone DEFAULT NULL, _reason text DEFAULT NULL, _idempotency_key text DEFAULT NULL)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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

  UPDATE public.partner_territories
     SET status = 'revoked'::partner_territory_status, valid_until = now(), reason = COALESCE(reason,'substituído')
   WHERE partner_id = _partner_id AND territory_id = _territory_id
     AND status IN ('pending'::partner_territory_status,'active'::partner_territory_status);

  INSERT INTO public.partner_territories(company_id, partner_id, territory_id, mode, status,
                                         valid_until, reason, created_by,
                                         approved_by, approved_at)
  VALUES (v_company, _partner_id, _territory_id, _mode,
          (CASE WHEN _mode = 'protected' THEN 'pending' ELSE 'active' END)::partner_territory_status,
          _valid_until, _reason, auth.uid(),
          CASE WHEN _mode = 'protected' THEN NULL ELSE auth.uid() END,
          CASE WHEN _mode = 'protected' THEN NULL ELSE now() END)
  RETURNING id INTO v_id;

  RETURN jsonb_build_object('status','created','partner_territory_id', v_id);
END; $function$;

DROP TRIGGER IF EXISTS t_audit_partner_territories ON public.partner_territories;
CREATE TRIGGER t_audit_partner_territories
AFTER INSERT OR UPDATE OR DELETE ON public.partner_territories
FOR EACH ROW EXECUTE FUNCTION public.tg_audit_row();