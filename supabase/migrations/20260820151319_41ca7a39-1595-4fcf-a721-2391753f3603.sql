CREATE OR REPLACE FUNCTION public.claim_idempotency_key(_company_id uuid, _operation text, _key text, _request jsonb, _response jsonb DEFAULT NULL::jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE v_hash text; v_row public.idempotency_keys;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'unauthenticated'; END IF;
  IF _company_id IS NOT NULL AND NOT public.is_company_member(auth.uid(), _company_id) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  v_hash := encode(sha256(convert_to(COALESCE(_request,'{}'::jsonb)::text, 'UTF8')), 'hex');
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
END; $function$;

REVOKE ALL ON FUNCTION public.claim_idempotency_key(uuid, text, text, jsonb, jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.claim_idempotency_key(uuid, text, text, jsonb, jsonb) TO authenticated, service_role;