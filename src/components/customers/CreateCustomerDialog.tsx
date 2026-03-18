"use client"

import { useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { useBusiness } from "@/lib/hooks/useBusiness"
import { createCustomer } from "@/lib/services/crm"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "sonner"
import { Plus, Loader2 } from "lucide-react"

export function CreateCustomerDialog({
  onSuccess,
  trigger,
}: {
  onSuccess?: () => void
  trigger?: React.ReactNode
}) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [name, setName] = useState("")
  const [contactName, setContactName] = useState("")
  const [email, setEmail] = useState("")
  const [phone, setPhone] = useState("")
  const [source, setSource] = useState("")
  const [notes, setNotes] = useState("")
  
  const supabase = createClient()
  const { businessId } = useBusiness()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!businessId || !name.trim() || !contactName.trim()) return
    
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    setLoading(true)
    try {
      const result = await createCustomer(supabase, {
        business_id: businessId,
        user_id: user.id,
        name: name.trim(),
        contact_name: contactName.trim(),
        email: email.trim() || null,
        phone: phone.trim() || null,
        source: source.trim() || null,
        notes: notes.trim() || null,
      })
      
      if (result.error) throw new Error(result.error)
      
      toast.success("לקוח נוצר בהצלחה")
      setName("")
      setContactName("")
      setEmail("")
      setPhone("")
      setSource("")
      setNotes("")
      setOpen(false)
      onSuccess?.()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "שגיאה ביצירת לקוח")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button size="sm" className="gap-2">
            <Plus className="h-4 w-4" />
            לקוח חדש
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[450px]">
        <DialogHeader>
          <DialogTitle>לקוח חדש</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">שם העסק / חברה</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="שם העסק"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="contactName">שם איש קשר</Label>
              <Input
                id="contactName"
                value={contactName}
                onChange={(e) => setContactName(e.target.value)}
                placeholder="שם מלא"
                required
              />
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="email">אימייל</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="email@example.com"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">טלפון</Label>
              <Input
                id="phone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="050-0000000"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="source">מקור</Label>
            <Input
              id="source"
              value={source}
              onChange={(e) => setSource(e.target.value)}
              placeholder="למשל: פייסבוק, המלצה..."
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">הערות</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="פרטים נוספים..."
              rows={3}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              ביטול
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "צור לקוח"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
