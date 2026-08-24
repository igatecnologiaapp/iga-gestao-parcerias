import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  getCandidateDetail,
  getMaskedPayee,
  getMyPartnerPanel,
  getPartnerDetail,
  listCandidates,
  listOnboardingChecklists,
  listPartners,
  listTerritories,
  listTrainingTracks,
} from "@/lib/partners.functions";

export function useCandidates(companyId: string | null, status?: string, search?: string) {
  const fn = useServerFn(listCandidates);
  return useQuery({
    queryKey: ["candidates", companyId, status ?? "all", search ?? ""],
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

export function useCandidateDetail(candidateId: string | null) {
  const fn = useServerFn(getCandidateDetail);
  return useQuery({
    queryKey: ["candidate", candidateId],
    enabled: !!candidateId,
    queryFn: () => fn({ data: { candidateId: candidateId! } }),
  });
}

export function usePartners(companyId: string | null, status?: string, search?: string) {
  const fn = useServerFn(listPartners);
  return useQuery({
    queryKey: ["partners", companyId, status ?? "all", search ?? ""],
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

export function usePartnerDetail(partnerId: string | null) {
  const fn = useServerFn(getPartnerDetail);
  return useQuery({
    queryKey: ["partner", partnerId],
    enabled: !!partnerId,
    queryFn: () => fn({ data: { partnerId: partnerId! } }),
  });
}

export function useTerritories(companyId: string | null) {
  const fn = useServerFn(listTerritories);
  return useQuery({
    queryKey: ["territories", companyId],
    enabled: !!companyId,
    queryFn: () => fn({ data: { companyId: companyId! } }),
  });
}

export function useTrainingTracks(companyId: string | null) {
  const fn = useServerFn(listTrainingTracks);
  return useQuery({
    queryKey: ["training-tracks", companyId],
    enabled: !!companyId,
    queryFn: () => fn({ data: { companyId: companyId! } }),
  });
}

export function useOnboardingChecklists(companyId: string | null) {
  const fn = useServerFn(listOnboardingChecklists);
  return useQuery({
    queryKey: ["onboarding-checklists", companyId],
    enabled: !!companyId,
    queryFn: () => fn({ data: { companyId: companyId! } }),
  });
}

export function useMaskedPayee(partnerId: string | null) {
  const fn = useServerFn(getMaskedPayee);
  return useQuery({
    queryKey: ["payee-masked", partnerId],
    enabled: !!partnerId,
    queryFn: () => fn({ data: { partnerId: partnerId! } }),
  });
}

export function useMyPartnerPanel() {
  const fn = useServerFn(getMyPartnerPanel);
  return useQuery({ queryKey: ["my-partner-panel"], queryFn: () => fn({}) });
}
