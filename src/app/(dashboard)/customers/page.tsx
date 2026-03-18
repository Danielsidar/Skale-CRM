"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { useBusiness } from "@/lib/hooks/useBusiness"
import { usePermissions } from "@/lib/hooks/usePermissions"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Search, Building2, User, Phone, Mail, MoreHorizontal } from "lucide-react"
import { CreateCustomerDialog } from "@/components/customers/CreateCustomerDialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import type { Database } from "@/types/database.types"

import { ContactDetailsSlider } from "@/components/contacts/ContactDetailsSlider"

type Customer = Database["public"]["Tables"]["customers"]["Row"] & {
  total_value?: number
  contact_id?: string | null
}

export default function CustomersPage() {
  const { businessId } = useBusiness()
  const { can } = usePermissions()
  const router = useRouter()
  const [customers, setCustomers] = useState<Customer[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  
  const [selectedContactId, setSelectedContactId] = useState<string | null>(null)
  const [sliderOpen, setSliderOpen] = useState(false)
  
  const supabase = createClient()

  const loadCustomers = async () => {
    if (!businessId) return
    setLoading(true)
    
    // Fetch customers with their total purchase value
    let q = supabase
      .from("customers")
      .select(`
        *,
        customer_purchases (price)
      `)
      .eq("business_id", businessId)
      .order("updated_at", { ascending: false })

    if (search.trim()) {
      q = q.or(`name.ilike.%${search}%,contact_name.ilike.%${search}%,email.ilike.%${search}%,phone.ilike.%${search}%`)
    }

    const { data } = await q

    if (data) {
      // For each customer, try to find a matching contact ID
      // This is a bit inefficient but works for now. 
      // In a real app, we'd have a contact_id column in customers.
      const customersWithData = await Promise.all(data.map(async (c: any) => {
        const total_value = (c.customer_purchases as { price: number }[]).reduce((sum, p) => sum + Number(p.price), 0)
        
        let contact_id = null
        const orFilters = []
        if (c.email) orFilters.push(`email.eq."${c.email}"`)
        if (c.phone) orFilters.push(`phone.eq."${c.phone}"`)
        
        if (orFilters.length > 0) {
          const { data: contactData } = await supabase
            .from("contacts")
            .select("id")
            .eq("business_id", businessId)
            .or(orFilters.join(","))
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle()
          
          if (contactData) {
            contact_id = contactData.id
          }
        }

        return {
          ...c,
          total_value,
          contact_id
        }
      }))
      
      setCustomers(customersWithData)
    } else {
      setCustomers([])
    }
    
    setLoading(false)
  }

  useEffect(() => {
    loadCustomers()
  }, [businessId, search])

  const handleRowClick = (customer: Customer) => {
    if (customer.contact_id) {
      setSelectedContactId(customer.contact_id)
      setSliderOpen(true)
    } else {
      // toast.info("לא נמצא איש קשר מקושר ללקוח זה")
    }
  }

  if (!businessId) return null

  return (
    <div className="space-y-6 pb-10">
      <ContactDetailsSlider
        contactId={selectedContactId}
        open={sliderOpen}
        onOpenChange={setSliderOpen}
        onActivityAdded={loadCustomers}
        canViewPhone={can("contacts", "view_phone")}
        canViewEmail={can("contacts", "view_email")}
        canViewSource={can("contacts", "view_source")}
        canViewDealValue={can("deals", "view_value")}
      />
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">לקוחות</h1>
          <p className="text-muted-foreground text-sm mt-1">
            {customers.length} לקוחות רשומים
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute right-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              className="pr-10 w-56"
              placeholder="חיפוש לקוח..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <CreateCustomerDialog onSuccess={loadCustomers} />
        </div>
      </div>

      {loading ? (
        <div className="flex min-h-[400px] items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      ) : (
        <div className="rounded-xl border border-border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="text-right">לקוח / חברה</TableHead>
                <TableHead className="text-right">איש קשר</TableHead>
                <TableHead className="text-right">פרטים</TableHead>
                <TableHead className="text-right">שווי כולל</TableHead>
                <TableHead className="text-right">מקור</TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {customers.map((c) => (
                  <TableRow 
                    key={c.id} 
                    className="hover:bg-muted/50 transition-colors cursor-pointer"
                    onClick={() => handleRowClick(c)}
                  >
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      <div className="p-2 rounded-lg bg-primary/10 text-primary">
                        <Building2 className="h-4 w-4" />
                      </div>
                      <span className="text-foreground">{c.name}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <User className="h-3 w-3" />
                      {c.contact_name}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      {c.email && (
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Mail className="h-3 w-3" />
                          {c.email}
                        </div>
                      )}
                      {c.phone && (
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Phone className="h-3 w-3" />
                          {c.phone}
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="font-semibold text-success">
                      ₪{(c.total_value || 0).toLocaleString()}
                    </span>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {c.source || "—"}
                  </TableCell>
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 p-0">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="text-right" dir="rtl">
                        <DropdownMenuItem onClick={() => handleRowClick(c)}>
                          צפה בפרופיל
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {customers.length === 0 && (
            <div className="py-20 text-center">
              <div className="inline-flex p-4 rounded-full bg-muted mb-4">
                <Building2 className="h-8 w-8 text-muted-foreground" />
              </div>
              <p className="text-muted-foreground max-w-xs mx-auto">
                לא נמצאו לקוחות. התחל בהוספת לקוח חדש או המר לידים קיימים.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
