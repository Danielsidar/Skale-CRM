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
import Link from "next/link"
import type { Database } from "@/types/database.types"
import { MoreVertical, Pencil, Trash2, CheckSquare, Square } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Checkbox } from "@/components/ui/checkbox"
import { useState } from "react"
import { QuickAddDealDialog } from "./QuickAddDealDialog"

import { useRouter } from "next/navigation"

type Stage = Database["public"]["Tables"]["stages"]["Row"]
type Deal = Database["public"]["Tables"]["deals"]["Row"]

interface DealsTableProps {
  deals: Deal[]
  stages: Stage[]
  onDelete?: (id: string) => void
  onEditSuccess?: () => void
  selectedIds?: string[]
  onSelectionChange?: (ids: string[]) => void
}

export function DealsTable({ 
  deals, 
  stages, 
  onDelete, 
  onEditSuccess,
  selectedIds = [],
  onSelectionChange 
}: DealsTableProps) {
  const router = useRouter()
  const [editingDeal, setEditingDeal] = useState<Deal | null>(null)
  const getStage = (stageId: string) => stages.find((s) => s.id === stageId)

  const toggleSelectAll = () => {
    if (selectedIds.length === deals.length) {
      onSelectionChange?.([])
    } else {
      onSelectionChange?.(deals.map(d => d.id))
    }
  }

  const toggleSelect = (id: string) => {
    if (selectedIds.includes(id)) {
      onSelectionChange?.(selectedIds.filter(i => i !== id))
    } else {
      onSelectionChange?.([...selectedIds, id])
    }
  }

  return (
    <div className="rounded-xl border border-border overflow-hidden bg-card">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[40px] px-4">
              <Checkbox 
                checked={deals.length > 0 && selectedIds.length === deals.length}
                onCheckedChange={toggleSelectAll}
              />
            </TableHead>
            <TableHead className="text-right font-bold">עיסקה</TableHead>
            <TableHead className="text-right font-bold">שלב</TableHead>
            <TableHead className="text-right font-bold">ערך</TableHead>
            <TableHead className="text-right font-bold">נוצר ב-</TableHead>
            <TableHead className="w-[50px]"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {deals.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                אין עיסקאות בפייפליין זה.
              </TableCell>
            </TableRow>
          ) : (
            deals.map((deal) => {
              const stage = getStage(deal.stage_id)
              const isSelected = selectedIds.includes(deal.id)
              return (
                <TableRow key={deal.id} className={isSelected ? "bg-primary/5" : ""}>
                  <TableCell className="px-4">
                    <Checkbox 
                      checked={isSelected}
                      onCheckedChange={() => toggleSelect(deal.id)}
                    />
                  </TableCell>
                  <TableCell>
                    <button 
                      onClick={() => {
                        if (deal.contact_id) {
                          router.push(`/contacts/${deal.contact_id}`)
                        } else {
                          // Avoid 404 by not redirecting to non-existent /deals/ page
                          console.warn("Deal has no contact_id:", deal.id)
                        }
                      }}
                      className="font-medium hover:text-primary transition-colors text-right bg-transparent border-none p-0 cursor-pointer"
                    >
                      {deal.title}
                    </button>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className="font-medium"
                      style={{ 
                        borderColor: stage?.color || "#94a3b8",
                        color: stage?.color || "#94a3b8"
                      }}
                    >
                      {stage?.name || "לא ידוע"}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-semibold text-emerald-600">
                    {deal.value ? `${new Intl.NumberFormat("he-IL").format(deal.value)} ${deal.currency || "USD"}` : "—"}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {deal.created_at ? format(new Date(deal.created_at), "d MMM yyyy", { locale: he }) : "—"}
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="text-right" dir="rtl">
                        <DropdownMenuItem 
                          className="cursor-pointer justify-end gap-2"
                          onClick={() => setEditingDeal(deal)}
                        >
                          עריכה <Pencil className="h-3.5 w-3.5" />
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          className="text-destructive focus:text-destructive cursor-pointer justify-end gap-2"
                          onClick={() => onDelete?.(deal.id)}
                        >
                          מחיקה <Trash2 className="h-3.5 w-3.5" />
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              )
            })
          )}
        </TableBody>
      </Table>

      {editingDeal && (
        <QuickAddDealDialog
          open={!!editingDeal}
          onOpenChange={(open) => !open && setEditingDeal(null)}
          deal={editingDeal}
          pipelineId={editingDeal.pipeline_id!}
          stageId={editingDeal.stage_id!}
          onSuccess={() => {
            onEditSuccess?.()
            setEditingDeal(null)
          }}
        />
      )}
    </div>
  )
}
