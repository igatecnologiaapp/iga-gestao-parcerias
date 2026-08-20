
REVOKE ALL ON FUNCTION public.tg_audit_row() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.tg_protect_last_admin() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.tg_no_self_elevation() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.tg_audit_immutable() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.tg_policy_version_immutable() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.tg_set_updated_at() FROM PUBLIC, anon, authenticated;

CREATE POLICY "attachments read scoped" ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'attachments'
  AND EXISTS (
    SELECT 1 FROM public.attachments a
    WHERE a.storage_path = storage.objects.name
      AND public.has_permission(auth.uid(), a.company_id, 'attachment.read')
  )
);
CREATE POLICY "attachments write scoped" ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'attachments'
  AND (storage.foldername(name))[1] IS NOT NULL
  AND public.has_permission(auth.uid(), ((storage.foldername(name))[1])::uuid, 'attachment.write')
);
CREATE POLICY "attachments delete scoped" ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'attachments'
  AND (storage.foldername(name))[1] IS NOT NULL
  AND public.has_permission(auth.uid(), ((storage.foldername(name))[1])::uuid, 'attachment.write')
);
