"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { useBusiness } from "@/lib/hooks/useBusiness"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ArrowRight, Plus, Trash2, Save, Share2, MessageSquare, ExternalLink } from "lucide-react"
import { toast } from "sonner"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog"

interface WhatsappCredential {
  id: string
  name: string
  provider: "official" | "green_api"
  api_url?: string
  api_token: string
  instance_id?: string
}

export default function SettingsIntegrationsPage() {
  const { businessId } = useBusiness()
  const [credentials, setCredentials] = useState<WhatsappCredential[]>([])
  const [loading, setLoading] = useState(true)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingCred, setEditingCred] = useState<Partial<WhatsappCredential> | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  
  const supabase = createClient()

  useEffect(() => {
    if (!businessId) return
    loadCredentials()
  }, [businessId])

  async function loadCredentials() {
    try {
      const { data, error } = await supabase
        .from("whatsapp_credentials")
        .select("*")
        .eq("business_id", businessId)
        .order("created_at", { ascending: false })

      if (error) throw error
      setCredentials(data || [])
    } catch (err) {
      console.error("Error loading credentials:", err)
      toast.error("שגיאה בטעינת אינטגרציות")
    } finally {
      setLoading(false)
    }
  }

  const handleOpenDialog = (cred?: WhatsappCredential) => {
    if (cred) {
      setEditingCred(cred)
    } else {
      setEditingCred({
        provider: "green_api",
        name: "",
        api_token: "",
        api_url: "https://api.green-api.com",
        instance_id: ""
      })
    }
    setIsDialogOpen(true)
  }

  const handleSave = async () => {
    if (!businessId || !editingCred) return
    
    if (!editingCred.name || !editingCred.api_token) {
      toast.error("אנא מלא את כל שדות החובה")
      return
    }

    if (editingCred.provider === "green_api" && !editingCred.instance_id) {
      toast.error("אנא הזן Instance ID עבור GreenAPI")
      return
    }

    setIsSaving(true)
    try {
      if (editingCred.id) {
        const { error } = await supabase
          .from("whatsapp_credentials")
          .update({
            name: editingCred.name,
            provider: editingCred.provider,
            api_url: editingCred.api_url,
            api_token: editingCred.api_token,
            instance_id: editingCred.instance_id
          })
          .eq("id", editingCred.id)
        if (error) throw error
        toast.success("האינטגרציה עודכנה בהצלחה")
      } else {
        const { error } = await supabase
          .from("whatsapp_credentials")
          .insert({
            business_id: businessId,
            name: editingCred.name,
            provider: editingCred.provider,
            api_url: editingCred.api_url,
            api_token: editingCred.api_token,
            instance_id: editingCred.instance_id
          })
        if (error) throw error
        toast.success("האינטגרציה נוספה בהצלחה")
      }
      setIsDialogOpen(false)
      loadCredentials()
    } catch (err) {
      console.error("Error saving credential:", err)
      toast.error("שגיאה בשמירת האינטגרציה")
    } finally {
      setIsSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm("האם אתה בטוח שברצונך למחוק אינטגרציה זו?")) return
    
    try {
      const { error } = await supabase
        .from("whatsapp_credentials")
        .delete()
        .eq("id", id)
      if (error) throw error
      toast.success("האינטגרציה נמחקה")
      loadCredentials()
    } catch (err) {
      console.error("Error deleting credential:", err)
      toast.error("שגיאה במחיקת האינטגרציה")
    }
  }

  if (!businessId) return null

  return (
    <div className="space-y-8" dir="rtl">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" className="h-9 w-9 rounded-lg" asChild>
          <Link href="/settings">
            <ArrowRight className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">אינטגרציות</h1>
          <p className="text-muted-foreground text-sm">ניהול חיבורים למערכות חיצוניות</p>
        </div>
      </div>

      <div className="grid gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
            <div className="space-y-1 text-right">
              <CardTitle className="text-xl font-bold flex items-center gap-2">
                <MessageSquare className="h-5 w-5 text-green-600" />
                WhatsApp
              </CardTitle>
              <CardDescription>חיבור חשבונות וואטסאפ לשליחת הודעות אוטומטיות</CardDescription>
            </div>
            <Button onClick={() => handleOpenDialog()} className="gap-2">
              <Plus className="h-4 w-4" />
              חיבור חדש
            </Button>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center py-8">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              </div>
            ) : credentials.length === 0 ? (
              <div className="text-center py-12 border-2 border-dashed rounded-xl bg-slate-50/50">
                <MessageSquare className="h-12 w-12 text-slate-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-slate-900">אין חיבורי וואטסאפ</h3>
                <p className="text-slate-500 text-sm mt-1 max-w-xs mx-auto">
                  חבר חשבון וואטסאפ רשמי או GreenAPI כדי להתחיל לשלוח הודעות אוטומטיות ללקוחות שלך.
                </p>
                <Button variant="outline" onClick={() => handleOpenDialog()} className="mt-6">
                  חבר חשבון ראשון
                </Button>
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {credentials.map((cred) => (
                  <Card key={cred.id} className="overflow-hidden border-slate-200 hover:border-green-200 transition-colors">
                    <div className="p-4 flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="bg-green-100 p-2 rounded-lg">
                          <MessageSquare className="h-5 w-5 text-green-600" />
                        </div>
                        <div className="text-right">
                          <h4 className="font-bold text-slate-900">{cred.name}</h4>
                          <p className="text-[10px] uppercase tracking-wider font-bold text-slate-400">
                            {cred.provider === "official" ? "וואטסאפ רשמי" : "GreenAPI"}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-slate-900" onClick={() => handleOpenDialog(cred)}>
                          <Save className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-destructive" onClick={() => handleDelete(cred.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    <div className="bg-slate-50 px-4 py-2 border-t flex items-center justify-between text-[11px] text-slate-500">
                      <span>{cred.provider === "green_api" ? `Instance: ${cred.instance_id}` : "חשבון פעיל"}</span>
                      <div className="flex items-center gap-1">
                        <div className="h-1.5 w-1.5 rounded-full bg-green-500" />
                        מחובר
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="bg-slate-50 border-none shadow-none">
          <CardContent className="pt-6">
            <div className="flex gap-4">
              <div className="bg-blue-100 p-3 rounded-full h-fit">
                <Share2 className="h-6 w-6 text-blue-600" />
              </div>
              <div className="text-right">
                <h3 className="font-bold text-slate-900">זקוק לעזרה בחיבור?</h3>
                <p className="text-sm text-slate-600 mt-1">
                  ניתן לחבר חשבון GreenAPI תוך דקות ספורות. עקוב אחר המדריך שלנו כדי לקבל את ה-API Token וה-Instance ID שלך.
                </p>
                <Link href="https://green-api.com/en/docs/before-start/" target="_blank" className="text-blue-600 text-sm font-bold flex items-center gap-1 mt-3 hover:underline">
                  <ExternalLink className="h-3 w-3" />
                  למדריך GreenAPI
                </Link>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[425px] text-right" dir="rtl">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">
              {editingCred?.id ? "עריכת חיבור וואטסאפ" : "חיבור וואטסאפ חדש"}
            </DialogTitle>
            <DialogDescription>
              הזן את פרטי החיבור למערכת הוואטסאפ שלך
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-6 py-4">
            <div className="space-y-2">
              <Label htmlFor="provider">סוג חיבור</Label>
              <Select 
                value={editingCred?.provider} 
                onValueChange={(v: "official" | "green_api") => setEditingCred({ ...editingCred, provider: v, api_url: v === "green_api" ? "https://api.green-api.com" : "" })}
              >
                <SelectTrigger id="provider">
                  <SelectValue placeholder="בחר סוג חיבור" />
                </SelectTrigger>
                <SelectContent dir="rtl">
                  <SelectItem value="official">וואטסאפ רשמי (Meta)</SelectItem>
                  <SelectItem value="green_api">GreenAPI (לא רשמי)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="name">שם החיבור (לזיהוי פנימי)</Label>
              <Input 
                id="name" 
                placeholder="למשל: וואטסאפ שירות לקוחות" 
                value={editingCred?.name || ""} 
                onChange={(e) => setEditingCred({ ...editingCred, name: e.target.value })}
              />
            </div>

            {editingCred?.provider === "green_api" && (
              <div className="space-y-2">
                <Label htmlFor="instance_id">Instance ID</Label>
                <Input 
                  id="instance_id" 
                  placeholder="למשל: 1101123456" 
                  value={editingCred?.instance_id || ""} 
                  onChange={(e) => setEditingCred({ ...editingCred, instance_id: e.target.value })}
                />
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="api_token">API Token / Access Token</Label>
              <Input 
                id="api_token" 
                type="password"
                placeholder="הזן את ה-Token שלך" 
                value={editingCred?.api_token || ""} 
                onChange={(e) => setEditingCred({ ...editingCred, api_token: e.target.value })}
              />
            </div>

            {editingCred?.provider === "official" && (
              <div className="space-y-2">
                <Label htmlFor="api_url">API URL (Endpoint)</Label>
                <Input 
                  id="api_url" 
                  placeholder="https://graph.facebook.com/v17.0/..." 
                  value={editingCred?.api_url || ""} 
                  onChange={(e) => setEditingCred({ ...editingCred, api_url: e.target.value })}
                />
              </div>
            )}
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button onClick={handleSave} disabled={isSaving} className="w-full sm:w-auto">
              {isSaving ? "שומר..." : "שמור חיבור"}
            </Button>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)} className="w-full sm:w-auto">
              ביטול
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
