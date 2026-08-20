import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useMemo } from "react";
import {
  getMyContext,
  listAuditEvents,
  listCatalog,
  listCompanyPeople,
  listNotifications,
  listUnits,
} from "@/lib/foundation.functions";

export function useMyContext() {
  const fn = useServerFn(getMyContext);
  return useQuery({ queryKey: ["me"], queryFn: () => fn({}) });
}

export function useActiveCompanyId() {
  const { data } = useMyContext();
  return data?.memberships?.[0]?.company_id ?? null;
}

/** Permissões vindas do servidor. Usadas apenas para exibição — o banco decide. */
export function usePermissions(companyId: string | null) {
  const { data } = useMyContext();
  return useMemo(() => {
    const list = companyId ? (data?.companyPermissions?.[companyId] ?? []) : [];
    return {
      list,
      can: (code: string) => list.includes(code),
    };
  }, [data, companyId]);
}

export function useCompanyPeople(companyId: string | null) {
  const fn = useServerFn(listCompanyPeople);
  return useQuery({
    queryKey: ["company-people", companyId],
    enabled: !!companyId,
    queryFn: () => fn({ data: { companyId: companyId! } }),
  });
}

export function useCatalog() {
  const fn = useServerFn(listCatalog);
  return useQuery({ queryKey: ["catalog"], queryFn: () => fn({}) });
}

export function useUnits(companyId: string | null) {
  const fn = useServerFn(listUnits);
  return useQuery({
    queryKey: ["units", companyId],
    enabled: !!companyId,
    queryFn: () => fn({ data: { companyId: companyId! } }),
  });
}

export function useAudit(companyId: string | null) {
  const fn = useServerFn(listAuditEvents);
  return useQuery({
    queryKey: ["audit", companyId],
    enabled: !!companyId,
    queryFn: () => fn({ data: { companyId: companyId!, limit: 50 } }),
  });
}

export function useNotifications() {
  const fn = useServerFn(listNotifications);
  return useQuery({ queryKey: ["notifications"], queryFn: () => fn({}) });
}
