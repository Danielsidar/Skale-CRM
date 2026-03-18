"use client"

import { Draggable } from "@hello-pangea/dnd"
import { DollarSign, ArrowUpLeft, MoreVertical, Pencil, Trash2 } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import type { Database } from "@/types/database.types"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"
import { useState } from "react"
import { QuickAddDealDialog } from "./QuickAddDealDialog"

import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { Plus, X, Check, Loader2 } from "lucide-react"
import { Input } from "@/components/ui/input"
import { createClient } from "@/lib/supabase/client"
import { toast } from "sonner"

type Deal = Database["public"]["Tables"]["deals"]["Row"]

interface KanbanCardProps {
  deal: Deal
  index: number
  onDelete?: (id: string) => void
  onEditSuccess?: () => void
  isSelected?: boolean
  onSelectChange?: (selected: boolean) => void
  onContactClick?: (contactId: string) => void
  canViewValue?: boolean
}

export function KanbanCard({ 
  deal, 
  index, 
  onDelete, 
  onEditSuccess,
  isSelected = false,
  onSelectChange,
  onContactClick,
  canViewValue = true,
}: KanbanCardProps) {
  const router = useRouter()
  const supabase = createClient()
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [isAddingTag, setIsAddingTag] = useState(false)
  const [newTag, setNewTag] = useState("")
  const [isUpdating, setIsUpdating] = useState(false)

  const handleAddTag = async () => {
    if (!newTag.trim()) {
      setIsAddingTag(false)
      return
    }
    
    setIsUpdating(true)
    try {
      const existingTags = (deal as any).tags || []
      const newTags = [...existingTags, newTag.trim()]
      
      const { error } = await supabase
        .from("deals")
        .update({ tags: newTags })
        .eq("id", deal.id)

      if (error) throw error
      
      toast.success("תגית נוספה")
      onEditSuccess?.()
      setNewTag("")
      setIsAddingTag(false)
    } catch (err: any) {
      toast.error("שגיאה בהוספת תגית")
    } finally {
      setIsUpdating(false)
    }
  }

  const handleRemoveTag = async (tagToRemove: string) => {
    setIsUpdating(true)
    try {
      const existingTags = (deal as any).tags || []
      const newTags = existingTags.filter((t: string) => t !== tagToRemove)
      
      const { error } = await supabase
        .from("deals")
        .update({ tags: newTags })
        .eq("id", deal.id)

      if (error) throw error
      
      onEditSuccess?.()
    } catch (err: any) {
      toast.error("שגיאה בהסרת תגית")
    } finally {
      setIsUpdating(false)
    }
  }

  const valueFormatted =
    deal.value != null && Number(deal.value) > 0
      ? new Intl.NumberFormat("he-IL", {
          style: "decimal",
          minimumFractionDigits: 0,
          maximumFractionDigits: 0,
        }).format(Number(deal.value))
      : null

  const handleCardClick = async (e: React.MouseEvent) => {
    // If clicking checkbox or dropdown, don't trigger sheet
    if ((e.target as HTMLElement).closest('button') || (e.target as HTMLElement).closest('input[type="checkbox"]')) {
      return
    }

    e.preventDefault()
    
    if (deal.contact_id) {
      if (onContactClick) {
        onContactClick(deal.contact_id)
      } else {
        router.push(`/contacts/${deal.contact_id}`)
      }
      return
    }

    // If we don't have a contactId, try to fetch it first instead of redirecting to a non-existent page
    setIsUpdating(true)
    try {
      const { data, error } = await supabase
        .from("deals")
        .select("contact_id")
        .eq("id", deal.id)
        .single()
      
      if (data?.contact_id) {
        if (onContactClick) {
          onContactClick(data.contact_id)
        } else {
          router.push(`/contacts/${data.contact_id}`)
        }
      } else {
        toast.error("לא נמצא איש קשר עבור ליד זה")
      }
    } catch (err) {
      console.error("Error fetching contact for deal:", err)
      toast.error("שגיאה בפתיחת פרטי הליד")
    } finally {
      setIsUpdating(false)
    }
  }

  return (
    <>
      <Draggable draggableId={deal.id} index={index}>
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.draggableProps}
            {...provided.dragHandleProps}
          >
            <div
              onClick={handleCardClick}
              className={cn(
                "bg-card border border-border rounded-lg p-3.5 transition-all cursor-grab active:cursor-grabbing hover:border-primary/30 hover:shadow-sm group/card relative",
                snapshot.isDragging ? "shadow-lg border-primary/40 ring-1 ring-primary/20" : "",
                isSelected ? "ring-2 ring-primary border-primary/50 bg-primary/5" : ""
              )}
            >
              <div className={cn(
                "absolute top-2 left-2 z-10 transition-opacity flex items-center gap-1",
                isSelected ? "opacity-100" : "opacity-0 group-hover/card:opacity-100"
              )}>
                <Checkbox 
                  checked={isSelected}
                  onCheckedChange={(checked) => onSelectChange?.(!!checked)}
                  className="bg-background border-border"
                />
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-7 w-7 rounded-md hover:bg-muted">
                      <MoreVertical className="h-3.5 w-3.5 text-muted-foreground" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="text-right">
                    <DropdownMenuItem 
                      className="cursor-pointer justify-end gap-2 text-xs"
                      onClick={() => setIsEditOpen(true)}
                    >
                      עריכה <Pencil className="h-3 w-3" />
                    </DropdownMenuItem>
                    {deal.contact_id && (
                      <DropdownMenuItem 
                        className="cursor-pointer justify-end gap-2 text-xs font-bold text-primary"
                        onClick={() => onContactClick ? onContactClick(deal.contact_id!) : router.push(`/contacts/${deal.contact_id}`)}
                      >
                        כרטיס איש קשר <ArrowUpLeft className="h-3 w-3" />
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuItem 
                      className="text-destructive focus:text-destructive cursor-pointer justify-end gap-2 text-xs"
                      onClick={() => onDelete?.(deal.id)}
                    >
                      מחיקה <Trash2 className="h-3 w-3" />
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              <div className="space-y-2.5">
                <div className="flex items-start justify-between">
                  <h4 className="font-semibold text-foreground text-sm leading-tight group-hover/card:text-primary transition-colors line-clamp-2">
                    {deal.title}
                  </h4>
                  <ArrowUpLeft className="h-3 w-3 text-muted-foreground opacity-0 group-hover/card:opacity-100 transition-all shrink-0 mt-0.5" />
                </div>
                {valueFormatted && canViewValue && (
                  <div className="flex items-center text-xs font-semibold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/30 px-2 py-0.5 rounded-md w-fit">
                    <DollarSign className="h-3 w-3 ml-0.5" />
                    {valueFormatted} {deal.currency || "USD"}
                  </div>
                )}
                
                {/* Tags */}
                <div className="flex flex-wrap items-center gap-1 mt-2 pt-2 border-t border-slate-50">
                  {(deal as any).tags && (deal as any).tags.length > 0 && (
                    (deal as any).tags.map((tag: string, i: number) => (
                      <Badge 
                        key={i} 
                        variant="secondary" 
                        className="bg-slate-50 text-slate-500 text-[9px] px-1.5 py-0 border-none rounded-md font-medium group/tag"
                      >
                        {tag}
                        <button 
                          className="mr-1 opacity-0 group-hover/tag:opacity-100 transition-opacity hover:text-rose-500"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleRemoveTag(tag)
                          }}
                        >
                          <X className="h-2 w-2" />
                        </button>
                      </Badge>
                    ))
                  )}
                  
                  {isAddingTag ? (
                    <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                      <Input 
                        value={newTag}
                        onChange={(e) => setNewTag(e.target.value)}
                        className="h-6 text-[9px] w-16 px-1"
                        autoFocus
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleAddTag()
                          if (e.key === 'Escape') setIsAddingTag(false)
                        }}
                      />
                    </div>
                  ) : (
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-5 w-5 rounded-full hover:bg-slate-100"
                      onClick={(e) => {
                        e.stopPropagation()
                        setIsAddingTag(true)
                      }}
                    >
                      <Plus className="h-2.5 w-2.5 text-slate-400" />
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </Draggable>

      <QuickAddDealDialog
        open={isEditOpen}
        onOpenChange={setIsEditOpen}
        deal={deal}
        pipelineId={deal.pipeline_id!}
        stageId={deal.stage_id!}
        onSuccess={() => onEditSuccess?.()}
      />
    </>
  )
}
