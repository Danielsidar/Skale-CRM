"use client"

import { useEffect, useState, Suspense, lazy } from "react"
import { useSearchParams, useRouter, usePathname } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { useBusiness } from "@/lib/hooks/useBusiness"
import { usePermissions } from "@/lib/hooks/usePermissions"
import { useTierFeatures } from "@/lib/hooks/useTierFeatures"
import { usePipelinesQuery } from "@/lib/hooks/queries"
import { moveDealStage } from "@/lib/services/crm"
import { LeadsTable, LeadWithDetails } from "@/components/leads/LeadsTable"
import { Button } from "@/components/ui/button"

// Lazy-load heavy components to reduce initial bundle
const ContactDetailsSlider = lazy(() =>
  import("@/components/contacts/ContactDetailsSlider").then((m) => ({ default: m.ContactDetailsSlider }))
)
const LeadCsvImportDialog = lazy(() =>
  import("@/components/leads/LeadCsvImportDialog").then((m) => ({ default: m.LeadCsvImportDialog }))
)
const KanbanBoard = lazy(() =>
  import("@/components/kanban/KanbanBoard").then((m) => ({ default: m.KanbanBoard }))
)
import { 
  Plus, 
  Search, 
  Trash2, 
  MoveRight, 
  X, 
  Target,
  Download,
  LayoutGrid,
  ListFilter,
  Table as TableIcon,
  LayoutDashboard,
  ChevronDown,
  Check,
  ChevronLeft,
  ChevronRight,
  MoreHorizontal,
  User,
  Tag as TagIcon,
  Settings2,
  Eye,
  EyeOff,
  GripVertical,
  Lock,
  Upload
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import type { Database } from "@/types/database.types"
import { Input } from "@/components/ui/input"
import { toast } from "sonner"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"
import { QuickAddDealDialog } from "@/components/kanban/QuickAddDealDialog"
import {
  DragDropContext,
  Droppable,
  Draggable,
  DropResult
} from "@hello-pangea/dnd"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
  SheetDescription,
} from "@/components/ui/sheet"
import { Label } from "@/components/ui/label"
import { Calendar as CalendarIcon, FilterX } from "lucide-react"

type Pipeline = Database["public"]["Tables"]["pipelines"]["Row"]
type Stage = Database["public"]["Tables"]["stages"]["Row"]

export default function LeadsPage() {
  return (
    <Suspense fallback={<LeadsPageSkeleton />}>
      <LeadsPageContent />
    </Suspense>
  )
}

