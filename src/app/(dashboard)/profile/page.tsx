"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { User, Mail, Phone, Shield, Loader2, Save, Camera } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"

interface UserProfile {
  id: string
  user_id: string
  email: string
  name: string
  role: string
  organization_id: string | null
  is_active: boolean
}

const roleLabels: Record<string, string> = {
  admin: "מנהל",
  manager: "מנהל צוות",
  agent: "נציג",
  top_admin: "מנהל על",
}

export default function ProfilePage() {
  const supabase = createClient()
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data } = await supabase
        .from("user_profiles")
        .select("*")
        .eq("user_id", user.id)
        .single()

      if (data) {
        const p = data as UserProfile
        setProfile(p)
        setName(p.name)
        setEmail(p.email)
      }
      setLoading(false)
    }
    load()
  }, [supabase])

  const handleSave = async () => {
    if (!profile) return
    setSaving(true)

    const { error } = await supabase
      .from("user_profiles")
      .update({ name, email })
      .eq("id", profile.id)

    if (error) {
      toast.error("שגיאה בעדכון הפרופיל")
    } else {
      toast.success("הפרופיל עודכן בהצלחה")
      setProfile({ ...profile, name, email })
    }
    setSaving(false)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!profile) {
    return (
      <div className="flex items-center justify-center py-16 text-muted-foreground">
        לא נמצא פרופיל
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <User className="h-6 w-6" />
          הפרופיל שלי
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          ניהול פרטים אישיים והגדרות חשבון
        </p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary text-2xl font-bold">
              {name?.substring(0, 2) || "??"}
            </div>
            <div>
              <CardTitle className="text-lg">{name}</CardTitle>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant="secondary">
                  <Shield className="h-3 w-3 ml-1" />
                  {roleLabels[profile.role] || profile.role}
                </Badge>
                {profile.is_active ? (
                  <Badge variant="default" className="bg-green-100 text-green-700 hover:bg-green-100">פעיל</Badge>
                ) : (
                  <Badge variant="destructive">לא פעיל</Badge>
                )}
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="name">שם מלא</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="text-right"
                dir="rtl"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">אימייל</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                dir="ltr"
              />
            </div>
          </div>

          <div className="flex justify-end">
            <Button onClick={handleSave} disabled={saving} className="gap-2">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              שמור שינויים
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">אבטחה</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">סיסמה</p>
              <p className="text-xs text-muted-foreground">שנה את הסיסמה שלך</p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={async () => {
                const { error } = await supabase.auth.resetPasswordForEmail(profile.email)
                if (error) toast.error("שגיאה בשליחת מייל איפוס")
                else toast.success("מייל איפוס סיסמה נשלח")
              }}
            >
              שלח מייל איפוס
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
