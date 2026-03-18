"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { useBusiness } from "@/lib/hooks/useBusiness"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Search, Plus, List, Users, Trash2, Edit } from "lucide-react"
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
  DialogTrigger,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { toast } from "sonner"

import { useRouter } from "next/navigation"

interface MailingListManagerProps {
  selectedId?: string | null
  onSelect?: (id: string) => void
  variant?: "table" | "sidebar"
}

export function MailingListManager({ selectedId, onSelect, variant = "table" }: MailingListManagerProps) {
  const { businessId } = useBusiness()
  const router = useRouter()
  const [lists, setLists] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [newListName, setNewListName] = useState("")
  const [newListDescription, setNewListDescription] = useState("")
  const supabase = createClient()

  const loadLists = async () => {
    if (!businessId) return
    setLoading(true)
    const { data, error } = await supabase
      .from("mailing_lists")
      .select(`
        *,
        contact_count:mailing_list_contacts(count)
      `)
      .eq("business_id", businessId)
      .order("created_at", { ascending: false })

    if (error) {
      toast.error("שגיאה בטעינת רשימות תפוצה")
    } else {
      setLists(data ?? [])
    }
    setLoading(false)
  }

  useEffect(() => {
    loadLists()
  }, [businessId, supabase])

  const handleCreateList = async () => {
    if (!newListName.trim() || !businessId) return

    const { error } = await supabase
      .from("mailing_lists")
      .insert({
        business_id: businessId,
        name: newListName,
        description: newListDescription,
      })

    if (error) {
      toast.error("שגיאה ביצירת רשימה")
    } else {
      toast.success("רשימה נוצרה בהצלחה")
      setIsCreateOpen(false)
      setNewListName("")
      setNewListDescription("")
      loadLists()
    }
  }

  const handleDeleteList = async (id: string) => {
    if (!confirm("האם אתה בטוח שברצונך למחוק רשימה זו?")) return

    const { error } = await supabase
      .from("mailing_lists")
      .delete()
      .eq("id", id)

    if (error) {
      toast.error("שגיאה במחיקת רשימה")
    } else {
      toast.success("רשימה נמחקה")
      loadLists()
    }
  }

  if (!businessId) return null

  const filteredLists = lists.filter(l => 
    l.name.toLowerCase().includes(search.toLowerCase()) || 
    (l.description && l.description.toLowerCase().includes(search.toLowerCase()))
  )

  if (variant === "sidebar") {
    return (
      <div className="flex flex-col h-full bg-card rounded-2xl border border-border/50 overflow-hidden">
        <div className="p-4 border-b border-border/50 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-bold text-lg">רשימות תפוצה</h2>
            <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
              <DialogTrigger asChild>
                <Button size="icon" variant="ghost" className="h-8 w-8 rounded-lg bg-primary/5 text-primary hover:bg-primary/10">
                  <Plus className="h-4 w-4" />
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[425px]" dir="rtl">
                <DialogHeader>
                  <DialogTitle>יצירת רשימת תפוצה חדשה</DialogTitle>
                  <DialogDescription>
                    הזן שם ותיאור לרשימת התפוצה שלך.
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid gap-2">
                    <Label htmlFor="name">שם הרשימה</Label>
                    <Input
                      id="name"
                      value={newListName}
                      onChange={(e) => setNewListName(e.target.value)}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="description">תיאור</Label>
                    <Input
                      id="description"
                      value={newListDescription}
                      onChange={(e) => setNewListDescription(e.target.value)}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button type="submit" onClick={handleCreateList}>צור רשימה</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
          <div className="relative">
            <Search className="absolute right-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              className="pr-9 h-9 bg-muted/30 border-none focus-visible:ring-1 focus-visible:ring-primary/20"
              placeholder="חיפוש רשימה..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-2 space-y-1 custom-scrollbar">
          {loading ? (
            <div className="p-4 text-center text-sm text-muted-foreground">טוען...</div>
          ) : filteredLists.length === 0 ? (
            <div className="p-4 text-center text-sm text-muted-foreground">אין רשימות</div>
          ) : (
            filteredLists.map((list) => (
              <button
                key={list.id}
                onClick={() => onSelect?.(list.id)}
                className={`w-full flex items-center justify-between p-3 rounded-xl transition-all duration-200 group ${
                  selectedId === list.id 
                    ? "bg-primary text-primary-foreground shadow-md shadow-primary/20" 
                    : "hover:bg-muted text-muted-foreground hover:text-foreground"
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className={`h-8 w-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                    selectedId === list.id ? "bg-white/20" : "bg-primary/10 text-primary"
                  }`}>
                    <List className="h-4 w-4" />
                  </div>
                  <div className="text-right min-w-0">
                    <p className="font-bold text-sm truncate">{list.name}</p>
                    <p className={`text-xs truncate ${selectedId === list.id ? "text-white/70" : "text-muted-foreground"}`}>
                      {list.contact_count[0]?.count || 0} מנויים
                    </p>
                  </div>
                </div>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className={`h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity ${
                    selectedId === list.id ? "text-white hover:bg-white/20" : "text-muted-foreground hover:text-rose-500 hover:bg-rose-50"
                  }`}
                  onClick={(e) => {
                    e.stopPropagation()
                    handleDeleteList(list.id)
                  }}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </button>
            ))
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="relative w-64">
          <Search className="absolute right-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            className="pr-10"
            placeholder="חיפוש רשימה..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              רשימה חדשה
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]" dir="rtl">
            <DialogHeader>
              <DialogTitle>יצירת רשימת תפוצה חדשה</DialogTitle>
              <DialogDescription>
                הזן שם ותיאור לרשימת התפוצה שלך.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="name">שם הרשימה</Label>
                <Input
                  id="name"
                  value={newListName}
                  onChange={(e) => setNewListName(e.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="description">תיאור</Label>
                <Input
                  id="description"
                  value={newListDescription}
                  onChange={(e) => setNewListDescription(e.target.value)}
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="submit" onClick={handleCreateList}>צור רשימה</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="rounded-xl border border-border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-right">שם הרשימה</TableHead>
              <TableHead className="text-right">תיאור</TableHead>
              <TableHead className="text-center">נרשמים</TableHead>
              <TableHead className="text-right">תאריך יצירה</TableHead>
              <TableHead className="w-[100px]"></TableHead>
            </TableRow>
          </TableHeader>
                  <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={5} className="h-24 text-center">טוען...</TableCell>
              </TableRow>
            ) : filteredLists.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="h-24 text-center">אין רשימות תפוצה</TableCell>
              </TableRow>
            ) : (
              filteredLists.map((list) => (
                <TableRow 
                  key={list.id}
                  className="cursor-pointer hover:bg-muted/50 transition-colors"
                  onClick={() => router.push(`/mailing?listId=${list.id}`)}
                >
                  <TableCell className="font-medium">{list.name}</TableCell>
                  <TableCell className="text-muted-foreground">{list.description || "—"}</TableCell>
                  <TableCell className="text-center">
                    <div className="flex items-center justify-center gap-2">
                      <Users className="h-4 w-4 text-muted-foreground" />
                      {list.contact_count[0]?.count || 0}
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {new Date(list.created_at).toLocaleDateString('he-IL')}
                  </TableCell>
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center gap-2">
                      <Button variant="ghost" size="icon" onClick={() => router.push(`/mailing?listId=${list.id}`)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDeleteList(list.id)}>
                        <Trash2 className="h-4 w-4 text-rose-500" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
