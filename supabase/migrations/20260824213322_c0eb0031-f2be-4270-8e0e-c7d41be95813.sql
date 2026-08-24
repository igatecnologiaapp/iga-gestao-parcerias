REVOKE EXECUTE ON FUNCTION public.tg_candidate_stage_immutable() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.tg_candidate_status_guard() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.tg_partner_status_stamp() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.tg_protected_territory_guard() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.tg_acceptance_immutable() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.tg_payee_history() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.mask_tail(text, integer) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.candidate_transition_allowed(public.candidate_status, public.candidate_status) FROM PUBLIC, anon;