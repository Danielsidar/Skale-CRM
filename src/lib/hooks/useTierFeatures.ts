"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { useBusiness } from "./useBusiness"
import { DEFAULT_FREE_FEATURES, type TierFeatures } from "@/lib/tiers"

export function useTierFeatures() {
  const { businessId } = useBusiness()
  const [features, setFeatures] = useState<TierFeatures>(DEFAULT_FREE_FEATURES)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!businessId) return
    const supabase = createClient()
    async function load() {
      const { data } = await supabase
        .from("businesses")
        .select("tiers(features)")
        .eq("id", businessId)
        .single()
      const f = (data as any)?.tiers?.features
      setFeatures(f ?? DEFAULT_FREE_FEATURES)
      setLoading(false)
    }
    load()
  }, [businessId])

  /** Returns true if the count is within the allowed limit (null = unlimited). */
  const withinLimit = (limit: number | null, currentCount: number): boolean => {
    if (limit === null) return true
    return currentCount < limit
  }

  /** Returns a human-readable limit string (e.g. "5" or "ללא הגבלה"). */
  const limitLabel = (limit: number | null): string => {
    return limit === null ? "ללא הגבלה" : String(limit)
  }

  return { features, loading, withinLimit, limitLabel }
}
