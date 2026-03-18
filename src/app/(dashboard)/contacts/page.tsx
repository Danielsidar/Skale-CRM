"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { useBusiness } from "@/lib/hooks/useBusiness"
import { usePermissions } from "@/lib/hooks/usePermissions"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Search, User, MoreHorizontal, ArrowUpRight } from "lucide-react"
import { CreateContactDialog } from "@/components/contacts/CreateContactDialog"
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

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

import { ContactDetailsSlider } from "@/components/contacts/ContactDetailsSlider"

type Contact = Database["public"]["Tables"]["contacts"]["Row"]

export default function ContactsPage() {
  const { businessId } = useBusiness()
  const { can } = usePermissions()
  const router = useRouter()
  const [contacts, setContacts] = useState<Contact[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [ownerFilter, setOwnerFilter] = useState<"all" | "mine">("all")
  const [currentUser, setCurrentUser] = useState<any>(null)
  
  const [selectedContactId, setSelectedContactId] = useState<string | null>(null)
  const [sliderOpen, setSliderOpen] = useState(false)
  
  const supabase = createClient()

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setCurrentUser(user)
    })
  }, [supabase])

  const loadContacts = () => {
    if (!businessId) return
    setLoading(true)
    let q = supabase
      .from("contacts")
      .select("*")
      .eq("business_id", businessId)
      .order("updated_at", { ascending: false })
    
    if (search.trim()) {
      q = q.or(`full_name.ilike.%${search}%,email.ilike.%${search}%,phone.ilike.%${search}%`)
    }

    if (ownerFilter === "mine" && currentUser) {
      q = q.eq("owner_user_id", currentUser.id)
    }

    q.then(({ data }) => {
      setContacts(data ?? [])
      setLoading(false)
    })
  }

  useEffect(() => {
    loadContacts()
  }, [businessId, search, ownerFilter, supabase])

  const handleContactClick = (id: string) => {
    setSelectedContactId(id)
    setSliderOpen(true)
  }

  if (!businessId) return null

  return (
    <div className="space-y-6 pb-10">
      <ContactDetailsSlider
        contactId={selectedContactId}
        open={sliderOpen}
        onOpenChange={setSliderOpen}
        onActivityAdded={loadContacts}
        canViewPhone={can("contacts", "view_phone")}
        canViewEmail={can("contacts", "view_email")}
        canViewSource={can("contacts", "view_source")}
        canViewDealValue={can("deals", "view_value")}
      />
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">אנשי קשר</h1>
          <p className="text-muted-foreground text-sm mt-1">
            {contacts.length} אנשי קשר
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={ownerFilter} onValueChange={(val: any) => setOwnerFilter(val)}>
            <SelectTrigger className="h-10 border-slate-200 rounded-lg bg-white shadow-sm w-[140px] font-medium">
              <User className="h-4 w-4 text-slate-500" />
              <SelectValue placeholder="סינון נציג" />
            </SelectTrigger>
            <SelectContent align="end" position="popper">
              <SelectItem value="all">כל אנשי הקשר</SelectItem>
              <SelectItem value="mine">שלי בלבד</SelectItem>
            </SelectContent>
          </Select>
          <div className="relative">
            <Search className="absolute right-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              className="pr-10 w-56"
              placeholder="חיפוש..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <CreateContactDialog onSuccess={loadContacts} />
        </div>
      </div>

      {loading ? (
        <div className="flex min-h-[200px] items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      ) : (
        <div className="rounded-xl border border-border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-right">שם</TableHead>
                <TableHead className="text-right">אימייל</TableHead>
                <TableHead className="text-right">טלפון</TableHead>
                <TableHead className="text-right">מקור</TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {contacts.map((c) => (
                <TableRow 
                  key={c.id} 
                  className="cursor-pointer hover:bg-muted/50 transition-colors"
                  onClick={() => handleContactClick(c.id)}
                >
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2 text-foreground group-hover:text-primary transition-colors">
                      <User className="h-4 w-4 text-muted-foreground" />
                      {c.full_name}
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{can("contacts", "view_email") ? (c.email ?? "—") : "•••••••"}</TableCell>
                  <TableCell className="text-muted-foreground">{can("contacts", "view_phone") ? (c.phone ?? "—") : "•••••••"}</TableCell>
                  <TableCell className="text-muted-foreground">{can("contacts", "view_source") ? (c.source ?? "—") : "•••"}</TableCell>
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 p-0">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleContactClick(c.id)}>
                          צפה בפרופיל
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                          <Link href={`/contacts/${c.id}`} className="flex items-center justify-between">
                            דף פרופיל מלא
                            <ArrowUpRight className="h-3.5 w-3.5 mr-2" />
                          </Link>
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {contacts.length === 0 && (
            <div className="py-12 text-center text-muted-foreground">
              אין אנשי קשר. הוסף איש קשר מעיסקה או מהגדרות.
            </div>
          )}
        </div>
      )}
    </div>
  )
}
