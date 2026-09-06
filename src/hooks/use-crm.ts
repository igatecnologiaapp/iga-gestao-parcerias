import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  getLeadDetail,
  getOpportunityDetail,
  listConflicts,
  listLeads,
  listOpportunities,
  listPricePolicies,
  listProducts,
  listProposals,
  listReferralLinks,
} from "@/lib/crm.functions";

export function useProducts(companyId: string | null) {
  const fn = useServerFn(listProducts);
  return useQuery({
    queryKey: ["products", companyId],
    enabled: !!companyId,
    queryFn: () => fn({ data: { companyId: companyId! } }),
  });
}

export function usePricePolicies(companyId: string | null) {
  const fn = useServerFn(listPricePolicies);
  return useQuery({
    queryKey: ["price-policies", companyId],
    enabled: !!companyId,
    queryFn: () => fn({ data: { companyId: companyId! } }),
  });
}

export function useLeads(companyId: string | null, status?: string, search?: string) {
  const fn = useServerFn(listLeads);
  return useQuery({
    queryKey: ["leads", companyId, status ?? "all", search ?? ""],
    enabled: !!companyId,
    queryFn: () =>
      fn({
        data: {
          companyId: companyId!,
          ...(status ? { status: status as never } : {}),
          ...(search ? { search } : {}),
        },
      }),
  });
}

export function useLeadDetail(leadId: string | null) {
  const fn = useServerFn(getLeadDetail);
  return useQuery({
    queryKey: ["lead", leadId],
    enabled: !!leadId,
    queryFn: () => fn({ data: { leadId: leadId! } }),
  });
}

export function useOpportunities(companyId: string | null, stage?: string) {
  const fn = useServerFn(listOpportunities);
  return useQuery({
    queryKey: ["opportunities", companyId, stage ?? "all"],
    enabled: !!companyId,
    queryFn: () =>
      fn({ data: { companyId: companyId!, ...(stage ? { stage: stage as never } : {}) } }),
  });
}

export function useOpportunityDetail(opportunityId: string | null) {
  const fn = useServerFn(getOpportunityDetail);
  return useQuery({
    queryKey: ["opportunity", opportunityId],
    enabled: !!opportunityId,
    queryFn: () => fn({ data: { opportunityId: opportunityId! } }),
  });
}

export function useProposals(companyId: string | null) {
  const fn = useServerFn(listProposals);
  return useQuery({
    queryKey: ["proposals", companyId],
    enabled: !!companyId,
    queryFn: () => fn({ data: { companyId: companyId! } }),
  });
}

export function useConflicts(companyId: string | null) {
  const fn = useServerFn(listConflicts);
  return useQuery({
    queryKey: ["lead-conflicts", companyId],
    enabled: !!companyId,
    queryFn: () => fn({ data: { companyId: companyId! } }),
  });
}

export function useReferralLinks(companyId: string | null) {
  const fn = useServerFn(listReferralLinks);
  return useQuery({
    queryKey: ["referral-links", companyId],
    enabled: !!companyId,
    queryFn: () => fn({ data: { companyId: companyId! } }),
  });
}
