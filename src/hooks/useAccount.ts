import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getMyAccount } from "@/lib/account.functions";
import type { AppRole } from "@/lib/domain";

export function useAccount() {
  const fetchAccount = useServerFn(getMyAccount);
  const query = useQuery({
    queryKey: ["account"],
    queryFn: () => fetchAccount(),
    staleTime: 60_000,
  });

  const roles = (query.data?.roles ?? []) as AppRole[];
  return {
    ...query,
    account: query.data,
    roles,
    primaryRole: roles[0] ?? null,
    isTechnician: roles.includes("technician"),
    isManager: roles.includes("hotel_manager") || roles.includes("admin"),
    isReceptionist: roles.includes("receptionist"),
  };
}
