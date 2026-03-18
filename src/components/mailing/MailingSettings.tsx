"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { useBusiness } from "@/lib/hooks/useBusiness"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Globe, Save, Loader2, Webhook } from "lucide-react"
import { toast } from "sonner"

export function MailingSettings() {
  const { businessId } = useBusiness()
  const [webhookUrl, setWebhookUrl] = useState("")
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    const loadSettings = async () => {
      if (!businessId) return
      setLoading(true)
      const { data, error } = await supabase
        .from("businesses")
        .select("ghl_webhook_url")
        .eq("id", businessId)
        .single()

      if (error) {
        toast.error("שגיאה בטעינת הגדרות")
      } else {
        setWebhookUrl(data?.ghl_webhook_url || "")
      }
      setLoading(false)
    }

    loadSettings()
  }, [businessId, supabase])

  const handleSave = async () => {
    if (!businessId) return
    setSaving(true)
    const { error } = await supabase
      .from("businesses")
      .update({ ghl_webhook_url: webhookUrl })
      .eq("id", businessId)

    if (error) {
      toast.error("שגיאה בשמירת הגדרות")
    } else {
      toast.success("הגדרות נשמרו בהצלחה")
    }
    setSaving(false)
  }

  if (!businessId) return null

  return (
    <div className="max-w-4xl mx-auto py-4">
      <Card dir="rtl" className="border-border/50 shadow-lg bg-card/50 backdrop-blur-sm overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full -mr-16 -mt-16 blur-3xl pointer-events-none" />
        
        <CardHeader className="relative border-b border-border/50 pb-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary border border-primary/20">
              <Webhook className="h-5 w-5" />
            </div>
            <div>
              <CardTitle className="text-xl font-bold">הגדרות Webhook</CardTitle>
              <CardDescription className="text-muted-foreground mt-1">
                הגדר את כתובת ה-Webhook של GHL לשליחת המיילים
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-6 pt-8 relative">
          <div className="space-y-3">
            <Label htmlFor="webhook" className="text-sm font-semibold flex items-center gap-2">
              כתובת Webhook (GHL)
              <span className="text-rose-500">*</span>
            </Label>
            <div className="relative group">
              <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-muted-foreground group-focus-within:text-primary transition-colors">
                <Globe className="h-4 w-4" />
              </div>
              <Input
                id="webhook"
                className="pr-10 h-11 bg-background/50 border-border/50 focus:border-primary/50 focus:ring-primary/20 transition-all text-left"
                dir="ltr"
                placeholder="https://services.leadconnectorhq.com/hooks/..."
                value={webhookUrl}
                onChange={(e) => setWebhookUrl(e.target.value)}
                disabled={loading}
              />
            </div>
            <p className="text-[12px] text-muted-foreground bg-muted/30 p-3 rounded-lg border border-border/30">
              <strong className="text-foreground">שים לב:</strong> כל המיילים שיישלחו מהמערכת (דרך רשימות תפוצה או אוטומציות) יישלחו כבקשת POST לכתובת זו.
            </p>
          </div>
        </CardContent>
        
        <CardFooter className="bg-muted/30 border-t border-border/50 px-8 py-4 flex justify-end gap-3">
          <Button 
            onClick={handleSave} 
            disabled={saving || loading}
            className="px-8 shadow-md shadow-primary/20 hover:shadow-primary/30 transition-all gap-2"
          >
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            שמור שינויים
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
}
