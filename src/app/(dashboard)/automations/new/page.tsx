"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"

/** נתיב ישן / חיצוני — נפתח דיאלוג בחירה ברשימת האוטומציות */
export default function NewAutomationRedirectPage() {
  const router = useRouter()
  useEffect(() => {
    router.replace("/automations?new=1")
  }, [router])
  return (
    <div className="flex min-h-[200px] items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
    </div>
  )
}
