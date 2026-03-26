"use client"

import { useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { useBusiness } from "@/lib/hooks/useBusiness"
import { usePipelinesQuery } from "@/lib/hooks/queries"
import { useQueryClient } from "@tanstack/react-query"
import { queryKeys } from "@/lib/hooks/queries"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Kanban, Plus, Trash2, ChevronLeft, Pencil } from "lucide-react"
import { toast } from "sonner"
import { CardGridSkeleton } from "@/components/ui/skeletons"
import type { Database } from "@/types/database.types"

type Pipeline = Database["public"]["Tables"]["pipelines"]["Row"]
type Stage = Database["public"]["Tables"]["stages"]["Row"]

interface PipelineWithStages extends Pipeline {
  stages: Stage[]
}

export default function PipelinesPage() {
  const { businessId } = useBusiness()
  const queryClient = useQueryClient()
  const supabase = createClient()

  // Single query that fetches pipelines + stages embedded (replaces N+1 loop)
  const { data: pipelinesData, isPending: loading } = usePipelinesQuery(businessId)
  const pipelines = (pipelinesData ?? []) as unknown as PipelineWithStages[]

  const [showCreate, setShowCreate] = useState(false)
  const [newName, setNewName] = useState("")
  const [newDesc, setNewDesc] = useState("")
  const [creating, setCreating] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<PipelineWithStages | null>(null)
  const [deleting, setDeleting] = useState(false)

  const invalidatePipelines = () => {
    if (businessId) queryClient.invalidateQueries({ queryKey: queryKeys.pipelines.all(businessId) })
  }

  const handleCreate = async () => {
    if (!businessId || !newName.trim()) return
    setCreating(true)
    try {
      const { data: pipeline, error } = await supabase
        .from("pipelines")
        .insert({ business_id: businessId, name: newName.trim(), description: newDesc.trim() || null })
        .select()
        .single()

      if (error) throw error

      const { data: bizData } = await supabase
        .from("businesses")
        .select("default_pipeline_stages")
        .eq("id", businessId)
        .single()

      const defaultStages = (bizData?.default_pipeline_stages as any[]) ?? [
        { name: "ליד חדש", position: 0, color: "#94a3b8", probability: 10, is_won: false, is_lost: false },
        { name: "נוצר קשר", position: 1, color: "#60a5fa", probability: 20, is_won: false, is_lost: false },
        { name: "ליד איכותי", position: 2, color: "#38bdf8", probability: 40, is_won: false, is_lost: false },
        { name: "הצעה נשלחה", position: 3, color: "#22d3ee", probability: 60, is_won: false, is_lost: false },
        { name: "משא ומתן", position: 4, color: "#2dd4bf", probability: 80, is_won: false, is_lost: false },
        { name: "סגירה / הצלחה", position: 5, color: "#34d399", probability: 100, is_won: true, is_lost: false },
        { name: "הפסד", position: 6, color: "#f87171", probability: 0, is_won: false, is_lost: true },
      ]

      await supabase.from("stages").insert(
        defaultStages.map((s: any, i: number) => ({
          pipeline_id: pipeline.id,
          name: s.name,
          position: i,
          color: s.color,
          probability: s.probability,
          is_won: s.is_won,
          is_lost: s.is_lost,
        }))
      )

      toast.success("הפייפליין נוצר בהצלחה")
      setShowCreate(false)
      setNewName("")
      setNewDesc("")
      invalidatePipelines()
    } catch {
      toast.error("שגיאה ביצירת הפייפליין")
    } finally {
      setCreating(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      await supabase.from("stages").delete().eq("pipeline_id", deleteTarget.id)
      const { error } = await supabase.from("pipelines").delete().eq("id", deleteTarget.id)
      if (error) throw error
      toast.success("הפייפליין נמחק")
      setDeleteTarget(null)
      invalidatePipelines()
    } catch {
      toast.error("שגיאה במחיקת הפייפליין")
    } finally {
      setDeleting(false)
    }
  }

  if (!businessId) return null

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Kanban className="h-6 w-6 text-primary" />
          <div>
            <h1 className="text-2xl font-bold tracking-tight">פייפליינים</h1>
            <p className="text-muted-foreground text-sm">נהל את שלבי המכירה שלך</p>
          </div>
        </div>
        <Button onClick={() => setShowCreate(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          פייפליין חדש
        </Button>
      </div>

      {loading ? (
        <CardGridSkeleton cards={6} />
      ) : pipelines.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="h-16 w-16 rounded-2xl bg-muted flex items-center justify-center mb-4">
            <Kanban className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="font-bold text-lg">אין פייפליינים עדיין</h3>
          <p className="text-muted-foreground text-sm mt-1 mb-4">צור פייפליין ראשון כדי להתחיל לנהל לידים</p>
          <Button onClick={() => setShowCreate(true)} className="gap-2">
            <Plus className="h-4 w-4" />
            פייפליין חדש
          </Button>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {pipelines.map((pipeline) => {
            const wonStages = pipeline.stages.filter((s) => s.is_won).length
            const lostStages = pipeline.stages.filter((s) => s.is_lost).length
            const activeStages = pipeline.stages.length - wonStages - lostStages
            return (
              <Card key={pipeline.id} className="group hover:border-primary/40 transition-colors">
                <CardHeader className="flex flex-row items-start justify-between pb-3">
                  <div className="flex-1 min-w-0">
                    <CardTitle className="text-base font-bold truncate">{pipeline.name}</CardTitle>
                    {pipeline.description && (
                      <p className="text-sm text-muted-foreground mt-0.5 truncate">{pipeline.description}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive hover:text-destructive/80 hover:bg-destructive/10"
                      onClick={(e) => { e.preventDefault(); setDeleteTarget(pipeline) }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex flex-wrap gap-1.5">
                    {pipeline.stages.slice(0, 5).map((s) => (
                      <span
                        key={s.id}
                        className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border"
                        style={{ borderColor: s.color ?? "#94a3b8", color: s.color ?? "#94a3b8", backgroundColor: `${s.color ?? "#94a3b8"}15` }}
                      >
                        {s.name}
                        {s.is_won && " ✓"}
                        {s.is_lost && " ✕"}
                      </span>
                    ))}
                    {pipeline.stages.length > 5 && (
                      <span className="text-xs text-muted-foreground px-1">+{pipeline.stages.length - 5} נוספים</span>
                    )}
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <div className="flex gap-3 text-xs text-muted-foreground">
                      <span>{activeStages} שלבים</span>
                      {wonStages > 0 && <span className="text-emerald-600">{wonStages} ניצחון</span>}
                      {lostStages > 0 && <span className="text-red-500">{lostStages} הפסד</span>}
                    </div>
                    <Link href={`/pipelines/${pipeline.id}`}>
                      <Button variant="outline" size="sm" className="gap-1.5 h-7 text-xs">
                        <Pencil className="h-3 w-3" />
                        ערוך שלבים
                        <ChevronLeft className="h-3 w-3" />
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* Create Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>פייפליין חדש</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">שם הפייפליין</label>
              <Input
                placeholder="לדוגמה: פייפליין מכירות ראשי"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleCreate()}
                autoFocus
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">תיאור (אופציונלי)</label>
              <Textarea
                placeholder="תיאור קצר..."
                value={newDesc}
                onChange={(e) => setNewDesc(e.target.value)}
                rows={2}
              />
            </div>
            <p className="text-xs text-muted-foreground">השלבים ייווצרו אוטומטית על פי שלבי ברירת המחדל</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)}>ביטול</Button>
            <Button onClick={handleCreate} disabled={creating || !newName.trim()}>
              {creating ? "יוצר..." : "צור פייפליין"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm Dialog */}
      <Dialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>מחיקת פייפליין</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            האם למחוק את הפייפליין <span className="font-semibold text-foreground">"{deleteTarget?.name}"</span>?
            פעולה זו תמחק את כל השלבים שלו ואינה ניתנת לביטול.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>ביטול</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
              {deleting ? "מוחק..." : "מחק פייפליין"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
