"use client"

import { memo } from "react"
import { Droppable } from "@hello-pangea/dnd"
import { KanbanCard } from "./KanbanCard"
import { Plus, Trophy, XCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import type { Database } from "@/types/database.types"
import { cn } from "@/lib/utils"

type Stage = Database["public"]["Tables"]["stages"]["Row"]
type Deal = Database["public"]["Tables"]["deals"]["Row"]

interface KanbanColumnProps {
  stage: Stage
  deals: Deal[]
  onQuickAdd: () => void
  onDeleteDeal?: (id: string) => void
  onEditSuccess?: () => void
  selectedDealIds?: string[]
  onSelectionChange?: (ids: string[]) => void
  onContactClick?: (contactId: string) => void
  canViewValue?: boolean
}

export const KanbanColumn = memo(function KanbanColumn({ 
  stage, 
  deals, 
  onQuickAdd, 
  onDeleteDeal, 
  onEditSuccess,
  selectedDealIds = [],
  onSelectionChange,
  onContactClick,
  canViewValue = true,
}: KanbanColumnProps) {
  const isWon = stage.is_won
  const isLost = stage.is_lost

  return (
    <div className={cn(
      "flex flex-col w-80 min-w-[320px] max-w-[320px] rounded-xl border overflow-hidden max-h-full",
      isWon ? "bg-emerald-50/60 border-emerald-200" : isLost ? "bg-rose-50/60 border-rose-200" : "bg-muted/50 border-border"
    )}>
      <div className={cn(
        "p-3.5 flex items-center justify-between border-b",
        isWon ? "border-emerald-200 bg-emerald-50" : isLost ? "border-rose-200 bg-rose-50" : "border-border bg-card"
      )}>
        <div className="flex items-center gap-2">
          {isWon ? (
            <Trophy className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
          ) : isLost ? (
            <XCircle className="h-3.5 w-3.5 text-rose-500 shrink-0" />
          ) : (
            <span
              className="h-2.5 w-2.5 rounded-full shrink-0"
              style={{ backgroundColor: stage.color || "#94a3b8" }}
            />
          )}
          <h3 className={cn(
            "font-semibold text-sm",
            isWon ? "text-emerald-700" : isLost ? "text-rose-700" : "text-foreground"
          )}>
            {stage.name}
          </h3>
          <span className={cn(
            "text-[10px] font-bold px-2 py-0.5 rounded-full",
            isWon ? "bg-emerald-500/15 text-emerald-700" : isLost ? "bg-rose-500/15 text-rose-700" : "bg-primary/10 text-primary"
          )}>
            {deals.length}
          </span>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className={cn(
            "h-7 w-7",
            isWon ? "text-emerald-500 hover:text-emerald-700 hover:bg-emerald-100" : isLost ? "text-rose-400 hover:text-rose-600 hover:bg-rose-100" : "text-muted-foreground hover:text-foreground"
          )}
          onClick={onQuickAdd}
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      <Droppable droppableId={stage.id}>
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className={cn(
              "flex-1 p-2.5 transition-colors duration-200 min-h-[150px] overflow-y-auto space-y-2.5 scrollbar-hide",
              snapshot.isDraggingOver
                ? isWon ? "bg-emerald-100/60" : isLost ? "bg-rose-100/60" : "bg-primary/5"
                : ""
            )}
          >
            {deals.map((deal, index) => (
              <KanbanCard 
                key={deal.id} 
                deal={deal} 
                index={index} 
                onDelete={onDeleteDeal}
                onEditSuccess={onEditSuccess}
                isSelected={selectedDealIds.includes(deal.id)}
                onSelectChange={(selected) => {
                  if (selected) {
                    onSelectionChange?.([...selectedDealIds, deal.id])
                  } else {
                    onSelectionChange?.(selectedDealIds.filter(id => id !== deal.id))
                  }
                }}
                onContactClick={onContactClick}
                canViewValue={canViewValue}
              />
            ))}
            {provided.placeholder}
          </div>
        )}
      </Droppable>
    </div>
  )
})
