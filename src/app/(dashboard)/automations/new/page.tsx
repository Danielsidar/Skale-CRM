"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { useBusiness } from "@/lib/hooks/useBusiness"

export default function NewAutomationPage() {
  const router = useRouter()
  const { businessId } = useBusiness()
  const [creating, setCreating] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    if (!businessId || creating) return
    setCreating(true)
    async function create() {
      const { data, error } = await supabase
        .from("automations")
        .insert({
          business_id: businessId,
          name: "אוטומציה חדשה",
          status: "draft",
          version: 1,
        })
        .select("id")
        .single()
      if (error) {
        setCreating(false)
        return
      }
      if (data?.id) router.replace(`/automations/${data.id}/builder`)
    }
    create()
  }, [businessId, router, creating, supabase])

  return (
    <div className="flex min-h-[200px] items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
    </div>
  )
}