function LeadsPageSkeleton() {
  return (
    <div className="flex flex-col h-full gap-6 pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="bg-muted h-10 w-10 rounded-xl animate-pulse" />
          <div className="space-y-1.5">
            <div className="h-6 w-32 bg-muted rounded animate-pulse" />
            <div className="h-4 w-56 bg-muted rounded animate-pulse" />
          </div>
        </div>
        <div className="h-10 w-28 bg-muted rounded-lg animate-pulse" />
      </div>
      <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm h-16 animate-pulse" />
      <div className="rounded-xl border border-border overflow-hidden">
        <div className="bg-muted/30 px-4 py-3 border-b border-border">
          <div className="flex gap-4">
            {Array.from({ length: 7 }).map((_, i) => (
              <div key={i} className="h-4 flex-1 bg-muted rounded animate-pulse" />
            ))}
          </div>
        </div>
        <div className="divide-y divide-border">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="px-4 py-3 flex gap-4 items-center">
              {Array.from({ length: 7 }).map((_, j) => (
                <div key={j} className={`h-4 flex-1 bg-muted rounded animate-pulse ${j === 0 ? "max-w-[180px]" : ""}`} />
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function LeadsPageContent() {
  const { businessId, businesses } = useBusiness()
  const userRole = businesses.find(b => b.id === businessId)?.role || 'agent'
  const { can } = usePermissions()
  const { features } = useTierFeatures()
  const searchParams = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()
  
  const [viewMode, setViewMode] = useState<"table" | "pipeline">(
    searchParams.get("view") === "pipeline" ? "pipeline" : "table"
  )
  const [selectedPipelineIds, setSelectedPipelineIds] = useState<string[]>(() => {
    const ids = searchParams.get("pipelineIds")?.split(",") || []
    return ids.length > 0 ? ids : ["all"]
  })
  const [isSettingsLoaded, setIsSettingsLoaded] = useState(false)
  const [pipelineSearchTerm, setPipelineSearchTerm] = useState("")
  const [leads, setLeads] = useState<LeadWithDetails[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [totalLeads, setTotalLeads] = useState(0)
  const [selectedLeadIds, setSelectedLeadIds] = useState<string[]>([])
  const [isBulkDeleting, setIsBulkDeleting] = useState(false)
  const [isBulkStatusDialogOpen, setIsBulkStatusDialogOpen] = useState(false)
  const [bulkNewStageId, setBulkNewStageId] = useState<string>("")
  const [bulkNewTag, setBulkNewTag] = useState<string>("")
  const [isBulkTagDialogOpen, setIsBulkTagDialogOpen] = useState(false)
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [isCsvImportOpen, setIsCsvImportOpen] = useState(false)
  const [pipelines, setPipelines] = useState<Pipeline[]>([])
  const [allStages, setAllStages] = useState<Stage[]>([])
  const [businessUsers, setBusinessUsers] = useState<any[]>([])
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const [isColumnSettingsOpen, setIsColumnSettingsOpen] = useState(false)
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [ownerFilter, setOwnerFilter] = useState<string>("all")
  const [statusFilter, setStatusFilter] = useState<"active" | "won" | "lost" | "all">("all")
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [allTagsInBusiness, setAllTagsInBusiness] = useState<string[]>([])
  const [dateFrom, setDateFrom] = useState<string>("")
  const [dateTo, setDateTo] = useState<string>("")
  const [isFilterSheetOpen, setIsFilterSheetOpen] = useState(false)
  const [isUsersLoading, setIsUsersLoading] = useState(false)
  const [selectedContactId, setSelectedContactId] = useState<string | null>(null)
  const [sliderOpen, setSliderOpen] = useState(false)
  const [hasLoadedInitially, setHasLoadedInitially] = useState(false)
  
  const [allColumns, setAllColumns] = useState([
    { id: 'title', label: 'שם הליד' },
    { id: 'contact', label: 'איש קשר' },
    { id: 'pipeline', label: 'פייפליין' },
    { id: 'owner', label: 'נציג' },
    { id: 'tags', label: 'תגיות' },
    { id: 'stage', label: 'סטטוס' },
    { id: 'value', label: 'ערך' },
    { id: 'created_at', label: 'תאריך יצירה' },
    { id: 'actions', label: 'פעולות' }
  ])
  
  const [visibleColumns, setVisibleColumns] = useState<string[]>([
    'title', 'contact', 'pipeline', 'owner', 'tags', 'stage', 'value', 'created_at', 'actions'
  ])
  const [sortConfig, setSortConfig] = useState<{ column: string, order: 'asc' | 'desc' }>({
    column: 'created_at',
    order: 'desc'
  })
  
  const supabase = createClient()

  // Use cached pipelines query instead of fetching in loadLeads
  const { data: pipelinesWithStages } = usePipelinesQuery(businessId)

  // Sync pipelines/stages state from cached query
  useEffect(() => {
    if (!pipelinesWithStages) return
    const flatStages = pipelinesWithStages.flatMap((p) => p.stages ?? [])
    setPipelines(pipelinesWithStages as any)
    setAllStages(flatStages as any)
  }, [pipelinesWithStages])

  const updateViewMode = (mode: "table" | "pipeline") => {
    setViewMode(mode)
    const params = new URLSearchParams(searchParams.toString())
    params.set("view", mode)
    router.replace(`${pathname}?${params.toString()}`)
  }

  const handleColumnReorder = (result: DropResult) => {
    if (!result.destination) return

    const items = Array.from(allColumns)
    const [reorderedItem] = items.splice(result.source.index, 1)
    items.splice(result.destination.index, 0, reorderedItem)

    setAllColumns(items)
    
    // Also update visibleColumns to maintain the same order
    const newVisibleOrder = items
      .filter(col => visibleColumns.includes(col.id))
      .map(col => col.id)
    setVisibleColumns(newVisibleOrder)
  }

  const togglePipeline = (id: string) => {
    let newIds: string[] = []
    
    if (id === "all") {
      newIds = ["all"]
    } else {
      // Remove "all" if it exists when adding a specific pipeline
      const currentIds = selectedPipelineIds.filter(pid => pid !== "all")
      
      if (currentIds.includes(id)) {
        newIds = currentIds.filter(pid => pid !== id)
        if (newIds.length === 0) newIds = ["all"]
      } else {
        newIds = [...currentIds, id]
      }
    }

    setSelectedPipelineIds(newIds)
    const params = new URLSearchParams(searchParams.toString())
    if (newIds.includes("all")) {
      params.delete("pipelineIds")
    } else {
      params.set("pipelineIds", newIds.join(","))
    }
    router.replace(`${pathname}?${params.toString()}`)
  }

  // Sync state with URL params
  useEffect(() => {
    if (!isSettingsLoaded) return

    const view = searchParams.get("view")
    const pipelineIdsParam = searchParams.get("pipelineIds")
    
    if (view === "pipeline" || view === "table") {
      setViewMode(view as "table" | "pipeline")
    }
    if (pipelineIdsParam) {
      setSelectedPipelineIds(pipelineIdsParam.split(","))
    } else if (!searchParams.has("pipelineIds") && !selectedPipelineIds.includes("all")) {
      // Only reset to "all" if there's no param AND we aren't already loading/loaded from settings
    }
  }, [searchParams, isSettingsLoaded])

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setCurrentUser(user)
    })

    if (businessId) {
      const fetchBusinessUsers = async () => {
        setIsUsersLoading(true)
        try {
          // Fetch users with their profiles in one join query
          const { data, error } = await supabase
            .from("business_users")
            .select(`
              user_id,
              profiles:user_id (
                id,
                full_name,
                email
              )
            `)
            .eq("business_id", businessId)

          if (error) {
            console.error("Error fetching business users:", error)
            // Fallback: try to get just the user IDs if join fails
            const { data: simpleData } = await supabase
              .from("business_users")
              .select("user_id")
              .eq("business_id", businessId)
            
            if (simpleData) {
              setBusinessUsers(simpleData.map(u => ({ id: u.user_id, name: "נציג ללא שם" })))
            }
            return
          }

          if (data) {
            const users = data.map((bu: any) => {
              const profile = Array.isArray(bu.profiles) ? bu.profiles[0] : bu.profiles
              return {
                id: bu.user_id,
                name: profile?.full_name || profile?.email || "נציג ללא שם"
              }
            })
            setBusinessUsers(users)
          }
        } catch (err) {
          console.error("Failed to fetch business users:", err)
        } finally {
          setIsUsersLoading(false)
        }
      }
      
      fetchBusinessUsers()
    }
  }, [supabase, businessId])

  // Load saved UI settings
  useEffect(() => {
    const loadSavedSettings = async () => {
      if (!businessId || !currentUser) return
      
      try {
        const { data, error } = await supabase
          .from('user_ui_settings')
          .select('settings')
          .eq('user_id', currentUser.id)
          .eq('business_id', businessId)
          .eq('page_key', 'leads')
          .maybeSingle()

        if (data?.settings) {
          const s = data.settings as any
          if (s.viewMode && !searchParams.get("view")) setViewMode(s.viewMode)
          if (s.selectedPipelineIds && !searchParams.get("pipelineIds")) setSelectedPipelineIds(s.selectedPipelineIds)
          if (s.ownerFilter) setOwnerFilter(s.ownerFilter)
          if (s.statusFilter) setStatusFilter(s.statusFilter)
          if (s.selectedTags) setSelectedTags(s.selectedTags)
          if (s.pageSize) setPageSize(s.pageSize)
          if (s.allColumns) setAllColumns(s.allColumns)
          if (s.visibleColumns) setVisibleColumns(s.visibleColumns)
          if (s.sortConfig) setSortConfig(s.sortConfig)
          if (s.dateFrom) setDateFrom(s.dateFrom)
          if (s.dateTo) setDateTo(s.dateTo)
        }
      } catch (err) {
        console.error("Error loading UI settings:", err)
      } finally {
        setIsSettingsLoaded(true)
      }
    }
    
    if (currentUser && businessId) {
      loadSavedSettings()
    }
  }, [businessId, currentUser, supabase])

  // Save UI settings when they change
  useEffect(() => {
    if (!isSettingsLoaded || !businessId || !currentUser) return

    const timer = setTimeout(async () => {
      try {
        await supabase
          .from('user_ui_settings')
          .upsert({
            user_id: currentUser.id,
            business_id: businessId,
            page_key: 'leads',
            settings: {
              viewMode,
              selectedPipelineIds,
              ownerFilter,
              statusFilter,
              selectedTags,
              pageSize,
              allColumns,
              visibleColumns,
              sortConfig,
              dateFrom,
              dateTo
            },
            updated_at: new Date().toISOString()
          }, { onConflict: 'user_id,business_id,page_key' })
      } catch (err) {
        console.error("Error saving UI settings:", err)
      }
    }, 1000) // Debounce saves

    return () => clearTimeout(timer)
  }, [
    businessId, 
    currentUser, 
    viewMode, 
    selectedPipelineIds, 
    ownerFilter, 
    statusFilter, 
    selectedTags, 
    pageSize, 
    allColumns,
    visibleColumns, 
    sortConfig,
    dateFrom,
    dateTo,
    isSettingsLoaded,
    supabase
  ])

  useEffect(() => {
    const fetchTags = async () => {
      if (!businessId) return
      // Only fetch the tags column (not all deal data) to get unique tags
      const { data } = await supabase
        .from("deals")
        .select("tags")
        .eq("business_id", businessId)
        .not("tags", "is", null)
      
      if (data) {
        const uniqueTags = Array.from(new Set(data.flatMap(d => d.tags || [])))
        setAllTagsInBusiness(uniqueTags)
      }
    }
    fetchTags()
  }, [businessId, supabase])

  const loadLeads = async () => {
    if (!businessId) return
    setLoading(true)
    try {
      // Use stages already loaded from usePipelinesQuery (no extra queries needed)
      const currentStages = allStages
      const wonStageIds = currentStages.filter(s => s.is_won).map(s => s.id)
      const lostStageIds = currentStages.filter(s => s.is_lost).map(s => s.id)
      const activeStageIds = currentStages.filter(s => !s.is_won && !s.is_lost).map(s => s.id)

      // Calculate range for pagination
      const from = (currentPage - 1) * pageSize
      const to = from + pageSize - 1

      // Build query with pagination + count in a single request
      let q = supabase
        .from("deals")
        .select(`
          *,
          pipeline:pipelines(id, name),
          stage:stages(id, name, color, is_won, is_lost, position),
          contact:contacts(id, full_name, email, phone)
        `, { count: 'exact' })
        .eq("business_id", businessId)

      // Status Filter
      if (statusFilter === "active") {
        if (activeStageIds.length > 0) q = q.in("stage_id", activeStageIds)
      } else if (statusFilter === "won") {
        if (wonStageIds.length > 0) q = q.in("stage_id", wonStageIds)
        else q = q.eq("id", "00000000-0000-0000-0000-000000000000")
      } else if (statusFilter === "lost") {
        if (lostStageIds.length > 0) q = q.in("stage_id", lostStageIds)
        else q = q.eq("id", "00000000-0000-0000-0000-000000000000")
      }

      // Pipeline Filter
      if (selectedPipelineIds.length > 0 && !selectedPipelineIds.includes("all")) {
        q = q.in("pipeline_id", selectedPipelineIds)
      }

      // Search Filter
      if (searchTerm) {
        q = q.ilike('title', `%${searchTerm}%`)
      }

      // Tags Filter
      if (selectedTags.length > 0) {
        q = q.contains('tags', selectedTags)
      }

      // Owner Filter
      if (ownerFilter === "mine" && currentUser) {
        q = q.eq("owner_user_id", currentUser.id)
      } else if (ownerFilter === "unassigned") {
        q = q.is("owner_user_id", null)
      } else if (ownerFilter !== "all") {
        q = q.eq("owner_user_id", ownerFilter)
      }

      // Date Filters
      if (dateFrom) {
        q = q.gte('created_at', new Date(dateFrom).toISOString())
      }
      if (dateTo) {
        const toDate = new Date(dateTo)
        toDate.setHours(23, 59, 59, 999)
        q = q.lte('created_at', toDate.toISOString())
      }

      // Single paginated query with count (eliminates the duplicate full-data fetch)
      const { data: dealsData, count, error: dealsError } = await q
        .order(sortConfig.column, { ascending: sortConfig.order === 'asc' })
        .range(from, to)

      if (dealsError) throw dealsError

      setLeads((dealsData as unknown as LeadWithDetails[]) || [])
      setTotalLeads(count || 0)
    } catch (err) {
      toast.error("שגיאה בטעינת הלידים")
      console.error(err)
    } finally {
      setLoading(false)
      setHasLoadedInitially(true)
    }
  }

  useEffect(() => {
    setCurrentPage(1)
  }, [statusFilter, ownerFilter, selectedPipelineIds])

  useEffect(() => {
    // Wait for pipelines/stages to be available before loading deals
    if (businessId && (pipelinesWithStages || allStages.length > 0 || !businessId)) {
      loadLeads()
    }
  }, [businessId, currentPage, pageSize, ownerFilter, selectedPipelineIds, statusFilter, dateFrom, dateTo, sortConfig, selectedTags, pipelinesWithStages])

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (currentPage !== 1) {
        setCurrentPage(1) // Reset to first page on search
      } else {
        loadLeads()
      }
    }, 500)
    return () => clearTimeout(timer)
  }, [searchTerm])

  const selectedPipelineId = selectedPipelineIds.length === 1 ? selectedPipelineIds[0] : null
  const selectedPipeline = pipelines.find(p => p.id === selectedPipelineId) || null
  const selectedPipelineStages = selectedPipeline 
    ? allStages.filter(s => s.pipeline_id === selectedPipeline.id)
    : []
  
  const defaultPipelineId = selectedPipeline?.id || pipelines[0]?.id || ""
  const defaultStageId = selectedPipeline 
    ? (selectedPipelineStages.find(s => !s.is_won && !s.is_lost)?.id || selectedPipelineStages[0]?.id || "")
    : (allStages.find(s => !s.is_won && !s.is_lost)?.id || allStages[0]?.id || "")

  const filteredPipelinesForSelector = pipelines.filter(p => 
    p.name.toLowerCase().includes(pipelineSearchTerm.toLowerCase())
  )

  const handleDeleteLead = async (id: string) => {
    if (!confirm("האם אתה בטוח שברצונך למחוק ליד זה?")) return
    try {
      const { error } = await supabase.from("deals").delete().eq("id", id)
      if (error) throw error
      toast.success("הליד נמחק בהצלחה")
      setLeads(leads.filter((l) => l.id !== id))
      setSelectedLeadIds(prev => prev.filter(selectedId => selectedId !== id))
    } catch (err) {
      toast.error("שגיאה במחיקת הליד")
      console.error(err)
    }
  }

  const handleBulkStatusChange = async (newStageId: string) => {
    if (selectedLeadIds.length === 0) return
    
    setLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error("Unauthorized")

      // Process each deal sequentially to ensure activities are logged correctly
      for (const id of selectedLeadIds) {
        const lead = leads.find(l => l.id === id)
        if (!lead) continue

        // Check if stage belongs to the pipeline
        const stage = allStages.find(s => s.id === newStageId)
        if (stage && stage.pipeline_id !== lead.pipeline_id) continue

        await moveDealStage(supabase, {
          dealId: id,
          newStageId,
          changedByUserId: user.id,
          businessId: businessId!
        })
      }

      toast.success(`${selectedLeadIds.length} לידים עודכנו בהצלחה`)
      loadLeads()
      setSelectedLeadIds([])
      setIsBulkStatusDialogOpen(false)
    } catch (err) {
      toast.error("שגיאה בעדכון הלידים")
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleBulkAddTag = async (tag: string) => {
    if (selectedLeadIds.length === 0 || !tag.trim()) return
    
    setLoading(true)
    try {
      for (const id of selectedLeadIds) {
        const lead = leads.find(l => l.id === id)
        if (!lead) continue

        const existingTags = (lead as any).tags || []
        if (existingTags.includes(tag.trim())) continue

        const newTags = [...existingTags, tag.trim()]
        const { error } = await supabase
          .from("deals")
          .update({ tags: newTags })
          .eq("id", id)
        
        if (error) throw error
      }

      toast.success(`${selectedLeadIds.length} לידים עודכנו בהצלחה`)
      loadLeads()
      setSelectedLeadIds([])
      setIsBulkTagDialogOpen(false)
      setBulkNewTag("")
    } catch (err) {
      toast.error("שגיאה בעדכון הלידים")
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleBulkOwnerChange = async (newOwnerId: string | null) => {
    if (selectedLeadIds.length === 0) return
    
    setLoading(true)
    try {
      const { error } = await supabase
        .from("deals")
        .update({ owner_user_id: newOwnerId })
        .in("id", selectedLeadIds)
      
      if (error) throw error

      toast.success(`${selectedLeadIds.length} לידים שויכו בהצלחה`)
      loadLeads()
      setSelectedLeadIds([])
    } catch (err) {
      toast.error("שגיאה בשיוך הלידים")
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleBulkDelete = async () => {
    if (selectedLeadIds.length === 0) return
    if (!confirm(`האם אתה בטוח שברצונך למחוק ${selectedLeadIds.length} לידים?`)) return

    setIsBulkDeleting(true)
    try {
      const { error } = await supabase
        .from("deals")
        .delete()
        .in("id", selectedLeadIds)

      if (error) throw error

      toast.success(`${selectedLeadIds.length} לידים נמחקו בהצלחה`)
      setLeads(leads.filter(l => !selectedLeadIds.includes(l.id)))
      setSelectedLeadIds([])
    } catch (err) {
      toast.error("שגיאה במחיקת הלידים")
      console.error(err)
    } finally {
      setIsBulkDeleting(false)
    }
  }

  const handleSort = (column: string) => {
    setSortConfig(prev => ({
      column,
      order: prev.column === column && prev.order === 'desc' ? 'asc' : 'desc'
    }))
    setCurrentPage(1)
  }

  return (
    <div className="flex flex-col h-full gap-6 pb-20">
      <Suspense fallback={null}>
        <ContactDetailsSlider 
          contactId={selectedContactId}
          open={sliderOpen}
          onOpenChange={setSliderOpen}
          onActivityAdded={loadLeads}
          canViewPhone={can("contacts", "view_phone")}
          canViewEmail={can("contacts", "view_email")}
          canViewSource={can("contacts", "view_source")}
          canViewDealValue={can("deals", "view_value")}
        />
      </Suspense>
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="bg-primary/10 p-2.5 rounded-xl">
            <Target className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-black tracking-tight text-slate-900">מרכז הלידים</h1>
            <p className="text-slate-500 text-xs font-medium">צפה ונהל את כל הלידים מכל הפייפליינים במקום אחד</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" className="gap-2 border-slate-200 h-10 rounded-lg shadow-sm hidden sm:flex text-xs font-bold">
            <Download className="h-3.5 w-3.5" />
            ייצוא לאקסל
          </Button>
          {features.max_deals !== null && totalLeads >= features.max_deals ? (
            <Button
              disabled
              variant="outline"
              className="gap-2 h-10 px-5 rounded-lg font-black text-xs opacity-60 cursor-not-allowed"
              title={`הגעת למגבלת המסלול שלך: ${features.max_deals} לידים`}
            >
              <Lock className="h-4 w-4" />
              מגבלת לידים ({totalLeads}/{features.max_deals})
            </Button>
          ) : (
            <>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsCsvImportOpen(true)}
                className="gap-2 h-10 px-4 rounded-lg font-black text-xs border-slate-200 shadow-sm"
              >
                <Upload className="h-4 w-4" />
                ייבוא CSV
              </Button>
              <Button onClick={() => setIsAddDialogOpen(true)} className="gap-2 h-10 px-5 rounded-lg shadow-lg shadow-primary/20 font-black text-xs">
                <Plus className="h-4 w-4" />
                הוסף ליד חדש
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Filters and Search Bar */}
      <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-center gap-3">
        {/* View Toggle */}
        <div className="bg-slate-100 p-1 rounded-lg flex items-center border border-slate-200 h-10 w-full md:w-auto">
          <Button
            variant={viewMode === "table" ? "secondary" : "ghost"}
            size="sm"
            className={cn(
              "h-8 px-3 rounded-md gap-2 transition-all flex-1 md:flex-none",
              viewMode === "table" ? "bg-white shadow-sm text-primary" : "text-slate-500"
            )}
            onClick={() => updateViewMode("table")}
          >
            <TableIcon className="h-3.5 w-3.5" />
            <span className="text-xs font-bold">טבלה</span>
          </Button>
          <Button
            variant={viewMode === "pipeline" ? "secondary" : "ghost"}
            size="sm"
            className={cn(
              "h-8 px-3 rounded-md gap-2 transition-all flex-1 md:flex-none",
              viewMode === "pipeline" ? "bg-white shadow-sm text-primary" : "text-slate-500"
            )}
            onClick={() => updateViewMode("pipeline")}
          >
            <LayoutDashboard className="h-3.5 w-3.5" />
            <span className="text-xs font-bold">פייפליין</span>
          </Button>
        </div>

        {/* Pipeline Selector */}
        <div className="w-full md:w-64 relative">
          <Button
            variant="outline"
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            className="w-full justify-between h-10 border-slate-200 bg-slate-50 rounded-lg px-3 hover:bg-slate-100 transition-colors"
          >
            <div className="flex items-center gap-2">
              <LayoutGrid className="h-3.5 w-3.5 text-slate-400" />
              <span className="text-xs font-bold truncate max-w-[160px]">
                {selectedPipelineIds.includes("all") 
                  ? "כל הפייפליינים" 
                  : selectedPipelineIds.length === 1 
                    ? (pipelines.find(p => p.id === selectedPipelineIds[0])?.name || "בחר פייפליין")
                    : `${selectedPipelineIds.length} פייפליינים נבחרו`}
              </span>
            </div>
            <ChevronDown className={cn("h-3.5 w-3.5 shrink-0 opacity-50 transition-transform", isDropdownOpen && "rotate-180")} />
          </Button>

          {isDropdownOpen && (
            <>
              <div 
                className="fixed inset-0 z-[60]" 
                onClick={() => setIsDropdownOpen(false)}
              />
              <div className="absolute top-full left-0 right-0 mt-2 p-2 bg-white border border-slate-200 rounded-xl shadow-xl z-[70] animate-in fade-in zoom-in-95 duration-200">
                <div className="p-2 relative border-b border-slate-100 mb-2">
                  <Search className="absolute right-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input 
                    placeholder="חפש פייפליין..." 
                    className="h-9 pr-9 text-xs border-none bg-slate-50 focus:bg-white transition-all rounded-lg"
                    value={pipelineSearchTerm}
                    onChange={(e) => setPipelineSearchTerm(e.target.value)}
                    autoFocus
                  />
                </div>
                <div className="max-h-[300px] overflow-y-auto">
                  <div
                    onClick={() => {
                      togglePipeline("all")
                    }}
                    className={cn(
                      "flex items-center justify-between px-3 py-2.5 rounded-lg cursor-pointer transition-colors mb-0.5 group",
                      selectedPipelineIds.includes("all") ? "bg-slate-50" : "hover:bg-slate-50"
                    )}
                  >
                    <div className="flex items-center gap-2">
                      <div className={cn(
                        "h-4 w-4 rounded border flex items-center justify-center transition-all",
                        selectedPipelineIds.includes("all") ? "bg-primary border-primary text-white" : "border-slate-300 bg-white group-hover:border-primary/50"
                      )}>
                        {selectedPipelineIds.includes("all") && <Check className="h-2.5 w-2.5" />}
                      </div>
                      <span className={cn(
                        "text-sm font-medium",
                        selectedPipelineIds.includes("all") ? "text-primary font-bold" : "text-slate-700"
                      )}>
                        כל הפייפליינים
                      </span>
                    </div>
                  </div>
                  
                  {filteredPipelinesForSelector.length === 0 && pipelineSearchTerm ? (
                    <div className="py-6 text-center text-slate-400 text-xs font-medium">לא נמצאו פייפליינים</div>
                  ) : (
                    filteredPipelinesForSelector.map((p) => {
                      const isSelected = selectedPipelineIds.includes(p.id)
                      return (
                        <div
                          key={p.id}
                          onClick={(e) => {
                            e.stopPropagation()
                            togglePipeline(p.id)
                          }}
                          className={cn(
                            "flex items-center justify-between px-3 py-2.5 rounded-lg cursor-pointer transition-colors mb-0.5 group",
                            isSelected ? "bg-slate-50" : "hover:bg-slate-50"
                          )}
                        >
                          <div className="flex items-center gap-2">
                            <div className={cn(
                              "h-4 w-4 rounded border flex items-center justify-center transition-all",
                              isSelected ? "bg-primary border-primary text-white" : "border-slate-300 bg-white group-hover:border-primary/50"
                            )}>
                              {isSelected && <Check className="h-2.5 w-2.5" />}
                            </div>
                            <span className={cn(
                              "text-sm font-medium",
                              isSelected ? "text-primary font-bold" : "text-slate-700"
                            )}>
                              {p.name}
                            </span>
                          </div>
                        </div>
                      )
                    })
                  )}
                </div>
              </div>
            </>
          )}
        </div>

        <div className="relative flex-1 w-full">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input 
            className="pr-10 h-10 bg-slate-50 border-slate-100 focus:bg-white transition-all rounded-lg text-sm font-medium" 
            placeholder={viewMode === "table" ? "חיפוש לפי שם, איש קשר או פייפליין..." : "חיפוש לידים בפייפליין..."} 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        
        <div className="flex items-center gap-2 w-full md:w-auto">
          <Select value={statusFilter} onValueChange={(val: any) => setStatusFilter(val)}>
            <SelectTrigger className="h-10 border-slate-200 rounded-lg bg-white shadow-sm w-full md:w-[130px] text-xs font-bold">
              <ListFilter className="h-3.5 w-3.5 text-slate-500" />
              <SelectValue placeholder="סטטוס" />
            </SelectTrigger>
            <SelectContent align="end" position="popper" className="text-right" dir="rtl">
              <SelectItem value="active" className="text-xs font-bold py-2">לידים פעילים</SelectItem>
              <SelectItem value="won" className="text-xs font-bold py-2">עסקאות שנסגרו</SelectItem>
              <SelectItem value="lost" className="text-xs font-bold py-2">עסקאות אבודות</SelectItem>
              <SelectItem value="all" className="text-xs font-bold py-2">הכל</SelectItem>
            </SelectContent>
          </Select>
          
          <Button 
            variant="outline" 
            onClick={() => setIsFilterSheetOpen(true)}
            className={cn(
              "gap-2 border-slate-200 h-10 px-3 rounded-lg text-xs font-bold bg-white hover:bg-slate-50 shadow-sm",
              (ownerFilter !== "all" || dateFrom || dateTo || selectedTags.length > 0) && "border-primary text-primary bg-primary/5"
            )}
          >
            <ListFilter className="h-4 w-4 text-slate-500" />
            {(ownerFilter !== "all" || dateFrom || dateTo || selectedTags.length > 0) ? "סינון (פעיל)" : "סינון"}
          </Button>

          <div className="relative">
            <Button 
              variant="outline" 
              size="icon" 
              onClick={() => setIsColumnSettingsOpen(!isColumnSettingsOpen)}
              className={cn(
                "h-10 w-10 border-slate-200 rounded-lg bg-white shadow-sm hover:bg-slate-50 transition-all",
                isColumnSettingsOpen && "border-primary text-primary bg-primary/5 ring-2 ring-primary/10"
              )}
            >
              <Settings2 className="h-4 w-4" />
            </Button>

            {isColumnSettingsOpen && (
              <>
                <div 
                  className="fixed inset-0 z-[100]" 
                  onClick={() => setIsColumnSettingsOpen(false)}
                />
                <div className="absolute top-full left-0 mt-2 w-[220px] p-3 bg-white border border-slate-200 rounded-xl shadow-2xl z-[110] animate-in fade-in zoom-in-95 duration-200" dir="rtl">
                  <div className="text-[10px] font-black text-slate-400 mb-3 px-1 uppercase tracking-widest flex justify-between items-center">
                    <span>עמודות וסדר תצוגה</span>
                    <span className="text-[8px] font-medium bg-slate-100 px-1.5 py-0.5 rounded italic">גרור לשינוי סדר</span>
                  </div>
                  
                  <DragDropContext onDragEnd={handleColumnReorder}>
                    <Droppable droppableId="columns">
                      {(provided) => (
                        <div 
                          {...provided.droppableProps}
                          ref={provided.innerRef}
                          className="space-y-1"
                        >
                          {allColumns.map((col, index) => (
                            <Draggable key={col.id} draggableId={col.id} index={index}>
                              {(provided, snapshot) => (
                                <div 
                                  ref={provided.innerRef}
                                  {...provided.draggableProps}
                                  className={cn(
                                    "flex items-center gap-2 p-1 rounded-lg transition-colors group",
                                    snapshot.isDragging ? "bg-slate-50 shadow-md ring-1 ring-primary/20" : "hover:bg-slate-50"
                                  )}
                                >
                                  <div 
                                    {...provided.dragHandleProps}
                                    className="p-1 cursor-grab active:cursor-grabbing text-slate-300 hover:text-slate-400"
                                  >
                                    <GripVertical className="h-3.5 w-3.5" />
                                  </div>

                                  <div 
                                    className="flex-1 flex items-center justify-between cursor-pointer"
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      setVisibleColumns(prev => 
                                        prev.includes(col.id) 
                                          ? prev.filter(c => c !== col.id) 
                                          : [...allColumns.filter(c => c.id === col.id || prev.includes(c.id)).map(c => c.id)]
                                      )
                                    }}
                                  >
                                    <span className={cn(
                                      "text-xs font-bold transition-colors",
                                      visibleColumns.includes(col.id) ? "text-slate-700" : "text-slate-400"
                                    )}>
                                      {col.label}
                                    </span>
                                    <div className={cn(
                                      "h-5 w-5 rounded-md flex items-center justify-center transition-all border",
                                      visibleColumns.includes(col.id) 
                                        ? "bg-primary border-primary text-white" 
                                        : "bg-white border-slate-200 text-transparent group-hover:border-primary/50"
                                    )}>
                                      <Check className="h-3 w-3" />
                                    </div>
                                  </div>
                                </div>
                              )}
                            </Draggable>
                          ))}
                          {provided.placeholder}
                        </div>
                      )}
                    </Droppable>
                  </DragDropContext>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Filter Sheet */}
      <Sheet open={isFilterSheetOpen} onOpenChange={setIsFilterSheetOpen}>
        <SheetContent side="right" className="w-full sm:max-w-[400px] flex flex-col p-0 bg-white" dir="rtl">
          <div className="p-6 border-b">
            <SheetHeader className="text-right">
              <SheetTitle className="text-xl font-black">מסננים מתקדמים</SheetTitle>
              <SheetDescription>צמצם את רשימת הלידים לפי פרמטרים ספציפיים</SheetDescription>
            </SheetHeader>
          </div>

          <div className="flex-1 overflow-y-auto p-6 space-y-8">
            {/* Assignee Filter */}
            <div className="space-y-3">
              <Label className="text-sm font-bold flex items-center gap-2">
                <User className="h-4 w-4 text-slate-400" />
                שיוך נציג
              </Label>
              <Select value={ownerFilter} onValueChange={setOwnerFilter}>
                <SelectTrigger className="h-11 rounded-xl bg-slate-50 border-slate-200">
                  <SelectValue placeholder="כל הנציגים" />
                </SelectTrigger>
                <SelectContent align="end">
                  <SelectItem value="all">כל הנציגים</SelectItem>
                  <SelectItem value="mine">הלידים שלי</SelectItem>
                  <SelectItem value="unassigned">ללא שיוך</SelectItem>
                  {isUsersLoading ? (
                    <div className="p-2 text-xs text-slate-400 text-center italic">טוען נציגים...</div>
                  ) : businessUsers.length > 0 ? (
                    businessUsers.map(user => (
                      <SelectItem key={user.id} value={user.id}>{user.name}</SelectItem>
                    ))
                  ) : (
                    <div className="p-2 text-xs text-slate-400 text-center italic">אין נציגים זמינים</div>
                  )}
                </SelectContent>
              </Select>
            </div>

            {/* Date Filters */}
            <div className="space-y-3">
              <Label className="text-sm font-bold flex items-center gap-2">
                <CalendarIcon className="h-4 w-4 text-slate-400" />
                טווח תאריכים (יצירה)
              </Label>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <span className="text-[10px] text-slate-400 font-bold uppercase">מתאריך</span>
                  <Input 
                    type="date" 
                    value={dateFrom} 
                    onChange={(e) => setDateFrom(e.target.value)}
                    className="h-10 rounded-xl bg-slate-50 border-slate-200 text-xs"
                  />
                </div>
                <div className="space-y-1.5">
                  <span className="text-[10px] text-slate-400 font-bold uppercase">עד תאריך</span>
                  <Input 
                    type="date" 
                    value={dateTo} 
                    onChange={(e) => setDateTo(e.target.value)}
                    className="h-10 rounded-xl bg-slate-50 border-slate-200 text-xs"
                  />
                </div>
              </div>
            </div>

            {/* Tags Filter */}
            {allTagsInBusiness.length > 0 && (
              <div className="space-y-3">
                <Label className="text-sm font-bold flex items-center gap-2">
                  <TagIcon className="h-4 w-4 text-slate-400" />
                  סינון לפי תגיות
                </Label>
                <div className="flex flex-wrap gap-2 pt-1">
                  {allTagsInBusiness.map(tag => (
                    <Badge
                      key={tag}
                      variant={selectedTags.includes(tag) ? "default" : "outline"}
                      className={cn(
                        "cursor-pointer px-3 py-1 rounded-full text-[11px] font-bold transition-all",
                        selectedTags.includes(tag) 
                          ? "bg-primary text-white shadow-md shadow-primary/20 scale-105" 
                          : "bg-white text-slate-500 border-slate-200 hover:border-primary/50 hover:bg-slate-50"
                      )}
                      onClick={() => {
                        setSelectedTags(prev => 
                          prev.includes(tag) 
                            ? prev.filter(t => t !== tag) 
                            : [...prev, tag]
                        )
                      }}
                    >
                      {tag}
                      {selectedTags.includes(tag) && <X className="h-3 w-3 mr-1" />}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="p-6 border-t bg-slate-50/50">
            <div className="grid grid-cols-2 gap-3">
              <Button 
                variant="outline" 
                className="rounded-xl h-11 font-bold text-slate-500"
                onClick={() => {
                  setOwnerFilter("all")
                  setDateFrom("")
                  setDateTo("")
                  setStatusFilter("all")
                  setSelectedTags([])
                }}
              >
                <FilterX className="h-4 w-4 ml-2" />
                ניקוי הכל
              </Button>
              <Button 
                className="rounded-xl h-11 font-bold"
                onClick={() => setIsFilterSheetOpen(false)}
              >
                החלת מסננים
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-h-0 relative">
        {!hasLoadedInitially && loading ? (
          <div className="flex flex-col items-center justify-center h-64 gap-4 bg-white rounded-2xl border border-dashed border-slate-300">
            <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            <p className="text-slate-500 font-medium">טוען נתונים מהמערכת...</p>
          </div>
        ) : (
          <div className={cn("flex-1 flex flex-col min-h-0 transition-opacity duration-300", loading && "opacity-60 pointer-events-none")}>
            {viewMode === "table" ? (
              <div className="flex-1 flex flex-col min-h-0">
                <div className="flex-1 overflow-auto">
                  <LeadsTable 
                    leads={leads} 
                    onDelete={handleDeleteLead}
                    onEditSuccess={loadLeads}
                    onContactClick={(id) => {
                      setSelectedContactId(id)
                      setSliderOpen(true)
                    }}
                    selectedIds={selectedLeadIds}
                    onSelectionChange={setSelectedLeadIds}
                    allStages={allStages}
                    businessUsers={businessUsers}
                    isUsersLoading={isUsersLoading}
                    sortConfig={sortConfig}
                    onSort={handleSort}
                    visibleColumns={visibleColumns}
                    userRole={userRole}
                    canViewValue={can("deals", "view_value")}
                    canViewSource={can("deals", "view_source")}
                    canViewPhone={can("contacts", "view_phone")}
                    canViewEmail={can("contacts", "view_email")}
                    canViewContactSource={can("contacts", "view_source")}
                  />
                </div>
                
                {/* Pagination Controls */}
                <div className="mt-3 bg-white p-3 rounded-xl border border-slate-200 flex items-center justify-between shadow-sm">
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-slate-500 font-medium">שורות בעמוד:</span>
                      <Select
                        value={String(pageSize)}
                        onValueChange={(val) => {
                          setPageSize(Number(val))
                          setCurrentPage(1)
                        }}
                      >
                        <SelectTrigger className="w-16 h-8 bg-slate-50 border-slate-200 text-xs font-bold">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="text-right" dir="rtl">
                          <SelectItem value="10" className="text-xs">10</SelectItem>
                          <SelectItem value="25" className="text-xs">25</SelectItem>
                          <SelectItem value="50" className="text-xs">50</SelectItem>
                          <SelectItem value="100" className="text-xs">100</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <span className="text-xs text-slate-500 font-bold">
                      {totalLeads > 0 ? (
                        `מציג ${(currentPage - 1) * pageSize + 1} עד ${Math.min(currentPage * pageSize, totalLeads)} מתוך ${totalLeads}`
                      ) : (
                        "אין לידים להצגה"
                      )}
                    </span>
                  </div>
                  
                  <div className="flex items-center gap-1.5">
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-8 w-8 border-slate-200 rounded-lg hover:bg-slate-50"
                      onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                      disabled={currentPage === 1}
                    >
                      <ChevronRight className="h-3.5 w-3.5" />
                    </Button>
                    
                    <div className="flex items-center gap-1 mx-1">
                      {[...Array(Math.min(5, Math.ceil(totalLeads / pageSize)))].map((_, i) => {
                        const pageNum = i + 1
                        return (
                          <Button
                            key={pageNum}
                            variant={currentPage === pageNum ? "default" : "ghost"}
                            className={cn(
                              "h-8 w-8 rounded-lg font-black text-xs transition-all",
                              currentPage === pageNum ? "shadow-md shadow-primary/20" : "text-slate-500 hover:bg-slate-100"
                            )}
                            onClick={() => setCurrentPage(pageNum)}
                          >
                            {pageNum}
                          </Button>
                        )
                      })}
                    </div>

                    <Button
                      variant="outline"
                      size="icon"
                      className="h-8 w-8 border-slate-200 rounded-lg hover:bg-slate-50"
                      onClick={() => setCurrentPage(prev => Math.min(Math.ceil(totalLeads / pageSize), prev + 1))}
                      disabled={currentPage >= Math.ceil(totalLeads / pageSize)}
                    >
                      <ChevronLeft className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="h-full animate-in fade-in duration-500">
                {(statusFilter === "won" || statusFilter === "lost") ? (
                  <div className="flex flex-col items-center justify-center h-full bg-white rounded-2xl border border-dashed border-slate-300 gap-4 p-8 text-center">
                    <div className="bg-slate-50 p-6 rounded-full">
                      <TableIcon className="h-12 w-12 text-slate-300" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-slate-800">תצוגת פייפליין אינה זמינה לעסקאות סגורות</h3>
                      <p className="text-slate-500 max-w-xs mx-auto mt-2">
                        עסקאות שנסגרו או אבדו מוצגות בצורה הטובה ביותר בתצוגת טבלה כדי לצפות בהיסטוריה שלהן.
                      </p>
                    </div>
                    <Button 
                      onClick={() => updateViewMode("table")}
                      variant="default"
                      className="mt-4 rounded-xl shadow-lg"
                    >
                      עבור לתצוגת טבלה
                    </Button>
                  </div>
                ) : selectedPipeline ? (
                  <Suspense fallback={<div className="flex items-center justify-center h-64"><div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" /></div>}>
                    <KanbanBoard
                      pipelineId={selectedPipeline.id}
                      businessId={businessId!}
                      pipeline={selectedPipeline as any}
                      stages={selectedPipelineStages as any}
                      initialDeals={leads.filter(l => l.pipeline_id === selectedPipeline.id)}
                      canViewValue={can("deals", "view_value")}
                      canViewPhone={can("contacts", "view_phone")}
                      canViewEmail={can("contacts", "view_email")}
                      canViewContactSource={can("contacts", "view_source")}
                      onContactClick={(id) => {
                        setSelectedContactId(id)
                        setSliderOpen(true)
                      }}
                      key={`${selectedPipeline.id}-${searchTerm}`}
                      onDealsChange={(updatedDeals) => {
                        setLeads(prevLeads => {
                          const otherLeads = prevLeads.filter(l => l.pipeline_id !== selectedPipeline.id)
                          const updatedWithDetails = (updatedDeals as any[]).map(d => ({
                            ...d,
                            pipeline: selectedPipeline,
                            stage: selectedPipelineStages.find(s => s.id === d.stage_id),
                            contact: leads.find(l => l.contact_id === d.contact_id)?.contact || null
                          }))
                          return [...otherLeads, ...updatedWithDetails]
                        })
                      }}
                      onDeleteDeal={handleDeleteLead}
                      selectedDealIds={selectedLeadIds}
                      onSelectionChange={setSelectedLeadIds}
                    />
                  </Suspense>
                ) : (
                  <div className="flex flex-col items-center justify-center h-full bg-white rounded-2xl border border-dashed border-slate-300 gap-4 p-8 text-center">
                    <div className="bg-slate-50 p-6 rounded-full">
                      <LayoutDashboard className="h-12 w-12 text-slate-300" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-slate-800">יש לבחור פייפליין לתצוגת קאנבן</h3>
                      <p className="text-slate-500 max-w-xs mx-auto mt-2">
                        תצוגת קאנבן מחייבת בחירה של פייפליין ספציפי כדי להציג את השלבים המתאימים.
                      </p>
                    </div>
                    <Button 
                      onClick={() => setIsDropdownOpen(true)}
                      variant="outline"
                      className="mt-4 rounded-xl border-slate-200"
                    >
                      בחר פייפליין מהרשימה
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Bulk Action Bar */}
      <div 
        className={cn(
          "fixed bottom-8 left-1/2 -translate-x-1/2 z-50 transition-all duration-300",
          selectedLeadIds.length > 0 ? "opacity-100 translate-y-0" : "opacity-0 translate-y-20 pointer-events-none"
        )}
      >
        <div className="bg-slate-900 border border-white/10 shadow-2xl rounded-2xl px-6 py-4 flex items-center gap-8" dir="rtl">
          <div className="flex items-center gap-4 border-l border-white/10 pl-8">
            <div className="bg-primary text-white text-base font-black h-9 w-9 rounded-full flex items-center justify-center shadow-lg shadow-primary/40">
              {selectedLeadIds.length}
            </div>
            <div className="flex col">
              <span className="text-white font-bold text-sm">לידים נבחרו</span>
              <span className="text-slate-400 text-[10px]">פעולות גורפות זמינות</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="bg-white/5 border-white/10 text-white hover:bg-white/10 h-10 px-4 rounded-xl gap-2 font-medium">
                  <MoveRight className="h-4 w-4" />
                  שינוי סטטוס גורף
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-[200px] text-right">
                {selectedPipelineId && selectedPipelineId !== "all" ? (
                  allStages
                    .filter(s => s.pipeline_id === selectedPipelineId && !s.is_won && !s.is_lost)
                    .map(stage => (
                      <DropdownMenuItem 
                        key={stage.id} 
                        className="cursor-pointer justify-start gap-2"
                        onClick={() => handleBulkStatusChange(stage.id)}
                      >
                        <div className="h-2 w-2 rounded-full" style={{ backgroundColor: stage.color || "#94a3b8" }} />
                        {stage.name}
                      </DropdownMenuItem>
                    ))
                ) : (
                  <div className="p-2 text-xs text-slate-400 font-bold leading-relaxed">
                    {selectedPipelineIds.includes("all") || selectedPipelineIds.length > 1 
                      ? "יש לבחור פייפליין אחד ספציפי כדי לשנות סטטוס גורף" 
                      : "יש לבחור פייפליין לשינוי סטטוס גורף"}
                  </div>
                )}
              </DropdownMenuContent>
            </DropdownMenu>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="bg-white/5 border-white/10 text-white hover:bg-white/10 h-10 px-4 rounded-xl gap-2 font-medium">
                  <User className="h-4 w-4" />
                  שיוך לנציג
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-[200px] text-right">
                <DropdownMenuItem 
                  className="cursor-pointer justify-start gap-2"
                  onClick={() => handleBulkOwnerChange(null)}
                >
                  <div className="h-5 w-5 rounded-full bg-slate-100 flex items-center justify-center text-[10px] text-slate-500">
                    <X className="h-3 w-3" />
                  </div>
                  ללא שיוך
                </DropdownMenuItem>
                <DropdownMenuSeparator className="bg-white/10" />
                {isUsersLoading ? (
                  <div className="p-2 text-xs text-slate-400 text-center italic">טוען נציגים...</div>
                ) : businessUsers.length > 0 ? (
                  businessUsers.map(user => (
                    <DropdownMenuItem 
                      key={user.id} 
                      className="cursor-pointer justify-start gap-2"
                      onClick={() => handleBulkOwnerChange(user.id)}
                    >
                      <div className="h-5 w-5 rounded-full bg-slate-100 flex items-center justify-center text-[10px] text-slate-500">
                        {user.name?.charAt(0)}
                      </div>
                      {user.name}
                    </DropdownMenuItem>
                  ))
                ) : (
                  <div className="p-2 text-xs text-slate-400 text-center italic">אין נציגים זמינים</div>
                )}
              </DropdownMenuContent>
            </DropdownMenu>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="bg-white/5 border-white/10 text-white hover:bg-white/10 h-10 px-4 rounded-xl gap-2 font-medium">
                  <TagIcon className="h-4 w-4" />
                  הוספת תגית גורפת
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-[200px] text-right p-2">
                <div className="flex flex-col gap-2">
                  <Input 
                    placeholder="הזן תגית..."
                    className="h-9 text-xs bg-slate-800 border-white/10 text-white"
                    value={bulkNewTag}
                    onChange={(e) => setBulkNewTag(e.target.value)}
                  />
                  <Button 
                    size="sm" 
                    className="h-8 font-bold"
                    onClick={() => handleBulkAddTag(bulkNewTag)}
                    disabled={!bulkNewTag.trim() || loading}
                  >
                    הוסף תגית לכולם
                  </Button>
                  {allTagsInBusiness.length > 0 && (
                    <div className="mt-2 space-y-1">
                      <p className="text-[10px] text-slate-500 font-bold mb-1">תגיות קיימות:</p>
                      <div className="flex flex-wrap gap-1">
                        {allTagsInBusiness.slice(0, 10).map(tag => (
                          <button
                            key={tag}
                            className="text-[10px] bg-white/5 hover:bg-white/10 text-slate-300 px-1.5 py-0.5 rounded transition-colors"
                            onClick={() => handleBulkAddTag(tag)}
                          >
                            {tag}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </DropdownMenuContent>
            </DropdownMenu>

            <Button 
              variant="destructive" 
              size="sm" 
              className="h-10 px-4 rounded-xl gap-2 font-bold shadow-lg shadow-rose-900/20"
              onClick={handleBulkDelete}
              disabled={isBulkDeleting}
            >
              <Trash2 className="h-4 w-4" />
              מחיקת לידים
            </Button>

            <div className="w-px h-8 bg-white/10 mx-2" />

            <Button 
              variant="ghost" 
              size="icon" 
              className="h-10 w-10 text-slate-400 hover:text-white hover:bg-white/5 rounded-full transition-colors"
              onClick={() => setSelectedLeadIds([])}
            >
              <X className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </div>

      {/* Quick Add Dialog */}
      {defaultPipelineId && defaultStageId && (
        <QuickAddDealDialog
          open={isAddDialogOpen}
          onOpenChange={setIsAddDialogOpen}
          pipelineId={defaultPipelineId}
          stageId={defaultStageId}
          defaultProductId={selectedPipeline?.product_id}
          onSuccess={() => {
            loadLeads()
            setIsAddDialogOpen(false)
          }}
        />
      )}

      {pipelines.length > 0 && isCsvImportOpen && (
        <Suspense fallback={null}>
          <LeadCsvImportDialog
            open={isCsvImportOpen}
            onOpenChange={setIsCsvImportOpen}
            pipelines={pipelines}
            allStages={allStages}
            defaultPipelineId={defaultPipelineId}
            defaultStageId={defaultStageId}
            defaultProductId={selectedPipeline?.product_id}
            currentUserId={currentUser?.id ?? null}
            maxDeals={features.max_deals}
            currentDealCount={totalLeads}
            onSuccess={() => {
              loadLeads()
              setIsCsvImportOpen(false)
            }}
          />
        </Suspense>
      )}
    </div>
  )
}
