"use client"

import { useQuery } from "@tanstack/react-query"
import { createClient } from "@/lib/supabase/client"
import { queryKeys } from "./queryKeys"

export interface BusinessUserWithProfile {
  id: string
  user_id: string
  role: string
  email: string | null
  full_name: string | null
}

async function fetchBusinessUsers(businessId: string): Promise<BusinessUserWithProfile[]> {
  const supabase = createClient()

  const { data: memberRows, error } = await supabase
    .from("business_users")
    .select("id, user_id, role")
    .eq("business_id", businessId)

  if (error) throw error
  if (!memberRows?.length) return []

  const userIds = memberRows.map((r) => r.user_id)
  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, email, full_name")
    .in("id", userIds)

  const profileMap: Record<string, { email: string | null; full_name: string | null }> = {}
  for (const p of profiles ?? []) {
    profileMap[p.id] = { email: p.email, full_name: p.full_name }
  }

  return memberRows.map((m) => ({
    id: m.id,
    user_id: m.user_id,
    role: m.role,
    email: profileMap[m.user_id]?.email ?? null,
    full_name: profileMap[m.user_id]?.full_name ?? null,
  }))
}

export function useBusinessUsersQuery(businessId: string | null) {
  return useQuery({
    queryKey: queryKeys.businessUsers.all(businessId ?? ""),
    queryFn: () => fetchBusinessUsers(businessId!),
    enabled: !!businessId,
    staleTime: 5 * 60 * 1000,
  })
}
