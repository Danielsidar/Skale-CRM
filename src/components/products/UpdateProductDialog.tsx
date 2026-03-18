"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "sonner"
import { Loader2 } from "lucide-react"
import type { Database } from "@/types/database.types"

type Product = Database["public"]["Tables"]["products"]["Row"]

export function UpdateProductDialog({
  product,
  open,
  onOpenChange,
  onSuccess,
}: {
  product: Product | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
}) {
  const [loading, setLoading] = useState(false)
  const [name, setName] = useState("")
  const [price, setPrice] = useState("")
  const [description, setDescription] = useState("")
  
  const supabase = createClient()

  useEffect(() => {
    if (product) {
      setName(product.name)
      setPrice(String(product.price))
      setDescription(product.description || "")
    }
  }, [product])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!product || !name.trim()) return
    
    setLoading(true)
    try {
      const { error } = await supabase
        .from("products")
        .update({
          name: name.trim(),
          price: price ? Number(price) : 0,
          description: description.trim() || null,
        })
        .eq("id", product.id)
      
      if (error) throw error
      
      toast.success("מוצר עודכן בהצלחה")
      onOpenChange(false)
      onSuccess?.()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "שגיאה בעדכון מוצר")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle>עריכת מוצר</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="edit-name">שם המוצר / שירות</Label>
            <Input
              id="edit-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="שם המוצר"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-price">מחיר ברירת מחדל (₪)</Label>
            <Input
              id="edit-price"
              type="number"
              min={0}
              step={0.01}
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder="0.00"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-description">תיאור</Label>
            <Textarea
              id="edit-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="תיאור קצר..."
              rows={3}
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              ביטול
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "שמור שינויים"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
