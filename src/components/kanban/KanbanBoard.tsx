"use client"

import { useState } from "react"
import { DragDropContext, DropResult, DragStart, Droppable } from "@hello-pangea/dnd"
import { KanbanColumn } from "./KanbanColumn"
import { QuickAddDealDialog } from "./QuickAddDealDialog"
import { CloseDealWonDialog } from "./CloseDealWonDialog"
import { createClient } from "@/lib/supabase/client"
import { moveDealStage, runAutomations, triggerAutomationFlow } from "@/lib/services/crm"
import { toast } from "sonner"
import { Trophy, Trash2, XCircle } from "lucide-react"
import type { Database } from "@/types/database.types"
import { cn } from "@/lib/utils"

import { ContactDetailsSlider } from "@/components/contacts/ContactDetailsSlider"

type Pipeline = Database["public"]["Tables"]["pipelines"]["Row"]
type Stage = Database["public"]["Tables"]["stages"]["Row"]
type Deal = Database["public"]["Tables"]["deals"]["Row"]

interface KanbanBoardProps {
  pipelineId: string
  businessId: string
  pipeline: Pipeline
  stages: Stage[]
  initialDeals: Deal[]
  onDealsChange: (deals: Deal[]) => void
  onDeleteDeal?: (id: string) => void
  selectedDealIds?: string[]
  onSelectionChange?: (ids: string[]) => void
  canViewValue?: boolean
  canViewPhone?: boolean
  canViewEmail?: boolean
  canViewContactSource?: boolean
}

