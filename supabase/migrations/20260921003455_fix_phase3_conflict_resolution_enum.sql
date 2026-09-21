CREATE OR REPLACE FUNCTION public.resolve_lead_conflict(_conflict_id uuid, _awarded_partner_id uuid, _resolution text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v public.lead_conflicts;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'unauthenticated'; END IF;
  SELECT * INTO v FROM public.lead_conflicts WHERE id = _conflict_id;
  IF v.id IS NULL THEN RAISE EXCEPTION 'conflito não encontrado'; END IF;
  IF NOT public.has_permission(auth.uid(), v.company_id, 'approval.decide') THEN RAISE EXCEPTION 'forbidden'; END IF;
  IF _resolution IS NULL OR length(trim(_resolution)) = 0 THEN RAISE EXCEPTION 'justificativa obrigatória'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.partners WHERE id = _awarded_partner_id AND company_id = v.company_id) THEN
    RAISE EXCEPTION 'parceiro inválido para esta empresa';
  END IF;

  UPDATE public.lead_conflicts
     SET status = 'resolved', awarded_partner_id = _awarded_partner_id,
         resolution = _resolution, decided_by = auth.uid(), decided_at = now()
   WHERE id = _conflict_id;

  UPDATE public.approval_requests
     SET status = 'approved', decided_by = auth.uid(), decided_at = now(), decision_reason = _resolution
   WHERE id = v.approval_request_id;

  UPDATE public.lead_protections
     SET status = CASE WHEN partner_id = _awarded_partner_id
                       THEN 'protected'::public.lead_protection_status
                       ELSE 'released'::public.lead_protection_status END,
         released_at = CASE WHEN partner_id = _awarded_partner_id THEN NULL ELSE now() END
   WHERE lead_id = v.lead_id AND status = 'disputed';

  UPDATE public.leads SET partner_id = _awarded_partner_id WHERE id = v.lead_id;

  INSERT INTO public.audit_events(actor_id, company_id, action, object_type, object_id, context)
  VALUES (auth.uid(), v.company_id, 'lead.conflict.resolve', 'lead_conflicts', _conflict_id::text,
          jsonb_build_object('awarded_partner_id', _awarded_partner_id, 'resolution', _resolution));

  RETURN jsonb_build_object('status','resolved','conflict_id', _conflict_id);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.resolve_lead_conflict(uuid,uuid,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.resolve_lead_conflict(uuid,uuid,text) TO authenticated;
