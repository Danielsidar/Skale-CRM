"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { convertToCustomer, moveDealStage } from "@/lib/services/crm"
import { useProductsQuery } from "@/lib/hooks/queries"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "sonner"
import { Loader2, PartyPopper } from "lucide-react"
import type { Database } from "@/types/database.types"

type Product = Database["public"]["Tables"]["products"]["Row"]
type Deal = Database["public"]["Tables"]["deals"]["Row"]

interface CloseDealWonDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  deal: Deal | null
  businessId: string
  wonStageId: string
  onSuccess: () => void
  onCancel: () => void
}

export function CloseDealWonDialog({
  open,
  onOpenChange,
  deal,
  businessId,
  wonStageId,
  onSuccess,
  onCancel,
}: CloseDealWonDialogProps) {
  const [loading, setLoading] = useState(false)
  const [productId, setProductId] = useState<string>("none")
  const [price, setPrice] = useState("")
  const [notes, setNotes] = useState("")
  
  const supabase = createClient()
  // Use cached products query instead of fetching on every dialog open
  const { data: productsData } = useProductsQuery(businessId)
  const products = (productsData ?? []) as Product[]

  useEffect(() => {
    if (open && deal) {
      setPrice(String(deal.value || ""))
      setProductId(deal.product_id || "none")
    }
  }, [open, deal])

  const handleProductChange = (id: string) => {
    setProductId(id)
    if (id !== "none") {
      const product = products.find(p => p.id === id)
      if (product) {
        setPrice(String(product.price))
      }
    }
  }

  const handleConfirm = async () => {
    if (!deal || !businessId) return
    setLoading(true)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error("לא מחובר")

      // 1. If contact_id exists, convert to customer and record purchase
      if (deal.contact_id) {
        const convRes = await convertToCustomer(supabase, {
          businessId,
          userId: user.id,
          contactId: deal.contact_id,
          dealId: deal.id,
          productId: productId === "none" ? null : productId,
          price: Number(price) || 0,
          notes: notes.trim() || null,
        })
        if (!convRes.ok) throw new Error(convRes.error)
      }

      // 2. Move deal to Won stage
      const moveRes = await moveDealStage(supabase, {
        dealId: deal.id,
        newStageId: wonStageId,
        changedByUserId: user.id,
        businessId,
      })

      if (!moveRes.ok) throw new Error(moveRes.error)

      // lead.won נורה מתוך moveDealStage כשהשלב הוא is_won — לא צריך deal.won (לא קיים במנוע החדש)
      toast.success("מזל טוב! העיסקה נסגרה והלקוח עודכן 🎉")
      onOpenChange(false)
      onSuccess()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "שגיאה בסגירת העיסקה")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(val) => {
      if (!val) onCancel()
      onOpenChange(val)
    }}>
      <DialogContent className="sm:max-w-[450px]">
        <DialogHeader>
          <div className="flex items-center gap-2 text-emerald-500 mb-2">
            <PartyPopper className="h-6 w-6" />
            <DialogTitle className="text-xl">סגירת עיסקה בהצלחה!</DialogTitle>
          </div>
          <DialogDescription>
            כל הכבוד על סגירת העיסקה ״{deal?.title}״. אשר את הפרטים הסופיים כדי להפוך את איש הקשר ללקוח קבוע.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>מוצר / שירות שנרכש</Label>
            <Select value={productId} onValueChange={handleProductChange}>
              <SelectTrigger>
                <SelectValue placeholder="בחר מוצר" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">ללא מוצר ספציפי</SelectItem>
                {products.map(p => (
                  <SelectItem key={p.id} value={p.id}>{p.name} (₪{Number(p.price)})</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="final-price">מחיר סופי לסגירה (₪)</Label>
            <Input
              id="final-price"
              type="number"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder="0.00"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="won-notes">הערות לסגירה</Label>
            <Textarea
              id="won-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="איך הייתה המכירה? משהו שחשוב לזכור להמשך?"
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onCancel} disabled={loading}>
            ביטול
          </Button>
          <Button 
            className="bg-emerald-600 hover:bg-emerald-700 text-white" 
            onClick={handleConfirm}
            disabled={loading}
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "אשר וסגור עיסקה"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
