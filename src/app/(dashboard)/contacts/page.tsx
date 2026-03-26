"use client"

import { useEffect, useState, useCallback, lazy, Suspense } from "react"
import { createClient } from "@/lib/supabase/client"
import { useBusiness } from "@/lib/hooks/useBusiness"
import { usePermissions } from "@/lib/hooks/usePermissions"
import { useTierFeatures } from "@/lib/hooks/useTierFeatures"
import { useContactsQuery } from "@/lib/hooks/queries"
import { useQueryClient } from "@tanstack/react-query"
import { queryKeys } from "@/lib/hooks/queries"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Search, User, MoreHorizontal, ArrowUpRight, ChevronLeft, ChevronRight } from "lucide-react"
import { TableSkeleton } from "@/components/ui/skeletons"
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

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

const ContactDetailsSlider = lazy(() =>
  import("@/components/contacts/ContactDetailsSlider").then((m) => ({ default: m.ContactDetailsSlider }))
)

const PAGE_SIZE = 25

export default function ContactsPage() {
  const { businessId } = useBusiness()
  const { can } = usePermissions()
  const { features } = useTierFeatures()
  const queryClient = useQueryClient()
  const supabase = createClient()

  const [search, setSearch] = useState("")
  const [debouncedSearch, setDebouncedSearch] = useState("")
  const [ownerFilter, setOwnerFilter] = useState<"all" | "mine">("all")
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [currentPage, setCurrentPage] = useState(1)

  const [selectedContactId, setSelectedContactId] = useState<string | null>(null)
  const [sliderOpen, setSliderOpen] = useState(false)

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => setCurrentUser(user))
  }, [supabase])

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedSearch(search)
      setCurrentPage(1)
    }, 400)
    return () => clearTimeout(t)
  }, [search])

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1)
  }, [ownerFilter])

  const { data, isPending: loading } = useContactsQuery({
    businessId,
    search: debouncedSearch,
    ownerFilter,
    currentUserId: currentUser?.id ?? null,
    page: currentPage,
    pageSize: PAGE_SIZE,
  })

  const contacts = data?.contacts ?? []
  const total = data?.total ?? 0
  const totalPages = Math.ceil(total / PAGE_SIZE)

  const handleContactClick = (id: string) => {
    setSelectedContactId(id)
    setSliderOpen(true)
  }

  const invalidateContacts = useCallback(() => {
    if (businessId) {
      queryClient.invalidateQueries({ queryKey: queryKeys.contacts.all(businessId) })
    }
  }, [businessId, queryClient])

  if (!businessId) return null

  return (
    <div className="space-y-6 pb-10">
      <Suspense fallback={null}>
        <ContactDetailsSlider
          contactId={selectedContactId}
          open={sliderOpen}
          onOpenChange={setSliderOpen}
          onActivityAdded={invalidateContacts}
          canViewPhone={can("contacts", "view_phone")}
          canViewEmail={can("contacts", "view_email")}
          canViewSource={can("contacts", "view_source")}
          canViewDealValue={can("deals", "view_value")}
        />
      </Suspense>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">אנשי קשר</h1>
          <p className="text-muted-foreground text-sm mt-1">
            {total}{features.max_contacts !== null ? ` / ${features.max_contacts}` : ""} אנשי קשר
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
          <CreateContactDialog
            onSuccess={invalidateContacts}
            currentCount={total}
            maxCount={features.max_contacts}
          />
        </div>
      </div>

      {loading ? (
        <TableSkeleton rows={8} cols={5} />
      ) : (
        <>
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
                    <TableCell className="text-muted-foreground">
                      {can("contacts", "view_email") ? (c.email ?? "—") : "•••••••"}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {can("contacts", "view_phone") ? (c.phone ?? "—") : "•••••••"}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {can("contacts", "view_source") ? ((c as any).source ?? "—") : "•••"}
                    </TableCell>
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

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-2">
              <p className="text-sm text-muted-foreground">
                מציג {(currentPage - 1) * PAGE_SIZE + 1}–{Math.min(currentPage * PAGE_SIZE, total)} מתוך {total}
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
                <span className="text-sm font-medium px-2">
                  {currentPage} / {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
