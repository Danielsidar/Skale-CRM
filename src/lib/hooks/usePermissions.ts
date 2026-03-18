"use client"

import { useEffect, useState, useCallback } from "react"
import { createClient } from "@/lib/supabase/client"
import { useBusiness } from "@/lib/hooks/useBusiness"

interface PermState {
  loading: boolean
  role: string
  /** Check if a specific permission is allowed (respects user overrides) */
  can: (resource: string, action: string) => boolean
}

export function usePermissions(): PermState {
  const { businessId, businesses } = useBusiness()
  const role = businesses.find(b => b.id === businessId)?.role || "agent"

  const [rolePerms, setRolePerms] = useState<Record<string, boolean>>({})
  const [userOverrides, setUserOverrides] = useState<Record<string, boolean>>({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!businessId) return

    const supabase = createClient()

    const load = async () => {
      setLoading(true)
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return

        if (role === "admin") {
          setRolePerms({})
          setUserOverrides({})
          setLoading(false)
          return
        }

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
            .eq("user_id", user.id),
        ])

        const rp: Record<string, boolean> = {}
        for (const p of perms || []) rp[`${p.resource}:${p.action}`] = p.is_allowed

        const uo: Record<string, boolean> = {}
        for (const o of ovr || []) uo[`${o.resource}:${o.action}`] = o.is_allowed

        setRolePerms(rp)
        setUserOverrides(uo)
      } catch (err) {
        console.error("Failed to load permissions:", err)
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [businessId, role])

  const can = useCallback((resource: string, action: string): boolean => {
    if (role === "admin") return true
    const key = `${resource}:${action}`
    if (key in userOverrides) return userOverrides[key]
    return rolePerms[key] ?? false
  }, [role, rolePerms, userOverrides])

  return { loading, role, can }
}
