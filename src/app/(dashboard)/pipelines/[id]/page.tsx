"use client"

import { useEffect, useState, useCallback } from "react"
import { useParams, useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { useBusiness } from "@/lib/hooks/useBusiness"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  DragDropContext,
  Droppable,
  Draggable,
  DropResult,
} from "@hello-pangea/dnd"
import { ArrowRight, Plus, Trash2, Save, GripVertical, Check, X } from "lucide-react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import type { Database } from "@/types/database.types"

type Stage = Database["public"]["Tables"]["stages"]["Row"]

const COLORS = [
  "#94a3b8", "#60a5fa", "#38bdf8", "#22d3ee", "#2dd4bf",
  "#34d399", "#86efac", "#fbbf24", "#f97316", "#f87171",
  "#e879f9", "#a78bfa",
]

export default function PipelineEditPage() {
  const params = useParams()
  const router = useRouter()
  const { businessId } = useBusiness()
  const pipelineId = params.id as string
  const supabase = createClient()

  const [pipelineName, setPipelineName] = useState("")
  const [editingName, setEditingName] = useState(false)
  const [nameInput, setNameInput] = useState("")
  const [stages, setStages] = useState<Stage[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [dirty, setDirty] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<Stage | null>(null)
  const [deleting, setDeleting] = useState(false)

  const load = useCallback(async () => {
    const { data: pipeline } = await supabase
      .from("pipelines")
      .select("*")
      .eq("id", pipelineId)
      .single()

    if (!pipeline) { router.push("/pipelines"); return }
    setPipelineName(pipeline.name)
    setNameInput(pipeline.name)

    const { data: stageRows } = await supabase
      .from("stages")
      .select("*")
      .eq("pipeline_id", pipelineId)
      .order("position", { ascending: true })

    setStages(stageRows ?? [])
    setLoading(false)
  }, [pipelineId, router, supabase])

  useEffect(() => { load() }, [load])

  const handleDragEnd = (result: DropResult) => {
    if (!result.destination) return
    const reordered = Array.from(stages)
    const [moved] = reordered.splice(result.source.index, 1)
    reordered.splice(result.destination.index, 0, moved)
    const updated = reordered.map((s, i) => ({ ...s, position: i }))
    setStages(updated)
    setDirty(true)
  }

  const updateStage = (id: string, changes: Partial<Stage>) => {
    setStages((prev) => prev.map((s) => (s.id === id ? { ...s, ...changes } : s)))
    setDirty(true)
  }

  const addStage = () => {
    const tempId = `new-${Date.now()}`
    const newStage: Stage = {
      id: tempId,
      pipeline_id: pipelineId,
      name: "שלב חדש",
      position: stages.length,
      color: "#94a3b8",
      probability: 50,
      is_won: false,
      is_lost: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }
    setStages((prev) => [...prev, newStage])
    setDirty(true)
  }

  const handleSave = async () => {
    if (!businessId) return
    setSaving(true)
    try {
      for (let i = 0; i < stages.length; i++) {
        const s = stages[i]
        if (s.id.startsWith("new-")) {
          const { error } = await supabase.from("stages").insert({
            pipeline_id: pipelineId,
            name: s.name,
            position: i,
            color: s.color,
            probability: s.probability,
            is_won: s.is_won,
            is_lost: s.is_lost,
          })
          if (error) throw error
        } else {
          const { error } = await supabase.from("stages").update({
            name: s.name,
            position: i,
            color: s.color,
            probability: s.probability,
            is_won: s.is_won,
            is_lost: s.is_lost,
          }).eq("id", s.id)
          if (error) throw error
        }
      }
      toast.success("השלבים נשמרו בהצלחה")
      setDirty(false)
      load()
    } catch {
      toast.error("שגיאה בשמירת השלבים")
    } finally {
      setSaving(false)
    }
  }

  const savePipelineName = async () => {
    if (!nameInput.trim() || nameInput === pipelineName) { setEditingName(false); return }
    const { error } = await supabase.from("pipelines").update({ name: nameInput.trim() }).eq("id", pipelineId)
    if (error) { toast.error("שגיאה בשמירת השם"); return }
    setPipelineName(nameInput.trim())
    setEditingName(false)
    toast.success("שם הפייפליין עודכן")
  }

  const handleDeleteStage = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      if (!deleteTarget.id.startsWith("new-")) {
        const { error } = await supabase.from("stages").delete().eq("id", deleteTarget.id)
        if (error) throw error
      }
      setStages((prev) => {
        const filtered = prev.filter((s) => s.id !== deleteTarget.id)
        return filtered.map((s, i) => ({ ...s, position: i }))
      })
      setDeleteTarget(null)
      toast.success("השלב נמחק")
    } catch {
      toast.error("שגיאה במחיקת השלב")
    } finally {
      setDeleting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[200px] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    )
  }

  return (
    <div className="space-y-8 max-w-3xl">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" className="h-9 w-9 rounded-lg" asChild>
          <Link href="/pipelines">
            <ArrowRight className="h-4 w-4" />
          </Link>
        </Button>
        <div className="flex-1">
          {editingName ? (
            <div className="flex items-center gap-2">
              <Input
                value={nameInput}
                onChange={(e) => setNameInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") savePipelineName(); if (e.key === "Escape") setEditingName(false) }}
                className="h-8 text-xl font-bold max-w-xs"
                autoFocus
              />
              <Button size="icon" variant="ghost" className="h-8 w-8 text-emerald-600" onClick={savePipelineName}>
                <Check className="h-4 w-4" />
              </Button>
              <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setEditingName(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <button
              onClick={() => setEditingName(true)}
              className="text-2xl font-bold tracking-tight hover:text-primary transition-colors text-right"
            >
              {pipelineName}
            </button>
          )}
          <p className="text-muted-foreground text-sm">לחץ על שם הפייפליין לעריכה • גרור שלבים לשינוי הסדר</p>
        </div>
        {dirty && (
          <Button onClick={handleSave} disabled={saving} className="gap-2">
            <Save className="h-4 w-4" />
            {saving ? "שומר..." : "שמור שינויים"}
          </Button>
        )}
      </div>

      {/* Stages */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-4">
          <CardTitle className="text-base font-bold">שלבי הפייפליין</CardTitle>
          <Button variant="outline" size="sm" onClick={addStage} className="gap-2">
            <Plus className="h-4 w-4" />
            הוסף שלב
          </Button>
        </CardHeader>
        <CardContent>
          <DragDropContext onDragEnd={handleDragEnd}>
            <Droppable droppableId="stages">
              {(provided) => (
                <div
                  {...provided.droppableProps}
                  ref={provided.innerRef}
                  className="space-y-2"
                >
                  {stages.map((stage, index) => (
                    <Draggable key={stage.id} draggableId={stage.id} index={index}>
                      {(provided, snapshot) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                          className={cn(
                            "flex items-center gap-3 p-3 rounded-lg border transition-shadow",
                            snapshot.isDragging
                              ? "shadow-lg bg-background border-primary/40"
                              : "bg-muted/20 border-border"
                          )}
                        >
                          {/* Drag handle */}
                          <div
                            {...provided.dragHandleProps}
                            className="text-muted-foreground hover:text-foreground cursor-grab active:cursor-grabbing p-0.5"
                          >
                            <GripVertical className="h-4 w-4" />
                          </div>

                          {/* Position */}
                          <span className="text-xs font-bold text-muted-foreground w-5 text-center shrink-0">
                            {index + 1}
                          </span>

                          {/* Color picker */}
                          <div className="relative group/color shrink-0">
                            <button
                              className="h-6 w-6 rounded-full border-2 border-white shadow-sm transition-transform hover:scale-110"
                              style={{ backgroundColor: stage.color ?? "#94a3b8" }}
                            />
                            <div className="absolute top-8 right-0 z-10 hidden group-hover/color:flex flex-wrap gap-1 p-2 bg-popover border rounded-lg shadow-xl w-40">
                              {COLORS.map((c) => (
                                <button
                                  key={c}
                                  className={cn(
                                    "h-5 w-5 rounded-full border-2 transition-transform hover:scale-110",
                                    stage.color === c ? "border-primary scale-110" : "border-transparent"
                                  )}
                                  style={{ backgroundColor: c }}
                                  onClick={() => updateStage(stage.id, { color: c })}
                                />
                              ))}
                            </div>
                          </div>

                          {/* Name */}
                          <input
                            className="bg-transparent border-none focus:ring-0 text-sm font-medium flex-1 outline-none min-w-0"
                            value={stage.name}
                            onChange={(e) => updateStage(stage.id, { name: e.target.value })}
                            placeholder="שם השלב"
                          />

                          {/* Probability */}
                          <div className="flex items-center gap-1 shrink-0">
                            <input
                              type="number"
                              className="bg-background border rounded px-2 py-1 text-xs w-14 text-center"
                              value={stage.probability ?? 0}
                              min={0}
                              max={100}
                              onChange={(e) => updateStage(stage.id, { probability: parseInt(e.target.value) || 0 })}
                            />
                            <span className="text-xs text-muted-foreground">%</span>
                          </div>

                          {/* Won / Lost badges */}
                          <div className="flex items-center gap-2 shrink-0">
                            <button
                              onClick={() => updateStage(stage.id, { is_won: !stage.is_won, is_lost: false })}
                              className={cn(
                                "text-xs px-2 py-0.5 rounded-full border transition-colors",
                                stage.is_won
                                  ? "bg-emerald-500/15 border-emerald-500 text-emerald-600 font-semibold"
                                  : "border-border text-muted-foreground hover:border-emerald-500/50"
                              )}
                            >
                              ניצחון
                            </button>
                            <button
                              onClick={() => updateStage(stage.id, { is_lost: !stage.is_lost, is_won: false })}
                              className={cn(
                                "text-xs px-2 py-0.5 rounded-full border transition-colors",
                                stage.is_lost
                                  ? "bg-red-500/15 border-red-500 text-red-600 font-semibold"
                                  : "border-border text-muted-foreground hover:border-red-500/50"
                              )}
                            >
                              הפסד
                            </button>
                          </div>

                          {/* Delete */}
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive"
                            onClick={() => setDeleteTarget(stage)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      )}
                    </Draggable>
                  ))}
                  {provided.placeholder}
                </div>
              )}
            </Droppable>
          </DragDropContext>

          {stages.length === 0 && (
            <div className="text-center py-8 text-muted-foreground text-sm">
              אין שלבים עדיין — לחץ "הוסף שלב" כדי להתחיל
            </div>
          )}
        </CardContent>
      </Card>

      {/* Legend */}
      <div className="text-xs text-muted-foreground space-y-1 pr-1">
        <p>• לחץ על עיגול הצבע כדי לשנות את צבע השלב</p>
        <p>• סמן <span className="text-emerald-600 font-medium">ניצחון</span> לשלב סגירה, <span className="text-red-500 font-medium">הפסד</span> לשלב כישלון</p>
        <p>• גרור את ⠿ לשינוי סדר השלבים • לחץ "שמור שינויים" לאחר כל עדכון</p>
      </div>

      {/* Delete Stage Dialog */}
      <Dialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>מחיקת שלב</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            האם למחוק את השלב <span className="font-semibold text-foreground">"{deleteTarget?.name}"</span>?
            לידים שנמצאים בשלב זה לא יימחקו אך יאבדו את השיוך לשלב.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>ביטול</Button>
            <Button variant="destructive" onClick={handleDeleteStage} disabled={deleting}>
              {deleting ? "מוחק..." : "מחק שלב"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
