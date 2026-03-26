"use client"

import { useEffect } from "react"
import { useParams, useRouter } from "next/navigation"

/** נתיב ישן — עריכה פשוטה בדיאלוג ברשימה */
export default function SimpleAutomationLegacyRedirectPage() {
  const params = useParams()
  const router = useRouter()
  const id = params.id as string
  useEffect(() => {
    if (id) router.replace(`/automations?simpleEdit=${id}`)
    else router.replace("/automations")
  }, [id, router])
  return (
    <div className="flex min-h-[200px] items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
    </div>
  )
}
