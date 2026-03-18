"use client"

import { usePathname, useRouter } from "next/navigation"
import { useBusiness } from "@/lib/hooks/useBusiness"
import { useEffect } from "react"
import { Loader2 } from "lucide-react"

export function BusinessGuard({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const { businessId, businesses, isLoading } = useBusiness()
  const isSelectPage = pathname === "/select-business"

  useEffect(() => {
    if (isLoading || isSelectPage) return
    if (businesses.length === 0) {
      router.replace("/select-business")
      return
    }
    if (!businessId || !businesses.some((b) => b.id === businessId)) {
      router.replace("/select-business")
    }
  }, [isLoading, isSelectPage, businessId, businesses, router])

  if (isSelectPage) return <>{children}</>
  if (isLoading || !businessId) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }
  return <>{children}</>
}
