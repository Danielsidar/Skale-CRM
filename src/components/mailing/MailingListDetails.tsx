"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { useBusiness } from "@/lib/hooks/useBusiness"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { 
  ArrowRight, 
  Search, 
  UserPlus, 
  Trash2, 
  User, 
  Mail, 
  Phone,
  Loader2,
  X
} from "lucide-react"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Checkbox } from "@/components/ui/checkbox"
import { toast } from "sonner"

interface MailingListDetailsProps {
  listId: string
  onBack: () => void
  hideBack?: boolean
}

export function MailingListDetails({ listId, onBack, hideBack = false }: MailingListDetailsProps) {
  const { businessId } = useBusiness()
  const [list, setList] = useState<any>(null)
  const [subscribers, setSubscribers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [isAddContactsOpen, setIsAddContactsOpen] = useState(false)
  const [availableContacts, setAvailableContacts] = useState<any[]>([])
  const [selectedContacts, setSelectedContacts] = useState<string[]>([])
  const [contactSearch, setContactSearch] = useState("")
  const [addingContacts, setAddingContacts] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    const loadData = async () => {
      if (!businessId || !listId) return
      setLoading(true)

      // 1. Load list details
      const { data: listData, error: listError } = await supabase
        .from("mailing_lists")
        .select("*")
        .eq("id", listId)
        .single()

      if (listError) {
        toast.error("שגיאה בטעינת פרטי רשימה")
        onBack()
        return
      }
      setList(listData)

      // 2. Load subscribers
      await loadSubscribers()
      setLoading(false)
    }

    loadData()
  }, [businessId, listId, supabase])

  const loadSubscribers = async () => {
    const { data, error } = await supabase
      .from("mailing_list_contacts")
      .select(`
        id,
        contact_id,
        contacts (
          id,
          full_name,
          email,
          phone,
          source
        )
      `)
      .eq("list_id", listId)

    if (error) {
      toast.error("שגיאה בטעינת מנויים")
    } else {
      setSubscribers(data ?? [])
    }
  }

  const loadAvailableContacts = async () => {
    if (!businessId) return
    
    // Fetch contacts not already in the list
    const subscriberIds = subscribers.map(s => s.contact_id)
    
    let query = supabase
      .from("contacts")
      .select("id, full_name, email, phone")
      .eq("business_id", businessId)
    
    if (subscriberIds.length > 0) {
      query = query.not("id", "in", `(${subscriberIds.join(",")})`)
    }

    if (contactSearch.trim()) {
      query = query.or(`full_name.ilike.%${contactSearch}%,email.ilike.%${contactSearch}%`)
    }

    const { data, error } = await query.limit(50)

    if (error) {
      toast.error("שגיאה בטעינת אנשי קשר זמינים")
    } else {
      setAvailableContacts(data ?? [])
    }
  }

  useEffect(() => {
    if (isAddContactsOpen) {
      loadAvailableContacts()
    }
  }, [isAddContactsOpen, contactSearch])

  const handleAddSubscribers = async () => {
    if (selectedContacts.length === 0) return
    setAddingContacts(true)

    const inserts = selectedContacts.map(contactId => ({
      list_id: listId,
      contact_id: contactId
    }))

    const { error } = await supabase
      .from("mailing_list_contacts")
      .insert(inserts)

    if (error) {
      toast.error("שגיאה בהוספת אנשי קשר")
    } else {
      toast.success(`${selectedContacts.length} אנשי קשר נוספו לרשימה`)
      setIsAddContactsOpen(false)
      setSelectedContacts([])
      setContactSearch("")
      loadSubscribers()
    }
    setAddingContacts(false)
  }

  const handleRemoveSubscriber = async (subscriberId: string) => {
    if (!confirm("האם אתה בטוח שברצונך להסיר איש קשר זה מהרשימה?")) return

    const { error } = await supabase
      .from("mailing_list_contacts")
      .delete()
      .eq("id", subscriberId)

    if (error) {
      toast.error("שגיאה בהסרת איש קשר")
    } else {
      toast.success("איש קשר הוסר מהרשימה")
      loadSubscribers()
    }
  }

  const filteredSubscribers = subscribers.filter(s => 
    s.contacts?.full_name?.toLowerCase().includes(search.toLowerCase()) || 
    s.contacts?.email?.toLowerCase().includes(search.toLowerCase())
  )

  if (loading || !list) {
    return (
      <div className="flex h-[400px] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          {!hideBack && (
            <Button variant="ghost" size="icon" onClick={onBack}>
              <ArrowRight className="h-5 w-5" />
            </Button>
          )}
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">{list.name}</h1>
            <p className="text-muted-foreground text-sm mt-1 flex items-center gap-2">
              {list.description && <span>{list.description} • </span>}
              <span className="bg-primary/10 text-primary px-2 py-0.5 rounded-full text-xs font-bold">
                {subscribers.length} נרשמים
              </span>
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute right-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              className="pr-10 w-48 sm:w-64"
              placeholder="חיפוש..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Button onClick={() => setIsAddContactsOpen(true)} className="gap-2 shadow-sm shadow-primary/20">
            <UserPlus className="h-4 w-4" />
            <span className="hidden sm:inline">הוסף אנשי קשר</span>
          </Button>
        </div>
      </div>

      <div className="rounded-xl border border-border overflow-hidden bg-card shadow-sm">
        <Table dir="rtl">
          <TableHeader>
            <TableRow>
              <TableHead className="text-right">שם</TableHead>
              <TableHead className="text-right">פרטי התקשרות</TableHead>
              <TableHead className="text-right">מקור</TableHead>
              <TableHead className="w-[100px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredSubscribers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="h-32 text-center text-muted-foreground">
                  {search ? "לא נמצאו אנשי קשר התואמים לחיפוש" : "אין אנשי קשר ברשימה זו עדיין"}
                </TableCell>
              </TableRow>
            ) : (
              filteredSubscribers.map((subscriber) => (
                <TableRow key={subscriber.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs">
                        {subscriber.contacts.full_name[0]}
                      </div>
                      <span className="font-medium">{subscriber.contacts.full_name}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col gap-1">
                      {subscriber.contacts.email && (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Mail className="h-3 w-3" />
                          {subscriber.contacts.email}
                        </div>
                      )}
                      {subscriber.contacts.phone && (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Phone className="h-3 w-3" />
                          {subscriber.contacts.phone}
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {subscriber.contacts.source || "—"}
                  </TableCell>
                  <TableCell>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      onClick={() => handleRemoveSubscriber(subscriber.id)}
                      className="text-muted-foreground hover:text-rose-500"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Add Contacts Dialog */}
      <Dialog open={isAddContactsOpen} onOpenChange={setIsAddContactsOpen}>
        <DialogContent className="sm:max-w-[500px]" dir="rtl">
          <DialogHeader>
            <DialogTitle>הוספת אנשי קשר לרשימה</DialogTitle>
            <DialogDescription>
              בחר אנשי קשר מה-CRM כדי להוסיף אותם לרשימת "{list.name}".
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="relative">
              <Search className="absolute right-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                className="pr-10"
                placeholder="חפש איש קשר להוספה..."
                value={contactSearch}
                onChange={(e) => setContactSearch(e.target.value)}
              />
            </div>

            <div className="max-h-[300px] overflow-y-auto border rounded-lg border-border/50">
              {availableContacts.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground text-sm">
                  {contactSearch ? "לא נמצאו אנשי קשר חדשים לחיפוש זה" : "טוען אנשי קשר..."}
                </div>
              ) : (
                <div className="divide-y divide-border/50">
                  {availableContacts.map(contact => (
                    <div 
                      key={contact.id} 
                      className="flex items-center p-3 hover:bg-muted/30 transition-colors cursor-pointer"
                      onClick={() => {
                        setSelectedContacts(prev => 
                          prev.includes(contact.id) 
                            ? prev.filter(id => id !== contact.id)
                            : [...prev, contact.id]
                        )
                      }}
                    >
                      <Checkbox
                        checked={selectedContacts.includes(contact.id)}
                        className="ml-3"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{contact.full_name}</p>
                        <p className="text-xs text-muted-foreground truncate">{contact.email || contact.phone || "אין פרטי התקשרות"}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setIsAddContactsOpen(false)}>ביטול</Button>
            <Button 
              onClick={handleAddSubscribers} 
              disabled={selectedContacts.length === 0 || addingContacts}
              className="gap-2"
            >
              {addingContacts && <Loader2 className="h-4 w-4 animate-spin" />}
              הוסף {selectedContacts.length > 0 ? `(${selectedContacts.length})` : ""} אנשי קשר
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
