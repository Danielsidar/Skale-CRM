"use client"

import { useQuery, useQueryClient } from "@tanstack/react-query"
import { useCallback } from "react"
import { createClient } from "@/lib/supabase/client"
import { useBusinessStore } from "@/lib/store"
import { queryKeys } from "./queryKeys"

interface PermissionsData {
  rolePerms: Record<string, boolean>
  userOverrides: Record<string, boolean>
}

async function fetchPermissions(
  businessId: string,
  userId: string,
  role: string
): Promise<PermissionsData> {
  if (role === "admin") return { rolePerms: {}, userOverrides: {} }

  const supabase = createClient()

  const [{ data: perms }, { data: ovr }] = await Promise.all([
    supabase
      .from("business_permissions")
      .select("resource, action, is_allowed")
      .eq("business_id", businessId)
      .eq("role", role),
    supabase
      .from("user_permission_overrides")
      .select("resource, action, is_allowed")
      .eq("business_id", businessId)
      .eq("user_id", userId),
  ])

  const rolePerms: Record<string, boolean> = {}
  for (const p of perms || []) rolePerms[`${p.resource}:${p.action}`] = p.is_allowed

  const userOverrides: Record<string, boolean> = {}
  for (const o of ovr || []) userOverrides[`${o.resource}:${o.action}`] = o.is_allowed

  return { rolePerms, userOverrides }
}

export function usePermissionsQuery(userId: string | null) {
  const { activeBusinessId, businesses } = useBusinessStore()
  const role = businesses.find((b) => b.id === activeBusinessId)?.role || "agent"

  const query = useQuery({
    queryKey: queryKeys.permissions.byUser(
      activeBusinessId ?? "",
      userId ?? "",
      role
    ),
    queryFn: () => fetchPermissions(activeBusinessId!, userId!, role),
    enabled: !!activeBusinessId && !!userId,
    staleTime: 5 * 60 * 1000,
  })

  const can = useCallback(
    (resource: string, action: string): boolean => {
      if (role === "admin") return true
      const { rolePerms = {}, userOverrides = {} } = query.data ?? {}
      const key = `${resource}:${action}`
      if (key in userOverrides) return userOverrides[key]
      return rolePerms[key] ?? false
    },
    [role, query.data]
  )

  return {
    loading: query.isPending,
    role,
    can,
  }
}