export function KanbanBoard({
  pipelineId,
  businessId,
  pipeline,
  stages,
  initialDeals,
  onDealsChange,
  onDeleteDeal,
  selectedDealIds = [],
  onSelectionChange,
  canViewValue = true,
  canViewPhone = true,
  canViewEmail = true,
  canViewContactSource = true,
}: KanbanBoardProps) {
  const [deals, setDeals] = useState<Deal[]>(initialDeals)
  const [quickAddStageId, setQuickAddStageId] = useState<string | null>(null)
  const [wonDeal, setWonDeal] = useState<Deal | null>(null)
  const [isWonDialogOpen, setIsWonDialogOpen] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  
  const [selectedContactId, setSelectedContactId] = useState<string | null>(null)
  const [sliderOpen, setSliderOpen] = useState(false)
  
  const supabase = createClient()

  // הפרדת שלבים רגילים משלבי סיום
  const regularStages = stages.filter(s => !s.is_won && !s.is_lost)
  const wonStage = stages.find(s => s.is_won)
  const lostStage = stages.find(s => s.is_lost)

  const onDragStart = (start: DragStart) => {
    setIsDragging(true)
  }

  const onDragEnd = async (result: DropResult) => {
    setIsDragging(false)
    const { destination, source, draggableId } = result

    if (!destination) return
    if (destination.droppableId === source.droppableId && destination.index === source.index) return

    const newStageId = destination.droppableId
    const oldStageId = source.droppableId
    const deal = deals.find((d) => d.id === draggableId)
    if (!deal) return

    // Special handling for WON stage - show confirmation dialog
    if (newStageId === wonStage?.id) {
      setWonDeal(deal)
      setIsWonDialogOpen(true)
      return
    }

    // 1. עדכון אופטימי של ה-UI באופן מיידי
    const previousDeals = [...deals]
    const updatedDeals = deals.map((d) =>
      d.id === draggableId ? { ...d, stage_id: newStageId } : d
    )
    setDeals(updatedDeals)
    onDealsChange(updatedDeals)

    // 2. ביצוע העדכון בשרת ברקע
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      
      if (!user) {
        throw new Error("לא מחובר")
      }

      const res = await moveDealStage(supabase, {
        dealId: draggableId,
        newStageId,
        changedByUserId: user.id,
        businessId,
      })

      if (!res.ok) {
        throw new Error(res.error ?? "שגיאה בהעברת עיסקה")
      }

      // הרצת אוטומציות ברקע (legacy)
      runAutomations(supabase, {
        businessId,
        triggerType: "deal.stage_changed",
        entityType: "deal",
        entityId: draggableId,
        payload: {
          pipeline_id: pipelineId,
          stage_id: newStageId,
          old_stage_id: oldStageId,
          deal_id: draggableId,
          user_id: user.id,
        },
      }).catch(() => {})

      if (newStageId === wonStage?.id) {
        triggerAutomationFlow({
          businessId,
          triggerSubtype: "deal.won",
          entityType: "deal",
          entityId: draggableId,
          payload: { pipeline_id: pipelineId },
        })
        toast.success("כל הכבוד! העיסקה נסגרה בהצלחה 🎉")
      } else if (newStageId === lostStage?.id) toast.error("העיסקה סומנה כהפסד")
      else toast.success("העיסקה הועברה")
    } catch (error) {
      // 3. במידה ונכשלה הפעולה, מחזירים את המצב לקדמותו
      setDeals(previousDeals)
      onDealsChange(previousDeals)
      toast.error(error instanceof Error ? error.message : "שגיאה בהעברת עיסקה")
    }
  }

  const handleDealsRefresh = () => {
    supabase
      .from("deals")
      .select("*")
      .eq("pipeline_id", pipelineId)
      .then(({ data }) => {
        if (data) {
          setDeals(data)
          onDealsChange(data)
        }
      })
  }

  const handleContactClick = (contactId: string) => {
    setSelectedContactId(contactId)
    setSliderOpen(true)
  }

  return (
    <div className="relative h-full flex flex-col min-h-0">
      <ContactDetailsSlider 
        contactId={selectedContactId}
        open={sliderOpen}
        onOpenChange={setSliderOpen}
        onActivityAdded={handleDealsRefresh}
        canViewPhone={canViewPhone}
        canViewEmail={canViewEmail}
        canViewSource={canViewContactSource}
        canViewDealValue={canViewValue}
      />
      <QuickAddDealDialog
        open={quickAddStageId !== null}
        onOpenChange={(open) => setQuickAddStageId(open ? quickAddStageId : null)}
        pipelineId={pipelineId}
        stageId={quickAddStageId ?? ""}
        onSuccess={handleDealsRefresh}
        // @ts-ignore
        defaultProductId={pipeline.product_id}
      />
      <CloseDealWonDialog
        open={isWonDialogOpen}
        onOpenChange={setIsWonDialogOpen}
        deal={wonDeal}
        businessId={businessId}
        pipelineId={pipelineId}
        wonStageId={wonStage?.id ?? ""}
        onSuccess={() => {
          handleDealsRefresh()
          setWonDeal(null)
        }}
        onCancel={() => {
          setWonDeal(null)
          setIsWonDialogOpen(false)
        }}
      />
      <DragDropContext onDragStart={onDragStart} onDragEnd={onDragEnd}>
        <div className="flex gap-6 overflow-x-auto pb-4 h-full items-start scrollbar-hide flex-1 min-h-0">
          {regularStages.map((stage) => (
            <KanbanColumn
              key={stage.id}
              stage={stage}
              deals={deals.filter((d) => d.stage_id === stage.id)}
              onQuickAdd={() => setQuickAddStageId(stage.id)}
              onDeleteDeal={onDeleteDeal}
              onEditSuccess={handleDealsRefresh}
              selectedDealIds={selectedDealIds}
              onSelectionChange={onSelectionChange}
              onContactClick={handleContactClick}
              canViewValue={canViewValue}
            />
          ))}
        </div>

        {/* Bottom Won/Lost Zones */}
        <div 
          className={cn(
            "fixed bottom-10 left-1/2 -translate-x-1/2 flex gap-8 z-50 transition-all duration-300 pointer-events-none",
            isDragging ? "opacity-100 translate-y-0" : "opacity-0 translate-y-20"
          )}
        >
          {wonStage && (
            <Droppable droppableId={wonStage.id}>
              {(provided, snapshot) => (
                <div
                  ref={provided.innerRef}
                  {...provided.droppableProps}
                  className={cn(
                    "w-64 h-24 rounded-2xl border-2 border-dashed flex flex-col items-center justify-center gap-2 transition-all pointer-events-auto",
                    snapshot.isDraggingOver 
                      ? "bg-emerald-500/20 border-emerald-500 scale-110 shadow-lg shadow-emerald-500/20" 
                      : "bg-background/80 backdrop-blur-md border-emerald-500/30 text-emerald-600"
                  )}
                >
                  <Trophy className={cn("h-6 w-6", snapshot.isDraggingOver ? "animate-bounce" : "")} />
                  <span className="font-bold">נסגר</span>
                  {provided.placeholder}
                </div>
              )}
            </Droppable>
          )}

          {lostStage && (
            <Droppable droppableId={lostStage.id}>
              {(provided, snapshot) => (
                <div
                  ref={provided.innerRef}
                  {...provided.droppableProps}
                  className={cn(
                    "w-64 h-24 rounded-2xl border-2 border-dashed flex flex-col items-center justify-center gap-2 transition-all pointer-events-auto",
                    snapshot.isDraggingOver 
                      ? "bg-rose-500/20 border-rose-500 scale-110 shadow-lg shadow-rose-500/20" 
                      : "bg-background/80 backdrop-blur-md border-emerald-500/30 text-rose-600"
                  )}
                >
                  <XCircle className={cn("h-6 w-6", snapshot.isDraggingOver ? "animate-shake" : "")} />
                  <span className="font-bold">אבוד</span>
                  {provided.placeholder}
                </div>
              )}
            </Droppable>
          )}
        </div>
      </DragDropContext>
    </div>
  )
}
