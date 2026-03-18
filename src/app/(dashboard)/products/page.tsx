"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { useBusiness } from "@/lib/hooks/useBusiness"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Search, Package, Pencil, Trash2 } from "lucide-react"
import { CreateProductDialog } from "@/components/products/CreateProductDialog"
import { UpdateProductDialog } from "@/components/products/UpdateProductDialog"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import type { Database } from "@/types/database.types"
import { toast } from "sonner"

type Product = Database["public"]["Tables"]["products"]["Row"]

export default function ProductsPage() {
  const { businessId } = useBusiness()
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
  const supabase = createClient()

  const loadProducts = async () => {
    if (!businessId) return
    setLoading(true)
    
    let q = supabase
      .from("products")
      .select("*")
      .eq("business_id", businessId)
      .order("name", { ascending: true })

    if (search.trim()) {
      q = q.ilike("name", `%${search}%`)
    }

    const { data, error } = await q

    if (error) {
      toast.error("שגיאה בטעינת מוצרים")
    } else {
      setProducts(data || [])
    }
    
    setLoading(false)
  }

  const handleDelete = async (id: string) => {
    if (!confirm("האם אתה בטוח שברצונך למחוק מוצר זה?")) return
    
    const { error } = await supabase
      .from("products")
      .delete()
      .eq("id", id)

    if (error) {
      toast.error("שגיאה במחיקת מוצר")
    } else {
      toast.success("מוצר נמחק")
      loadProducts()
    }
  }

  useEffect(() => {
    loadProducts()
  }, [businessId, search])

  if (!businessId) return null

  return (
    <div className="space-y-6 pb-10">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">מוצרים ושירותים</h1>
          <p className="text-muted-foreground text-sm mt-1">
            {products.length} מוצרים בקטלוג
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute right-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              className="pr-10 w-56 bg-white/5 border-white/10"
              placeholder="חיפוש מוצר..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <CreateProductDialog onSuccess={loadProducts} />
        </div>
      </div>

      <UpdateProductDialog 
        product={editingProduct}
        open={!!editingProduct}
        onOpenChange={(open) => !open && setEditingProduct(null)}
        onSuccess={loadProducts}
      />

      {loading ? (
        <div className="flex min-h-[400px] items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      ) : (
        <div className="rounded-xl border border-white/10 bg-white/5 overflow-hidden">
          <Table>
            <TableHeader className="bg-white/5">
              <TableRow className="hover:bg-transparent border-white/10">
                <TableHead className="text-right text-slate-400">שם המוצר</TableHead>
                <TableHead className="text-right text-slate-400">מחיר</TableHead>
                <TableHead className="text-right text-slate-400">תיאור</TableHead>
                <TableHead className="text-left text-slate-400">פעולות</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {products.map((p) => (
                <TableRow key={p.id} className="hover:bg-white/5 border-white/10 transition-colors">
                  <TableCell className="font-medium text-foreground">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-primary/10 text-primary">
                        <Package className="h-4 w-4" />
                      </div>
                      <span>{p.name}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-foreground">
                    <span className="font-semibold">
                      ₪{Number(p.price).toLocaleString()}
                    </span>
                  </TableCell>
                  <TableCell className="text-slate-400 text-sm max-w-[300px] truncate">
                    {p.description || "—"}
                  </TableCell>
                  <TableCell className="text-left">
                    <div className="flex items-center justify-start gap-2">
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-8 w-8 text-slate-400 hover:text-white"
                        onClick={() => setEditingProduct(p)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-8 w-8 text-slate-400 hover:text-rose-500"
                        onClick={() => handleDelete(p.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {products.length === 0 && (
            <div className="py-20 text-center">
              <div className="inline-flex p-4 rounded-full bg-white/5 mb-4">
                <Package className="h-8 w-8 text-slate-600" />
              </div>
              <p className="text-slate-400 max-w-xs mx-auto">
                לא נמצאו מוצרים. התחל בהוספת המוצר הראשון שלך לקטלוג.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
