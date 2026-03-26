"use client"

import { useQuery } from "@tanstack/react-query"
import { createClient } from "@/lib/supabase/client"
import { DEFAULT_FREE_FEATURES, type TierFeatures } from "@/lib/tiers"
import { queryKeys } from "./queryKeys"

async function fetchTierFeatures(businessId: string): Promise<TierFeatures> {
  const supabase = createClient()
  const { data } = await supabase
    .from("businesses")
    .select("tiers(features)")
    .eq("id", businessId)
    .single()

  const f = (data as any)?.tiers?.features
  return f ?? DEFAULT_FREE_FEATURES
}

export function useTierFeaturesQuery(businessId: string | null) {
  const query = useQuery({
    queryKey: queryKeys.tierFeatures.byBusiness(businessId ?? ""),
    queryFn: () => fetchTierFeatures(businessId!),
    enabled: !!businessId,
    staleTime: 10 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  })

  const withinLimit = (limit: number | null, currentCount: number): boolean => {
    if (limit === null) return true
    return currentCount < limit
  }

  const limitLabel = (limit: number | null): string => {
    return limit === null ? "ללא הגבלה" : String(limit)
  }

  return {
    features: query.data ?? DEFAULT_FREE_FEATURES,
    loading: query.isPending,
    withinLimit,
    limitLabel,
  }
}
