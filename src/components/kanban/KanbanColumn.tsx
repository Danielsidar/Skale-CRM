"use client"

import { Droppable } from "@hello-pangea/dnd"
import { KanbanCard } from "./KanbanCard"
import { Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import type { Database } from "@/types/database.types"

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

export function KanbanColumn({ 
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
  return (
    <div className="flex flex-col w-80 min-w-[320px] max-w-[320px] bg-muted/50 rounded-xl border border-border overflow-hidden max-h-full">
      <div className="p-3.5 flex items-center justify-between border-b border-border bg-card">
        <div className="flex items-center gap-2">
          <span
            className="h-2.5 w-2.5 rounded-full shrink-0"
            style={{ backgroundColor: stage.color || "#94a3b8" }}
          />
          <h3 className="font-semibold text-sm text-foreground">{stage.name}</h3>
          <span className="bg-primary/10 text-primary text-[10px] font-bold px-2 py-0.5 rounded-full">
            {deals.length}
          </span>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-muted-foreground hover:text-foreground"
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
            className={`flex-1 p-2.5 transition-colors duration-200 min-h-[150px] overflow-y-auto space-y-2.5 scrollbar-hide ${
              snapshot.isDraggingOver ? "bg-primary/5" : ""
            }`}
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
}
