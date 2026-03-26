"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { useBusiness } from "@/lib/hooks/useBusiness"
import { useProductsQuery } from "@/lib/hooks/queries"
import { createDeal, createContact, updateDeal } from "@/lib/services/crm"
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { toast } from "sonner"
import { 
  Loader2, 
  UserPlus, 
  Users, 
  Briefcase, 
  Package, 
  CircleDollarSign,
  User,
  Mail,
  Phone,
  PlusCircle,
  Pencil,
  Building2,
  Wallet,
  Tag
} from "lucide-react"
import type { Database } from "@/types/database.types"
import { cn } from "@/lib/utils"

interface QuickAddDealDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  pipelineId: string
  stageId: string
  onSuccess: () => void
  defaultProductId?: string | null
  deal?: Database["public"]["Tables"]["deals"]["Row"] | null
}

type Contact = Database["public"]["Tables"]["contacts"]["Row"]
type Product = Database["public"]["Tables"]["products"]["Row"]

export function QuickAddDealDialog({
  open,
  onOpenChange,
  pipelineId,
  stageId,
  onSuccess,
  defaultProductId,
  deal,
}: QuickAddDealDialogProps) {
  const [title, setTitle] = useState(deal?.title || "")
  const [isTitleDirty, setIsTitleDirty] = useState(!!deal)
  const [value, setValue] = useState(deal?.value?.toString() || "")
  const [contactId, setContactId] = useState<string>(deal?.contact_id || "")
  const [productId, setProductId] = useState<string>(deal?.product_id || "none")
  const [tags, setTags] = useState(deal?.tags?.join(", ") || "")
  const [loading, setLoading] = useState(false)
  const [contacts, setContacts] = useState<Contact[]>([])
  const [showContactSuggestions, setShowContactSuggestions] = useState(false)
  
  // Unified contact fields
  const [contactName, setContactName] = useState("")
  const [contactEmail, setContactEmail] = useState("")
  const [contactPhone, setContactPhone] = useState("")
  
  const supabase = createClient()
  const { businessId } = useBusiness()
  // Use cached products query instead of fetching on every dialog open
  const { data: productsData } = useProductsQuery(businessId)
  const products = (productsData ?? []) as Product[]

  useEffect(() => {
    if (open) {
      if (deal) {
        setTitle(deal.title)
        setIsTitleDirty(true)
        setValue(deal.value?.toString() || "")
        setContactId(deal.contact_id || "")
        setProductId(deal.product_id || "none")
        setTags(deal.tags?.join(", ") || "")
        
        // Fetch contact details if editing
        if (deal.contact_id) {
          supabase
            .from("contacts")
            .select("*")
            .eq("id", deal.contact_id)
            .single()
            .then(res => {
              if (res.data) {
                setContactName(res.data.full_name)
                setContactEmail(res.data.email || "")
                setContactPhone(res.data.phone || "")
              }
            })
        }
      } else {
        resetForm()
      }
    }
  }, [open, deal])

  useEffect(() => {
    if (isTitleDirty && !deal) return // Don't auto-set if title was manual (only for new)
    if (deal) return // Don't auto-set if editing

    setTitle(contactName)
  }, [contactName, isTitleDirty, deal])

  useEffect(() => {
    if (open && businessId) {
      // Only fetch contacts (products are now cached via useProductsQuery)
      supabase
        .from("contacts")
        .select("id, full_name, email, phone")
        .eq("business_id", businessId)
        .order("full_name")
        .then((res) => setContacts(res.data as any || []))
    }
  }, [open, businessId])

  useEffect(() => {
    if (open && defaultProductId && defaultProductId !== "none" && products.length > 0 && productId === "none") {
      const product = products.find(p => p.id === defaultProductId)
      if (product) {
        setProductId(defaultProductId)
        setValue(String(product.price))
      }
    }
  }, [open, defaultProductId, products, productId])

  const handleProductChange = (id: string) => {
    setProductId(id)
    if (id !== "none") {
      const product = products.find(p => p.id === id)
      if (product) {
        setValue(String(product.price))
      }
    } else {
      setValue("")
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!businessId || !title.trim()) return
    
    if (!contactName.trim()) {
      toast.error("נא להזין שם איש קשר")
      return
    }

    setLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error("לא מחובר")

      // Always call createContact - it handles existing contact check by email/phone
      const contactResult = await createContact(supabase, {
        business_id: businessId,
        full_name: contactName.trim(),
        email: contactEmail.trim() || null,
        phone: contactPhone.trim() || null,
        owner_user_id: user.id,
      })
      
      if (contactResult.error) throw new Error(contactResult.error)
      const finalContactId = contactResult.data!.id

      if (deal) {
        // Edit mode
        const editResult = await updateDeal(supabase, deal.id, {
          title: title.trim(),
          value: value ? Number(value) : 0,
          contact_id: finalContactId,
          product_id: productId === "none" ? null : productId,
          tags: tags.split(",").map(t => t.trim()).filter(Boolean),
        })
        if (editResult.error) throw new Error(editResult.error)
        toast.success("העסקה עודכנה בהצלחה")
      } else {
        // Create mode
        const result = await createDeal(supabase, {
          business_id: businessId,
          pipeline_id: pipelineId,
          stage_id: stageId,
          title: title.trim(),
          owner_user_id: user.id,
          value: value ? Number(value) : 0,
          contact_id: finalContactId,
          product_id: productId === "none" ? null : productId,
          tags: tags.split(",").map(t => t.trim()).filter(Boolean),
        })
        if (result.error) throw new Error(result.error)
        toast.success("הזדמנות חדשה נוצרה בהצלחה")
      }

      resetForm()
      onOpenChange(false)
      onSuccess()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "שגיאה ביצירת העסקה")
    } finally {
      setLoading(false)
    }
  }

  const resetForm = () => {
    setTitle("")
    setIsTitleDirty(false)
    setValue("")
    setContactId("")
    setProductId("none")
    setTags("")
    setContactName("")
    setContactEmail("")
    setContactPhone("")
    setShowContactSuggestions(false)
  }

  return (
    <Dialog open={open} onOpenChange={(val) => {
      if (!val) resetForm()
      onOpenChange(val)
    }}>
      <DialogContent className="sm:max-w-[480px] bg-white p-0 overflow-hidden border-none shadow-2xl" dir="rtl">
        {/* Decorative Header */}
        <div className="relative h-24 bg-primary overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-primary via-primary/90 to-blue-600" />
          <div className="absolute inset-0 opacity-10">
            <div className="absolute top-0 right-0 w-48 h-48 bg-white rounded-full -translate-y-1/2 translate-x-1/2" />
            <div className="absolute bottom-0 left-0 w-24 h-24 bg-white rounded-full translate-y-1/2 -translate-x-1/2" />
          </div>
          
          <div className="relative h-full flex flex-col justify-end p-6 text-white">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center shadow-inner">
                {deal ? <Pencil className="h-6 w-6 text-white" /> : <PlusCircle className="h-6 w-6 text-white" />}
              </div>
              <div>
                <DialogTitle className="text-2xl font-black tracking-tight mb-0.5">{deal ? "עריכת עסקה" : "הזדמנות חדשה"}</DialogTitle>
                <DialogDescription className="text-white/80 font-medium text-xs">
                  {deal ? "עדכן את פרטי העסקה הקיימת" : "הכנסת פרטי ליד חדש למערכת ה-CRM"}
                </DialogDescription>
              </div>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6 bg-slate-50/50">
          {/* Section: General Information */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 pb-1.5 border-b border-slate-100">
              <div className="h-7 w-7 rounded-lg bg-blue-50 flex items-center justify-center">
                <Building2 className="h-3.5 w-3.5 text-blue-600" />
              </div>
              <h3 className="font-bold text-slate-800 text-sm">פרטי ההזדמנות</h3>
            </div>
            
            <div className="grid grid-cols-1 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="title" className="text-xs font-bold text-slate-700">
                  כותרת העסקה <span className="text-rose-500">*</span>
                </Label>
                <div className="relative">
                  <Briefcase className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input
                    id="title"
                    value={title}
                    onChange={(e) => {
                      setTitle(e.target.value)
                      setIsTitleDirty(true)
                    }}
                    placeholder="למשל: ייעוץ עסקי - חברת אלפא"
                    className="pr-10 h-10 bg-white border-slate-200 focus:ring-2 focus:ring-primary/20 transition-all rounded-xl text-sm font-medium shadow-sm"
                    required
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Section: Contact Information */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 pb-1.5 border-b border-slate-100">
              <div className="h-7 w-7 rounded-lg bg-emerald-50 flex items-center justify-center">
                <User className="h-3.5 w-3.5 text-emerald-600" />
              </div>
              <h3 className="font-bold text-slate-800 text-sm">פרטי איש קשר</h3>
            </div>

            <div className="space-y-3">
              <div className="space-y-1.5 relative">
                <Label className="text-xs font-bold text-slate-700">שם מלא *</Label>
                <div className="relative">
                  <User className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input
                    value={contactName}
                    onChange={(e) => {
                      setContactName(e.target.value)
                      setShowContactSuggestions(true)
                      setContactId("") // Clear contact ID if name is changed manually
                    }}
                    onFocus={() => setShowContactSuggestions(true)}
                    onBlur={() => {
                      // Small delay to allow clicking the suggestion
                      setTimeout(() => setShowContactSuggestions(false), 200)
                    }}
                    placeholder="הקלד שם לחיפוש או יצירה..."
                    className="pr-10 h-10 bg-white border-slate-200 rounded-xl shadow-sm font-medium text-sm"
                  />
                </div>

                {/* Suggestions List */}
                {showContactSuggestions && contactName.length > 0 && (
                  <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-xl max-h-[200px] overflow-auto animate-in fade-in slide-in-from-top-2 duration-200">
                    {contacts
                      .filter(c => c.full_name.toLowerCase().includes(contactName.toLowerCase()))
                      .map(c => (
                        <button
                          key={c.id}
                          type="button"
                          className="w-full text-right p-3 hover:bg-slate-50 border-b border-slate-50 last:border-0 transition-colors flex flex-col items-start"
                          onClick={() => {
                            setContactId(c.id)
                            setContactName(c.full_name)
                            setContactEmail(c.email || "")
                            setContactPhone(c.phone || "")
                            setShowContactSuggestions(false)
                          }}
                        >
                          <span className="font-bold text-sm text-slate-800">{c.full_name}</span>
                          <span className="text-[10px] text-slate-400">{c.email || c.phone || "ללא פרטים נוספים"}</span>
                        </button>
                      ))}
                    {contacts.filter(c => c.full_name.toLowerCase().includes(contactName.toLowerCase())).length === 0 && (
                      <div className="p-4 text-center text-slate-400 text-xs italic">
                        איש קשר חדש: "{contactName}"
                      </div>
                    )}
                  </div>
                )}
                {/* Close suggestions on click outside would be good, but for now we close on select */}
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-slate-700">אימייל</Label>
                  <div className="relative">
                    <Mail className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <Input
                      type="email"
                      value={contactEmail}
                      onChange={(e) => setContactEmail(e.target.value)}
                      placeholder="email@example.com"
                      className="pr-10 h-10 bg-white border-slate-200 rounded-xl shadow-sm font-medium text-sm"
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-slate-700">טלפון</Label>
                  <div className="relative">
                    <Phone className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <Input
                      value={contactPhone}
                      onChange={(e) => setContactPhone(e.target.value)}
                      placeholder="050-0000000"
                      className="pr-10 h-10 bg-white border-slate-200 rounded-xl shadow-sm font-medium text-sm"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Section: Deal Value */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 pb-1.5 border-b border-slate-100">
              <div className="h-7 w-7 rounded-lg bg-amber-50 flex items-center justify-center">
                <Wallet className="h-3.5 w-3.5 text-amber-600" />
              </div>
              <h3 className="font-bold text-slate-800 text-sm">פרטי עסקה ומוצר</h3>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-700">מוצר / שירות</Label>
                <Select value={productId} onValueChange={handleProductChange}>
                  <SelectTrigger className="h-auto min-h-[44px] py-2 bg-white border-slate-200 rounded-xl px-4 shadow-sm text-sm">
                    <div className="flex items-center gap-3 w-full">
                      <Package className="h-4 w-4 text-slate-400 shrink-0" />
                      <div className="flex-1 overflow-hidden">
                        <SelectValue placeholder="בחר מוצר" />
                      </div>
                    </div>
                  </SelectTrigger>
                  <SelectContent className="rounded-xl shadow-xl" dir="rtl">
                    <SelectItem value="none" className="text-slate-400 italic py-2 text-sm">ללא מוצר ספציפי</SelectItem>
                    {products.map(p => (
                      <SelectItem key={p.id} value={p.id} className="py-2 focus:bg-slate-50 transition-colors text-sm">
                        <div className="flex flex-col items-start gap-0.5">
                          <span className="font-bold">{p.name}</span>
                          <span className="text-[10px] text-primary font-medium">₪{Number(p.price).toLocaleString()}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="value" className="text-xs font-bold text-slate-700">ערך העסקה</Label>
                <div className="relative">
                  <CircleDollarSign className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">₪</span>
                  <Input
                    id="value"
                    type="number"
                    min={0}
                    step={0.01}
                    value={value}
                    onChange={(e) => setValue(e.target.value)}
                    placeholder="0.00"
                    className="pr-10 pl-8 h-10 bg-white border-slate-200 rounded-xl shadow-sm text-base font-bold text-emerald-600"
                  />
                </div>
              </div>
            </div>

            {/* Tags Input */}
            <div className="space-y-1.5">
              <Label htmlFor="tags" className="text-xs font-bold text-slate-700">תגיות (מופרדות בפסיק)</Label>
              <div className="relative">
                <Tag className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  id="tags"
                  value={tags}
                  onChange={(e) => setTags(e.target.value)}
                  placeholder="VIP, לקוח חוזר, דחוף..."
                  className="pr-10 h-10 bg-white border-slate-200 rounded-xl shadow-sm text-sm"
                />
              </div>
            </div>
          </div>

          <DialogFooter className="pt-5 flex items-center justify-between flex-row-reverse border-t border-slate-200">
            <div className="flex items-center gap-2">
              <Button 
                type="button" 
                variant="ghost" 
                onClick={() => onOpenChange(false)} 
                className="h-10 px-4 rounded-xl font-bold text-slate-500 hover:bg-slate-100 transition-colors text-sm"
              >
                ביטול
              </Button>
              <Button 
                type="submit" 
                disabled={loading} 
                className="h-10 px-8 rounded-xl bg-primary hover:bg-primary/90 text-white font-black shadow-lg shadow-primary/25 transition-all active:scale-95 text-sm"
              >
                {loading ? (
                  <div className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>{deal ? "מעדכן..." : "יוצר..."}</span>
                  </div>
                ) : (
                  deal ? "עדכן עסקה" : "צור הזדמנות"
                )}
              </Button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

