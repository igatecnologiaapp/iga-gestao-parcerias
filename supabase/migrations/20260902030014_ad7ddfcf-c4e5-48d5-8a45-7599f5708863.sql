ALTER TABLE public.candidate_stage_events
  DROP CONSTRAINT candidate_stage_events_company_id_fkey,
  ADD CONSTRAINT candidate_stage_events_company_id_fkey
    FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE;

ALTER TABLE public.candidate_evaluations
  DROP CONSTRAINT candidate_evaluations_company_id_fkey,
  ADD CONSTRAINT candidate_evaluations_company_id_fkey
    FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE;