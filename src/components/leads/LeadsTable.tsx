"use client"

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { format } from "date-fns"
import { he } from "date-fns/locale"
import type { Database } from "@/types/database.types"
import { 
  MoreVertical, 
  Pencil, 
  Trash2, 
  ExternalLink, 
  Trophy, 
  XCircle, 
  ArrowUpDown, 
  ArrowUp, 
  ArrowDown, 
  Tag as TagIcon,
  Plus,
  Check,
  X,
  Loader2,
  User
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"
import { Checkbox } from "@/components/ui/checkbox"
import { useState, useMemo, memo } from "react"
import { QuickAddDealDialog } from "@/components/kanban/QuickAddDealDialog"
import { CloseDealWonDialog } from "@/components/kanban/CloseDealWonDialog"
import { useRouter } from "next/navigation"

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { toast } from "sonner"
import { createClient } from "@/lib/supabase/client"
import { moveDealStage } from "@/lib/services/crm"

import { cn } from "@/lib/utils"

type Stage = Database["public"]["Tables"]["stages"]["Row"]
type Deal = Database["public"]["Tables"]["deals"]["Row"]
type Pipeline = Database["public"]["Tables"]["pipelines"]["Row"]
type Contact = Database["public"]["Tables"]["contacts"]["Row"]

export interface LeadWithDetails extends Deal {
  pipeline: Pipeline | null
  stage: Stage | null
  contact: Contact | null
}

import { 
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  TooltipProvider
} from "@/components/ui/tooltip"

interface LeadsTableProps {
  leads: LeadWithDetails[]
  onDelete?: (id: string) => void
  onEditSuccess?: () => void
  selectedIds?: string[]
  onSelectionChange?: (ids: string[]) => void
  allStages?: Stage[]
  businessUsers?: any[]
  isUsersLoading?: boolean
  sortConfig?: { column: string, order: 'asc' | 'desc' }
  onSort?: (column: string) => void
  visibleColumns?: string[]
  userRole?: string
  canViewValue?: boolean
  canViewSource?: boolean
  canViewPhone?: boolean
  canViewEmail?: boolean
  canViewContactSource?: boolean
  onContactClick?: (id: string) => void
}

export const LeadsTable = memo(function LeadsTable({ 
  leads, 
  onDelete, 
  onEditSuccess,
  selectedIds = [],
  onSelectionChange,
  allStages = [],
  businessUsers = [],
  isUsersLoading = false,
  sortConfig,
  onSort,
  visibleColumns = ['title', 'contact', 'pipeline', 'owner', 'tags', 'stage', 'value', 'created_at', 'actions'],
  userRole = 'agent',
  canViewValue = true,
  canViewSource = true,
  canViewPhone = true,
  canViewEmail = true,
  canViewContactSource = true,
  onContactClick,
}: LeadsTableProps) {
  const canReassign = userRole === 'admin' || userRole === 'manager'
  const router = useRouter()
  const [editingLead, setEditingLead] = useState<LeadWithDetails | null>(null)
  const [updatingStageId, setUpdatingStageId] = useState<string | null>(null)
  const [wonDeal, setWonDeal] = useState<LeadWithDetails | null>(null)
  const [isWonDialogOpen, setIsWonDialogOpen] = useState(false)

  // Memoize selected IDs as a Set for O(1) lookups instead of O(n) includes()
  const selectedIdSet = useMemo(() => new Set(selectedIds), [selectedIds])

  // Memoize stages by pipeline for fast won/lost stage lookups
  const stagesByPipeline = useMemo(() => {
    const map = new Map<string, Stage[]>()
    for (const s of allStages) {
      if (!map.has(s.pipeline_id)) map.set(s.pipeline_id, [])
      map.get(s.pipeline_id)!.push(s)
    }
    return map
  }, [allStages])
  
  // Inline editing state
  const [editingField, setEditingField] = useState<{ id: string, field: 'title' | 'value' | 'tags' } | null>(null)
  const [editValue, setEditValue] = useState<string>("")
  const [isUpdating, setIsUpdating] = useState(false)

  const supabase = createClient()

  const handleInlineUpdate = async (id: string, field: string, value: any) => {
    setIsUpdating(true)
    try {
      const updateData: any = {}
      if (field === 'value') updateData[field] = Number(value)
      else updateData[field] = value

      const { error } = await supabase
        .from("deals")
        .update(updateData)
        .eq("id", id)

      if (error) throw error
      
      toast.success("עודכן בהצלחה")
      onEditSuccess?.()
      setEditingField(null)
    } catch (err: any) {
      toast.error("שגיאה בעדכון", { description: err.message })
    } finally {
      setIsUpdating(false)
    }
  }

  const startEditing = (id: string, field: string, initialValue: string) => {
    setEditingField({ id, field } as any)
    setEditValue(initialValue)
  }

  const renderSortIcon = (column: string) => {
    if (!onSort) return null
    if (sortConfig?.column !== column) return <ArrowUpDown className="h-3 w-3 mr-1 opacity-20" />
    return sortConfig.order === 'asc' ? <ArrowUp className="h-3 w-3 mr-1 text-primary" /> : <ArrowDown className="h-3 w-3 mr-1 text-primary" />
  }

  const handleSort = (column: string) => {
    if (onSort) onSort(column)
  }

  const toggleSelectAll = () => {
    if (selectedIds.length === leads.length) {
      onSelectionChange?.([])
    } else {
      onSelectionChange?.(leads.map(l => l.id))
    }
  }

  const toggleSelect = (id: string) => {
    if (selectedIds.includes(id)) {
      onSelectionChange?.(selectedIds.filter(i => i !== id))
    } else {
      onSelectionChange?.([...selectedIds, id])
    }
  }

  const handleStageChange = async (leadId: string, newStageId: string) => {
    const lead = leads.find(l => l.id === leadId)
    if (!lead) return

    const newStage = allStages.find(s => s.id === newStageId)
    
    if (newStage?.is_won) {
      setWonDeal(lead)
      setIsWonDialogOpen(true)
      return
    }

    setUpdatingStageId(leadId)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error("Unauthorized")

      const res = await moveDealStage(supabase, {
        dealId: leadId,
        newStageId,
        changedByUserId: user.id,
        businessId: lead.business_id
      })

      if (!res.ok) throw new Error(res.error)
      
      if (newStage?.is_lost) {
        toast.error("הליד סומן כהפסד")
      } else {
        toast.success("סטטוס הליד עודכן בהצלחה")
      }
      onEditSuccess?.()
    } catch (err: any) {
      toast.error("שגיאה בעדכון הסטטוס", {
        description: err.message
      })
      console.error(err)
    } finally {
      setUpdatingStageId(null)
    }
  }

  const handleWonSuccess = () => {
    setIsWonDialogOpen(false)
    setWonDeal(null)
    onEditSuccess?.()
  }

  const openEntity = async (id: { contactId?: string, dealId?: string }) => {
    if (id.contactId) {
      onContactClick?.(id.contactId)
    } else if (id.dealId) {
      // If we don't have a contactId, try to fetch it first instead of redirecting to a non-existent page
      try {
        const { data, error } = await supabase
          .from("deals")
          .select("contact_id")
          .eq("id", id.dealId)
          .single()
        
        if (data?.contact_id) {
          onContactClick?.(data.contact_id)
        } else {
          toast.error("לא נמצא איש קשר עבור ליד זה")
        }
      } catch (err) {
        console.error("Error fetching contact for deal:", err)
        toast.error("שגיאה בפתיחת פרטי הליד")
      }
    }
  }

  return (
    <div className="rounded-xl border border-border bg-card shadow-sm" dir="rtl">
      {wonDeal && (
        <CloseDealWonDialog
          open={isWonDialogOpen}
          onOpenChange={setIsWonDialogOpen}
          deal={wonDeal}
          businessId={wonDeal.business_id}
          wonStageId={allStages.find(s => s.pipeline_id === wonDeal.pipeline_id && s.is_won)?.id || ""}
          onSuccess={handleWonSuccess}
          onCancel={() => {
            setIsWonDialogOpen(false)
            setWonDeal(null)
          }}
        />
      )}
      <Table>
        <TableHeader className="bg-muted/30">
          <TableRow className="hover:bg-transparent border-b">
            <TableHead className="w-[40px] px-3 text-right">
              <Checkbox 
                checked={leads.length > 0 && selectedIds.length === leads.length}
                onCheckedChange={toggleSelectAll}
                className="h-3.5 w-3.5"
              />
            </TableHead>
            {visibleColumns.map((columnId) => {
              switch (columnId) {
                case 'title':
                  return (
                    <TableHead key="title" className="text-right font-bold text-slate-600 text-[11px] h-10 min-w-[140px] cursor-pointer hover:bg-slate-100/50" onClick={() => handleSort('title')}>
                      <div className="flex items-center justify-start gap-1">
                        {renderSortIcon('title')}
                        שם הליד
                      </div>
                    </TableHead>
                  )
                case 'contact':
                  return <TableHead key="contact" className="text-right font-bold text-slate-600 text-[11px] h-10 min-w-[140px]">איש קשר</TableHead>
                case 'pipeline':
                  return <TableHead key="pipeline" className="text-right font-bold text-slate-600 text-[11px] h-10 min-w-[100px]">פייפליין</TableHead>
                case 'owner':
                  return <TableHead key="owner" className="text-right font-bold text-slate-600 text-[11px] h-10 min-w-[110px]">נציג</TableHead>
                case 'tags':
                  return <TableHead key="tags" className="text-right font-bold text-slate-600 text-[11px] h-10 min-w-[130px]">תגיות</TableHead>
                case 'stage':
                  return <TableHead key="stage" className="text-right font-bold text-slate-600 text-[11px] h-10 min-w-[120px]">סטטוס / שלב</TableHead>
                case 'value':
                  return (
                    <TableHead key="value" className="text-right font-bold text-slate-600 text-[11px] h-10 min-w-[90px] cursor-pointer hover:bg-slate-100/50" onClick={() => handleSort('value')}>
                      <div className="flex items-center justify-start gap-1">
                        {renderSortIcon('value')}
                        ערך
                      </div>
                    </TableHead>
                  )
                case 'created_at':
                  return (
                    <TableHead key="created_at" className="text-right font-bold text-slate-600 text-[11px] h-10 min-w-[120px] cursor-pointer hover:bg-slate-100/50" onClick={() => handleSort('created_at')}>
                      <div className="flex items-center justify-start gap-1">
                        {renderSortIcon('created_at')}
                        נוצר ב-
                      </div>
                    </TableHead>
                  )
                case 'actions':
                  return <TableHead key="actions" className="text-right font-bold text-slate-600 text-[11px] h-10 min-w-[140px]">פעולות מהירות</TableHead>
                default:
                  return null
              }
            })}
          </TableRow>
        </TableHeader>
        <TableBody>
          {leads.length === 0 ? (
            <TableRow>
              <TableCell colSpan={visibleColumns.length + 1} className="h-32 text-center text-muted-foreground">
                <div className="flex flex-col items-center justify-center gap-2">
                  <p className="text-lg font-medium">לא נמצאו לידים</p>
                  <p className="text-sm text-slate-400">נסה לשנות את הסינון או להוסיף ליד חדש</p>
                </div>
              </TableCell>
            </TableRow>
          ) : (
            leads.map((lead) => {
              const isSelected = selectedIdSet.has(lead.id)
              const pipelineStages = stagesByPipeline.get(lead.pipeline_id) ?? []
              const wonStage = pipelineStages.find(s => s.is_won)
              const lostStage = pipelineStages.find(s => s.is_lost)
              
              return (
                <TableRow key={lead.id} className={cn(
                isSelected ? "bg-primary/5 hover:bg-primary/10" : "hover:bg-muted/30 border-b border-slate-100",
                lead.stage?.is_won ? "bg-emerald-50/40 hover:bg-emerald-50/70" : lead.stage?.is_lost ? "bg-rose-50/30 hover:bg-rose-50/60" : ""
              )}>
                  <TableCell className="px-3 text-right py-2.5">
                    <Checkbox 
                      checked={isSelected}
                      onCheckedChange={() => toggleSelect(lead.id)}
                      className="h-3.5 w-3.5"
                    />
                  </TableCell>
                  
                  {visibleColumns.map((columnId) => {
                    switch (columnId) {
                      case 'title':
                        return (
                          <TableCell key="title" className="text-right py-2.5">
                            {editingField?.id === lead.id && editingField?.field === 'title' ? (
                              <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                                <Input 
                                  value={editValue}
                                  onChange={(e) => setEditValue(e.target.value)}
                                  className="h-7 text-[11px] min-w-[120px] bg-white"
                                  autoFocus
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') handleInlineUpdate(lead.id, 'title', editValue)
                                    if (e.key === 'Escape') setEditingField(null)
                                  }}
                                />
                                <Button 
                                  size="icon" 
                                  variant="ghost" 
                                  className="h-6 w-6 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
                                  onClick={() => handleInlineUpdate(lead.id, 'title', editValue)}
                                  disabled={isUpdating}
                                >
                                  {isUpdating ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
                                </Button>
                                <Button 
                                  size="icon" 
                                  variant="ghost" 
                                  className="h-6 w-6 text-rose-600 hover:text-rose-700 hover:bg-rose-50"
                                  onClick={() => setEditingField(null)}
                                >
                                  <X className="h-3 w-3" />
                                </Button>
                              </div>
                            ) : (
                              <div className="group/title flex items-center justify-start gap-1.5">
                                <button 
                                  onClick={() => lead.contact_id ? openEntity({ contactId: lead.contact_id }) : openEntity({ dealId: lead.id })}
                                  className="font-bold text-slate-800 hover:text-primary transition-colors text-right bg-transparent border-none p-0 cursor-pointer text-[12px] truncate max-w-[140px]"
                                >
                                  {lead.title}
                                </button>
                                <Button 
                                  variant="ghost" 
                                  size="icon" 
                                  className="h-4 w-4 opacity-0 group-hover/title:opacity-100 transition-opacity"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    startEditing(lead.id, 'title', lead.title)
                                  }}
                                >
                                  <Pencil className="h-2.5 w-2.5 text-slate-400" />
                                </Button>
                              </div>
                            )}
                          </TableCell>
                        )
                      case 'contact':
                        return (
                          <TableCell key="contact" className="text-right py-2.5">
                            {lead.contact ? (
                              <button 
                                onClick={() => openEntity({ contactId: lead.contact_id! })}
                                className="flex flex-col items-start bg-transparent border-none p-0 cursor-pointer hover:opacity-80 transition-opacity text-right"
                              >
                                <span className="text-[11px] font-bold text-slate-700">{lead.contact.full_name}</span>
                                <span className="text-[10px] text-slate-400 truncate max-w-[140px]">
                                  {canViewEmail && lead.contact.email ? lead.contact.email : canViewPhone && lead.contact.phone ? lead.contact.phone : "—"}
                                </span>
                              </button>
                            ) : (
                              <span className="text-[11px] text-slate-400">—</span>
                            )}
                          </TableCell>
                        )
                      case 'pipeline':
                        return (
                          <TableCell key="pipeline" className="text-right py-2.5 text-[10px] font-bold text-slate-500 uppercase tracking-tight">
                            {lead.pipeline?.name || "—"}
                          </TableCell>
                        )
                      case 'owner':
                        return (
                          <TableCell key="owner" className="text-right py-2.5">
                            <Select
                              value={lead.owner_user_id || "none"}
                              onValueChange={(val) => handleInlineUpdate(lead.id, 'owner_user_id', val === "none" ? null : val)}
                              disabled={isUpdating || !canReassign}
                            >
                              <SelectTrigger className="h-7 min-w-[100px] bg-slate-50/50 border-none shadow-none px-2 hover:bg-slate-100 transition-colors focus:ring-0 rounded-md [&>svg]:hidden">
                                <div className="flex items-center justify-start gap-1.5 overflow-hidden w-full">
                                  <div className="h-4 w-4 rounded-full bg-primary/10 flex items-center justify-center text-[8px] text-primary font-black border border-primary/20 shrink-0">
                                    {businessUsers.find(u => u.id === lead.owner_user_id)?.name?.charAt(0) || <User className="h-2.5 w-2.5" />}
                                  </div>
                                  <span className="text-[10px] font-bold text-slate-600 truncate">
                                    {businessUsers.find(u => u.id === lead.owner_user_id)?.name || "ללא שיוך"}
                                  </span>
                                </div>
                              </SelectTrigger>
                              <SelectContent align="end" className="text-right min-w-[160px] max-h-[240px]" dir="rtl">
                                <SelectItem value="none" className="text-[11px] font-medium py-2">ללא שיוך</SelectItem>
                                {isUsersLoading ? (
                                  <div className="p-2 text-xs text-slate-400 text-center italic">טוען נציגים...</div>
                                ) : businessUsers.length > 0 ? (
                                  businessUsers.map(user => (
                                    <SelectItem key={user.id} value={user.id} className="text-[11px] font-bold py-2">
                                      <div className="flex items-center gap-2">
                                        <div className="h-5 w-5 rounded-full bg-slate-100 flex items-center justify-center text-[10px] text-slate-500">
                                          {user.name?.charAt(0)}
                                        </div>
                                        {user.name}
                                      </div>
                                    </SelectItem>
                                  ))
                                ) : (
                                  <div className="p-2 text-xs text-slate-400 text-center italic">אין נציגים זמינים</div>
                                )}
                              </SelectContent>
                            </Select>
                          </TableCell>
                        )
                      case 'tags':
                        return (
                          <TableCell key="tags" className="text-right py-2.5">
                            <div className="flex flex-wrap items-center justify-start gap-1">
                              {lead.tags && lead.tags.length > 0 ? (
                                lead.tags.map((tag, i) => (
                                  <Badge 
                                    key={i} 
                                    variant="secondary" 
                                    className="bg-slate-100 text-slate-600 text-[9px] px-1.5 py-0 border-none rounded font-bold group/tag h-4"
                                  >
                                    {tag}
                                    <button 
                                      className="mr-1 opacity-0 group-hover/tag:opacity-100 transition-opacity hover:text-rose-500"
                                      onClick={(e) => {
                                        e.stopPropagation()
                                        const newTags = lead.tags?.filter(t => t !== tag)
                                        handleInlineUpdate(lead.id, 'tags', newTags)
                                      }}
                                    >
                                      <X className="h-2 w-2" />
                                    </button>
                                  </Badge>
                                ))
                              ) : (
                                <span className="text-[10px] text-slate-300 italic">—</span>
                              )}
                              
                              {editingField?.id === lead.id && editingField?.field === 'tags' ? (
                                <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                                  <Input 
                                    value={editValue}
                                    onChange={(e) => setEditValue(e.target.value)}
                                    placeholder="תגית..."
                                    className="h-6 text-[9px] w-16 px-1.5 bg-white border-primary/30"
                                    autoFocus
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter') {
                                        const newTags = [...(lead.tags || []), editValue.trim()].filter(Boolean)
                                        handleInlineUpdate(lead.id, 'tags', newTags)
                                      }
                                      if (e.key === 'Escape') setEditingField(null)
                                    }}
                                  />
                                </div>
                              ) : (
                                <Button 
                                  variant="ghost" 
                                  size="icon" 
                                  className="h-4 w-4 rounded-full bg-slate-50 hover:bg-slate-100 border border-slate-200"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    startEditing(lead.id, 'tags', "")
                                  }}
                                >
                                  <Plus className="h-2 w-2 text-slate-400" />
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        )
                      case 'stage': {
                        const activeStagesForLead = allStages.filter(s => s.pipeline_id === lead.pipeline_id && !s.is_won && !s.is_lost)
                        const wonStagesForLead = allStages.filter(s => s.pipeline_id === lead.pipeline_id && s.is_won)
                        const lostStagesForLead = allStages.filter(s => s.pipeline_id === lead.pipeline_id && s.is_lost)
                        return (
                          <TableCell key="stage" className="text-right py-2.5">
                            <Select
                              value={lead.stage_id || ""}
                              onValueChange={(val) => handleStageChange(lead.id, val)}
                              disabled={updatingStageId === lead.id}
                            >
                              <SelectTrigger 
                                className="h-7 min-w-[100px] bg-transparent border-none shadow-none p-0 hover:bg-slate-50 transition-colors focus:ring-0 [&>svg]:hidden flex justify-start"
                              >
                                {lead.stage?.is_won ? (
                                  <Badge className="font-bold text-[9px] px-2 py-0.5 rounded-full border-none shadow-sm cursor-pointer h-5 bg-emerald-100 text-emerald-700 hover:bg-emerald-100 flex items-center gap-1">
                                    <Trophy className="h-2.5 w-2.5" />
                                    נסגר
                                  </Badge>
                                ) : lead.stage?.is_lost ? (
                                  <Badge className="font-bold text-[9px] px-2 py-0.5 rounded-full border-none shadow-sm cursor-pointer h-5 bg-rose-100 text-rose-700 hover:bg-rose-100 flex items-center gap-1">
                                    <XCircle className="h-2.5 w-2.5" />
                                    {lead.stage?.name || "אבוד"}
                                  </Badge>
                                ) : (
                                  <Badge
                                    variant="outline"
                                    className="font-bold text-[9px] px-2 py-0.5 rounded-full border-none shadow-sm cursor-pointer h-5"
                                    style={{ 
                                      backgroundColor: (lead.stage?.color || "#94a3b8") + "15",
                                      color: lead.stage?.color || "#94a3b8"
                                    }}
                                  >
                                    {lead.stage?.name || "לא ידוע"}
                                  </Badge>
                                )}
                              </SelectTrigger>
                              <SelectContent align="end" position="popper" className="text-right" dir="rtl">
                                {activeStagesForLead.map(stage => (
                                  <SelectItem key={stage.id} value={stage.id} className="text-[11px] font-bold py-2">
                                    <div className="flex items-center gap-2">
                                      <div className="h-2 w-2 rounded-full" style={{ backgroundColor: stage.color || "#94a3b8" }} />
                                      {stage.name}
                                    </div>
                                  </SelectItem>
                                ))}
                                {(wonStagesForLead.length > 0 || lostStagesForLead.length > 0) && (
                                  <div className="my-1 border-t border-slate-100" />
                                )}
                                {wonStagesForLead.map(stage => (
                                  <SelectItem key={stage.id} value={stage.id} className="text-[11px] font-bold py-2 text-emerald-700">
                                    <div className="flex items-center gap-2">
                                      <Trophy className="h-3 w-3 text-emerald-500" />
                                      נסגר
                                    </div>
                                  </SelectItem>
                                ))}
                                {lostStagesForLead.map(stage => (
                                  <SelectItem key={stage.id} value={stage.id} className="text-[11px] font-bold py-2 text-rose-700">
                                    <div className="flex items-center gap-2">
                                      <XCircle className="h-3 w-3 text-rose-500" />
                                      {stage.name}
                                    </div>
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </TableCell>
                        )
                      }
                      case 'value':
                        return (
                          <TableCell key="value" className="font-black text-emerald-600 text-[11px] text-right py-2.5">
                            {!canViewValue ? (
                              <span className="text-slate-300 font-bold text-[10px]">•••</span>
                            ) : editingField?.id === lead.id && editingField?.field === 'value' ? (
                              <div className="flex items-center justify-start gap-1" onClick={(e) => e.stopPropagation()}>
                                <div className="relative">
                                  <span className="absolute left-1.5 top-1/2 -translate-y-1/2 text-[9px] text-slate-400 font-normal">₪</span>
                                  <Input 
                                    type="number"
                                    value={editValue}
                                    onChange={(e) => setEditValue(e.target.value)}
                                    className="h-7 text-[10px] w-20 pl-4 text-left font-bold"
                                    autoFocus
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter') handleInlineUpdate(lead.id, 'value', editValue)
                                      if (e.key === 'Escape') setEditingField(null)
                                    }}
                                  />
                                </div>
                                <Button 
                                  size="icon" 
                                  variant="ghost" 
                                  className="h-6 w-6 text-emerald-600"
                                  onClick={() => handleInlineUpdate(lead.id, 'value', editValue)}
                                  disabled={isUpdating}
                                >
                                  {isUpdating ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
                                </Button>
                              </div>
                            ) : (
                              <div 
                                className="group/value flex items-center justify-start gap-1.5 cursor-pointer hover:bg-emerald-50/50 px-1.5 py-0.5 rounded transition-colors w-fit"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  startEditing(lead.id, 'value', lead.value?.toString() || "0")
                                }}
                              >
                                <Pencil className="h-2.5 w-2.5 opacity-0 group-hover/value:opacity-100 transition-opacity text-emerald-400" />
                                <span>
                                  {lead.value ? `₪${new Intl.NumberFormat("he-IL").format(lead.value)}` : "₪0"}
                                </span>
                              </div>
                            )}
                          </TableCell>
                        )
                      case 'created_at':
                        return (
                          <TableCell key="created_at" className="text-[10px] font-bold text-slate-400 text-right py-2.5">
                            {lead.created_at ? format(new Date(lead.created_at), "dd/MM/yy HH:mm", { locale: he }) : "—"}
                          </TableCell>
                        )
                      case 'actions':
                        return (
                          <TableCell key="actions" className="text-right py-2.5">
                            <div className="flex items-center justify-start gap-1">
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      disabled={updatingStageId === lead.id || lead.stage?.is_won}
                                      onClick={() => wonStage && handleStageChange(lead.id, wonStage.id)}
                                      className={cn(
                                        "h-7 w-7 p-0 rounded-md border-emerald-200 text-emerald-600 hover:bg-emerald-50 hover:text-emerald-700 transition-all",
                                        lead.stage?.is_won && "bg-emerald-50 border-emerald-500 text-emerald-700 opacity-100"
                                      )}
                                    >
                                      <Trophy className="h-3.5 w-3.5" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent side="top">נסגר</TooltipContent>
                                </Tooltip>
                              </TooltipProvider>

                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      disabled={updatingStageId === lead.id || lead.stage?.is_lost}
                                      onClick={() => lostStage && handleStageChange(lead.id, lostStage.id)}
                                      className={cn(
                                        "h-7 w-7 p-0 rounded-md border-rose-200 text-rose-600 hover:bg-rose-50 hover:text-rose-700 transition-all",
                                        lead.stage?.is_lost && "bg-rose-50 border-rose-500 text-rose-700 opacity-100"
                                      )}
                                    >
                                      <XCircle className="h-3.5 w-3.5" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent side="top">אבוד</TooltipContent>
                                </Tooltip>
                              </TooltipProvider>

                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => setEditingLead(lead)}
                                      className="h-7 w-7 p-0 rounded-md border-blue-200 text-blue-600 hover:bg-blue-50 hover:text-blue-700 transition-all"
                                    >
                                      <Pencil className="h-3.5 w-3.5" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent side="top">עריכה</TooltipContent>
                                </Tooltip>
                              </TooltipProvider>

                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => onDelete?.(lead.id)}
                                      className="h-7 w-7 p-0 rounded-md border-slate-200 text-slate-400 hover:border-rose-200 hover:text-rose-600 hover:bg-rose-50 transition-all"
                                    >
                                      <Trash2 className="h-3.5 w-3.5" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent side="top">מחיקה</TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            </div>
                          </TableCell>
                        )
                      default:
                        return null
                    }
                  })}

                </TableRow>
              )
            })
          )}
        </TableBody>
      </Table>

      {editingLead && (
        <QuickAddDealDialog
          open={!!editingLead}
          onOpenChange={(open) => !open && setEditingLead(null)}
          deal={editingLead}
          pipelineId={editingLead.pipeline_id!}
          stageId={editingLead.stage_id!}
          onSuccess={() => {
            onEditSuccess?.()
            setEditingLead(null)
          }}
        />
      )}
    </div>
  )
})
