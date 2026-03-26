"use client"

import { useQuery } from "@tanstack/react-query"
import { useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { useBusinessStore, type Business } from "@/lib/store"
import { queryKeys } from "./queryKeys"

async function fetchBusinesses(supabase: ReturnType<typeof createClient>) {
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return { user: null, businesses: [] as Business[] }

  const { data: membershipRows } = await supabase
    .from("business_users")
    .select("business_id, role")
    .eq("user_id", user.id)

  if (!membershipRows?.length) return { user, businesses: [] as Business[] }

  const ids = membershipRows.map((r) => r.business_id)
  const { data: bizRows } = await supabase
    .from("businesses")
    .select("id, name")
    .in("id", ids)

  if (!bizRows?.length) return { user, businesses: [] as Business[] }

  const roleByBusinessId: Record<string, string> = {}
  membershipRows.forEach((r) => {
    roleByBusinessId[r.business_id] = r.role ?? "agent"
  })

  const businesses: Business[] = bizRows.map((b) => ({
    id: b.id,
    name: b.name,
    role: roleByBusinessId[b.id],
  }))

  return { user, businesses }
}

export function useBusinessQuery() {
  const supabase = createClient()
  const { activeBusinessId, setActiveBusinessId, setBusinesses, clearBusiness, businesses } =
    useBusinessStore()

  const query = useQuery({
    queryKey: ["business-session"],
    queryFn: () => fetchBusinesses(supabase),
    staleTime: 5 * 60 * 1000,
  })

  useEffect(() => {
    if (!query.data) return
    const { businesses: fetchedBusinesses } = query.data

    if (!fetchedBusinesses.length) {
      setBusinesses([])
      clearBusiness()
      return
    }

    setBusinesses(fetchedBusinesses)

    const current = useBusinessStore.getState().activeBusinessId
    if (!current || !fetchedBusinesses.some((b) => b.id === current)) {
      setActiveBusinessId(fetchedBusinesses[0]?.id ?? null)
    }
  }, [query.data, setBusinesses, setActiveBusinessId, clearBusiness])

  return {
    businessId: activeBusinessId,
    businesses,
    setBusinessId: setActiveBusinessId,
    isLoading: query.isPending,
    refetch: query.refetch,
  }
}
