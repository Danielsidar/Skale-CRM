"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { useBusiness } from "@/lib/hooks/useBusiness"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Building2, Plus, Loader2 } from "lucide-react"

export default function SelectBusinessPage() {
  const router = useRouter()
  const { businessId, businesses, setBusinessId, loadBusinesses, isLoading } = useBusiness()
  const [creating, setCreating] = useState(false)
  const [newName, setNewName] = useState("")
  const [createError, setCreateError] = useState<string | null>(null)
  const [sessionChecked, setSessionChecked] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    if (isLoading) return
    if (businessId && businesses.some((b) => b.id === businessId)) {
      router.replace("/leads")
      return
    }
    if (businesses.length === 1 && !businessId) {
      setBusinessId(businesses[0].id)
      router.replace("/leads")
    }
  }, [isLoading, businessId, businesses, setBusinessId, router])

  useEffect(() => {
    if (businesses.length > 0) return
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSessionChecked(true)
      if (!session) router.replace("/login")
    })
  }, [businesses.length, supabase, router])

  const handleSelect = (id: string) => {
    setBusinessId(id)
    router.push("/leads")
  }

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    setCreateError(null)
    if (!newName.trim()) return
    setCreating(true)
    const { data, error } = await supabase.rpc("create_business", {
      p_name: newName.trim(),
    })
    if (error) {
      setCreateError(error.message ?? "שגיאה ביצירת העסק")
      setCreating(false)
      return
    }
    const result = data as { ok?: boolean; id?: string; error?: string } | null
    if (!result?.ok || !result.id) {
      setCreateError(result?.error ?? "שגיאה ביצירת העסק")
      setCreating(false)
      return
    }
    await loadBusinesses()
    setBusinessId(result.id)
    setCreating(false)
    setNewName("")
    router.push("/leads")
  }

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (businesses.length === 0) {
    return (
      <div className="mx-auto max-w-md py-12">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              צור עסק חדש
            </CardTitle>
            <CardDescription>
              אין לך עדיין עסק. צור עסק כדי להתחיל לנהל לידים ועיסקאות.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">שם העסק</Label>
                <Input
                  id="name"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="למשל: החברה שלי"
                  disabled={creating}
                />
              </div>
              {createError && (
                <p className="text-sm text-destructive">{createError}</p>
              )}
              <Button type="submit" disabled={creating} className="w-full">
                {creating ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <Plus className="h-4 w-4 ml-2" />
                    צור עסק
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-lg py-12">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            בחר עסק
          </CardTitle>
          <CardDescription>
            בחר איזה עסק להפעיל כרגע. כל הנתונים יוצגו בהתאם לעסק הנבחר.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {businesses.map((b) => (
            <Button
              key={b.id}
              variant={businessId === b.id ? "default" : "outline"}
              className="w-full justify-start gap-2 h-12"
              onClick={() => handleSelect(b.id)}
            >
              <Building2 className="h-4 w-4" />
              {b.name}
              {b.role && (
                <span className="text-muted-foreground text-xs">({b.role})</span>
              )}
            </Button>
          ))}
        </CardContent>
      </Card>
    </div>
  )
}
