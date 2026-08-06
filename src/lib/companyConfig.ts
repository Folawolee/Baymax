"use client";

import { trpc } from "./trpc";
import { useAuth } from "./auth";

/** Tenant terminology (e.g. "Site" vs "Line") is data, not a hardcoded string — read it here, everywhere it appears in copy. */
export function useCompanyConfig() {
  const { token } = useAuth();
  const query = trpc.company.getMine.useQuery(undefined, { enabled: !!token });

  return {
    name: query.data?.name ?? "",
    siteTermLabel: query.data?.siteTermLabel ?? "Site",
    productionUnitLabel: query.data?.productionUnitLabel ?? "output",
    industryLabel: query.data?.industryLabel ?? "",
    behindPlanThresholdPct: query.data?.behindPlanThresholdPct ?? 5,
    productionEnabled: query.data?.productionEnabled ?? true,
    siteOperationsEnabled: query.data?.siteOperationsEnabled ?? true,
    isLoading: query.isLoading,
  };
}
