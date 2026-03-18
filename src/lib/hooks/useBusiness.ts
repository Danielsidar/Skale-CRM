"use client"

import { useEffect, useCallback, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { useBusinessStore, type Business } from "@/lib/store"

export function useBusiness() {
  const supabase = createClient()
  const {
    activeBusinessId,
    setActiveBusinessId,
    businesses,
    setBusinesses,
    clearBusiness,
  } = useBusinessStore()
  const [hasFetched, setHasFetched] = useState(false)

  const loadBusinesses = useCallback(async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      setBusinesses([])
      clearBusiness()
      setHasFetched(true)
      return
    }
    const { data: membershipRows, error } = await supabase
      .from("business_users")
      .select("business_id, role")
      .eq("user_id", user.id)

    if (error) {
      setBusinesses([])
      setHasFetched(true)
      return
    }
    if (!membershipRows?.length) {
      setBusinesses([])
      clearBusiness()
      setHasFetched(true)
      return
    }

    const ids = membershipRows.map((r) => r.business_id)
    const { data: bizRows, error: bizError } = await supabase
      .from("businesses")
      .select("id, name")
      .in("id", ids)

    if (bizError || !bizRows?.length) {
      setBusinesses([])
      clearBusiness()
      setHasFetched(true)
      return
    }

    const roleByBusinessId: Record<string, string> = {}
    membershipRows.forEach((r) => {
      roleByBusinessId[r.business_id] = r.role ?? "agent"
    })
    const list: Business[] = bizRows.map((b) => ({
      id: b.id,
      name: b.name,
      role: roleByBusinessId[b.id],
    }))
    setBusinesses(list)

    const current = useBusinessStore.getState().activeBusinessId
    if (!current || !list.some((b) => b.id === current)) {
      setActiveBusinessId(list[0]?.id ?? null)
    }
    setHasFetched(true)
  }, [setBusinesses, setActiveBusinessId, clearBusiness])

  useEffect(() => {
    loadBusinesses()
  }, [loadBusinesses])

  return {
    businessId: activeBusinessId,
    businesses,
    setBusinessId: setActiveBusinessId,
    loadBusinesses,
    isLoading: !hasFetched,
  }
}
