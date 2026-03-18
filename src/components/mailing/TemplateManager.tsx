"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { useBusiness } from "@/lib/hooks/useBusiness"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Plus, Search, Layout, Trash2, Edit, Copy, Loader2, FileCode, Eye, FileJson } from "lucide-react"
import { useRouter } from "next/navigation"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { toast } from "sonner"
import { EmailBuilder } from "./builder/EmailBuilder"
import { generateEmailHTML } from "@/lib/mailing/email-html-generator"

export function TemplateManager() {
  const { businessId } = useBusiness()
  const router = useRouter()
  const [templates, setTemplates] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [formData, setFormData] = useState({
    name: "",
    subject: "",
    content_html: ""
  })
  const [saving, setSaving] = useState(false)
  const supabase = createClient()

  const loadTemplates = async () => {
    if (!businessId) return
    setLoading(true)
    const { data, error } = await supabase
      .from("email_templates")
      .select("*")
      .eq("business_id", businessId)
      .order("created_at", { ascending: false })

    if (error) {
      toast.error("שגיאה בטעינת תבניות")
    } else {
      setTemplates(data ?? [])
    }
    setLoading(false)
  }

  useEffect(() => {
    loadTemplates()
  }, [businessId, supabase])

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    if (!confirm("האם אתה בטוח שברצונך למחוק תבנית זו?")) return

    const { error } = await supabase
      .from("email_templates")
      .delete()
      .eq("id", id)

    if (error) {
      toast.error("שגיאה במחיקת תבנית")
    } else {
      toast.success("תבנית נמחקה")
      loadTemplates()
    }
  }

  const handleEdit = (template: any) => {
    router.push(`/mailing/templates/${template.id}/builder`)
  }

  const handleCreateNew = () => {
    router.push(`/mailing/templates/new/builder`)
  }

  const handleDuplicate = async (template: any, e: React.MouseEvent) => {
    e.stopPropagation()
    setSaving(true)
    const { error } = await supabase
      .from("email_templates")
      .insert({
        business_id: businessId,
        name: `${template.name} (עותק)`,
        subject: template.subject,
        content_html: template.content_html
      })

    if (error) {
      toast.error("שגיאה בשכפול תבנית")
    } else {
      toast.success("תבנית שוכפלה בהצלחה")
      loadTemplates()
    }
    setSaving(false)
  }

  if (!businessId) return null

  const filteredTemplates = templates.filter(t => 
    t.name.toLowerCase().includes(search.toLowerCase()) || 
    (t.subject && t.subject.toLowerCase().includes(search.toLowerCase()))
  )

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="relative w-64">
          <Search className="absolute right-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            className="pr-10"
            placeholder="חיפוש תבנית..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        
        <Button onClick={handleCreateNew} className="gap-2">
          <Plus className="h-4 w-4" />
          תבנית חדשה
        </Button>
      </div>

      {loading ? (
        <div className="flex h-32 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : filteredTemplates.length === 0 ? (
        <div className="h-64 flex flex-col items-center justify-center border-2 border-dashed border-border rounded-xl bg-card/30">
          <FileCode className="h-12 w-12 text-muted-foreground/30 mb-3" />
          <p className="text-muted-foreground text-sm">אין תבניות מייל עדיין. צור את הראשונה שלך!</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredTemplates.map((template) => (
            <Card 
              key={template.id} 
              className="group hover:shadow-xl hover:border-primary/50 transition-all duration-300 overflow-hidden bg-card/50 backdrop-blur-sm cursor-pointer border-border/50"
              onClick={() => handleEdit(template)}
            >
              <CardHeader className="pb-3 border-b border-border/10 bg-muted/20">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-white transition-colors duration-300">
                      <Layout className="h-4 w-4" />
                    </div>
                    <CardTitle className="text-sm font-bold truncate max-w-[150px]">
                      {template.name}
                    </CardTitle>
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-8 w-8 hover:bg-primary/10 hover:text-primary"
                      onClick={(e) => handleDuplicate(template, e)}
                      title="שכפל"
                    >
                      <Copy className="h-3.5 w-3.5" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-8 w-8 hover:bg-rose-500/10 hover:text-rose-500"
                      onClick={(e) => handleDelete(template.id, e)}
                      title="מחק"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="py-6 flex flex-col items-center justify-center min-h-[120px] bg-gradient-to-b from-transparent to-muted/10">
                <div className="text-muted-foreground text-xs font-mono text-center truncate w-full mb-3 px-4">
                  {template.subject || "(ללא נושא)" }
                </div>
                <div className="flex gap-2">
                   <Button variant="outline" size="sm" className="h-8 text-[11px] gap-1.5 px-3">
                    <Edit className="h-3 w-3" />
                    ערוך
                  </Button>
                   <Button variant="ghost" size="sm" className="h-8 text-[11px] gap-1.5 px-3">
                    <Eye className="h-3 w-3" />
                    תצוגה מקדימה
                  </Button>
                </div>
              </CardContent>
              <CardFooter className="py-3 px-4 text-[10px] text-muted-foreground border-t border-border/10">
                עודכן בתאריך: {new Date(template.updated_at).toLocaleDateString('he-IL')}
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
