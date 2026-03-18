"use client"

import { useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { useBusiness } from "@/lib/hooks/useBusiness"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ArrowRight, Loader2 } from "lucide-react"
import { toast } from "sonner"

const TRIGGER_TYPES = [
  { value: "deal.created", label: "עיסקה נוצרה" },
  { value: "deal.stage_changed", label: "שינוי שלב עיסקה" },
  { value: "contact.created", label: "איש קשר נוצר" },
]

export default function NewAutomationPage() {
  const router = useRouter()
  const { businessId } = useBusiness()
  const [name, setName] = useState("")
  const [triggerType, setTriggerType] = useState("deal.stage_changed")
  const [webhookUrl, setWebhookUrl] = useState("")
  const [taskTitle, setTaskTitle] = useState("")
  const [loading, setLoading] = useState(false)
  const supabase = createClient()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!businessId || !name.trim()) return
    setLoading(true)
    try {
      const actions: Array<{ type: string; config?: Record<string, unknown> }> = []
      if (taskTitle.trim()) {
        actions.push({ type: "create_task", config: { title: taskTitle.trim() } })
      }
      if (webhookUrl.trim()) {
        actions.push({ type: "send_webhook", config: { url: webhookUrl.trim() } })
      }
      if (actions.length === 0) {
        toast.error("הוסף לפחות פעולה אחת (משימה או webhook)")
        setLoading(false)
        return
      }

      const { error } = await supabase.from("automation_rules").insert({
        business_id: businessId,
        name: name.trim(),
        trigger_type: triggerType,
        trigger_config: {},
        conditions: [],
        actions,
        active: true,
      })

      if (error) throw error
      toast.success("הכלל נוצר")
      router.push("/settings/automations")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "שגיאה")
    } finally {
      setLoading(false)
    }
  }

  if (!businessId) return null

  return (
    <div className="space-y-6 max-w-xl">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" className="h-9 w-9 rounded-lg" asChild>
          <Link href="/settings/automations">
            <ArrowRight className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">כלל אוטומציה חדש</h1>
          <p className="text-muted-foreground text-sm">טריגר → תנאים → פעולות</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>פרטי הכלל</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">שם הכלל</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="למשל: שלב הצעה נשלחה → יצירת משימה"
                required
              />
            </div>
            <div className="space-y-2">
              <Label>טריגר</Label>
              <select
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={triggerType}
                onChange={(e) => setTriggerType(e.target.value)}
              >
                {TRIGGER_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="task">יצירת משימה (כותרת)</Label>
              <Input
                id="task"
                value={taskTitle}
                onChange={(e) => setTaskTitle(e.target.value)}
                placeholder="כותרת המשימה (אופציונלי)"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="webhook">Webhook URL</Label>
              <Input
                id="webhook"
                type="url"
                value={webhookUrl}
                onChange={(e) => setWebhookUrl(e.target.value)}
                placeholder="https://..."
              />
            </div>
            <div className="flex gap-2 pt-2">
              <Button type="submit" disabled={loading}>
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "צור כלל"}
              </Button>
              <Button type="button" variant="outline" asChild>
                <Link href="/settings/automations">ביטול</Link>
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
