"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { useBusiness } from "@/lib/hooks/useBusiness"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ArrowRight, Layers, Plus, Trash2, Save } from "lucide-react"
import type { Database } from "@/types/database.types"
import { toast } from "sonner"
const SYSTEM_DEFAULT_STAGES = [
  { name: 'ליד חדש',        position: 0, color: '#94a3b8', probability: 10,  is_won: false, is_lost: false },
  { name: 'נוצר קשר',      position: 1, color: '#60a5fa', probability: 20,  is_won: false, is_lost: false },
  { name: 'ליד איכותי',      position: 2, color: '#38bdf8', probability: 40,  is_won: false, is_lost: false },
  { name: 'הצעה נשלחה',  position: 3, color: '#22d3ee', probability: 60,  is_won: false, is_lost: false },
  { name: 'משא ומתן',    position: 4, color: '#2dd4bf', probability: 80,  is_won: false, is_lost: false },
  { name: 'סגירה / הצלחה',            position: 5, color: '#34d399', probability: 100, is_won: true,  is_lost: false },
  { name: 'הפסד',           position: 6, color: '#f87171', probability: 0,   is_won: false, is_lost: true }
]

type Pipeline = Database["public"]["Tables"]["pipelines"]["Row"]
type Stage = Database["public"]["Tables"]["stages"]["Row"]

interface PipelineWithStages extends Pipeline {
  stages: Stage[]
}

export default function SettingsPipelinesPage() {
  const { businessId } = useBusiness()
  const [pipelines, setPipelines] = useState<PipelineWithStages[]>([])
  const [defaultStages, setDefaultStages] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [savingDefaults, setSavingDefaults] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    if (!businessId) return
    async function load() {
      const { data: bizData } = await supabase
        .from("businesses")
        .select("default_pipeline_stages")
        .eq("id", businessId)
        .single()

      if (bizData?.default_pipeline_stages) {
        setDefaultStages(bizData.default_pipeline_stages as any[])
      } else {
        setDefaultStages(SYSTEM_DEFAULT_STAGES)
      }

      const { data: pipelineRows } = await supabase
        .from("pipelines")
        .select("*")
        .eq("business_id", businessId)
        .order("created_at", { ascending: false })

      const withStages: PipelineWithStages[] = []
      for (const p of pipelineRows ?? []) {
        const { data: stages } = await supabase
          .from("stages")
          .select("*")
          .eq("pipeline_id", p.id)
          .order("position", { ascending: true })
        withStages.push({ ...p, stages: stages ?? [] })
      }
      setPipelines(withStages)
      setLoading(false)
    }
    load()
  }, [businessId, supabase])

  const saveDefaultStages = async () => {
    if (!businessId) return
    setSavingDefaults(true)
    try {
      const { error } = await supabase
        .from("businesses")
        .update({ default_pipeline_stages: defaultStages })
        .eq("id", businessId)

      if (error) throw error
      toast.success("שלבי ברירת המחדל עודכנו בהצלחה")
    } catch (err) {
      toast.error("שגיאה בעדכון שלבי ברירת המחדל")
      console.error(err)
    } finally {
      setSavingDefaults(false)
    }
  }

  const addDefaultStage = () => {
    const newStage = {
      name: "שלב חדש",
      position: defaultStages.length,
      color: "#94a3b8",
      probability: 50,
      is_won: false,
      is_lost: false,
    }
    setDefaultStages([...defaultStages, newStage])
  }

  const removeDefaultStage = (index: number) => {
    const newStages = defaultStages.filter((_, i) => i !== index)
    // Update positions
    const updated = newStages.map((s, i) => ({ ...s, position: i }))
    setDefaultStages(updated)
  }

  const updateDefaultStage = (index: number, updates: any) => {
    const newStages = [...defaultStages]
    newStages[index] = { ...newStages[index], ...updates }
    setDefaultStages(newStages)
  }

  if (!businessId) return null

  if (loading) {
    return (
      <div className="flex min-h-[200px] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" className="h-9 w-9 rounded-lg" asChild>
          <Link href="/settings">
            <ArrowRight className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">שלבי לידים</h1>
          <p className="text-muted-foreground text-sm">ניהול שלבי ברירת מחדל ללידים</p>
        </div>
      </div>

      <div className="space-y-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-lg font-bold text-right">שלבי ברירת מחדל</CardTitle>
              <p className="text-sm text-muted-foreground text-right mt-1">שלבים אלו יתווספו אוטומטית לכל פייפליין חדש שתפתח</p>
            </div>
            <Button variant="outline" size="sm" onClick={addDefaultStage} className="gap-2">
              <Plus className="h-4 w-4" />
              הוסף שלב
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              {defaultStages.map((stage, index) => (
                <div key={index} className="flex items-center gap-3 bg-muted/30 p-3 rounded-lg border border-border">
                  <div className="flex-1 flex items-center gap-3">
                    <span className="text-xs font-bold text-muted-foreground w-4">{index + 1}.</span>
                    <input
                      className="bg-transparent border-none focus:ring-0 text-sm font-medium flex-1 outline-none"
                      value={stage.name}
                      onChange={(e) => updateDefaultStage(index, { name: e.target.value })}
                      placeholder="שם השלב"
                    />
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <label className="text-[10px] text-muted-foreground uppercase">הסתברות</label>
                      <input
                        type="number"
                        className="bg-background border rounded px-2 py-1 text-xs w-16"
                        value={stage.probability}
                        onChange={(e) => updateDefaultStage(index, { probability: parseInt(e.target.value) || 0 })}
                      />
                      <span className="text-xs text-muted-foreground">%</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={stage.is_won}
                        onChange={(e) => updateDefaultStage(index, { is_won: e.target.checked, is_lost: false })}
                        className="rounded border-gray-300 text-primary focus:ring-primary"
                      />
                      <label className="text-xs">ניצחון</label>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={stage.is_lost}
                        onChange={(e) => updateDefaultStage(index, { is_lost: e.target.checked, is_won: false })}
                        className="rounded border-gray-300 text-primary focus:ring-primary"
                      />
                      <label className="text-xs">הפסד</label>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive hover:text-destructive/80"
                      onClick={() => removeDefaultStage(index)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex justify-end pt-4">
              <Button onClick={saveDefaultStages} disabled={savingDefaults} className="gap-2">
                <Save className="h-4 w-4" />
                {savingDefaults ? "שומר..." : "שמור שינויים"}
              </Button>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-4 pt-4 border-t">
          <h2 className="text-lg font-bold">פייפליינים קיימים</h2>
          {pipelines.map((pipeline) => (
            <Card key={pipeline.id}>
              <CardHeader className="flex flex-row items-center justify-between py-4">
                <CardTitle className="text-base font-semibold">{pipeline.name}</CardTitle>
              </CardHeader>
              <CardContent className="pb-4">
                <div className="flex flex-wrap gap-2">
                  {pipeline.stages.map((s, i) => (
                    <span
                      key={s.id}
                      className="inline-flex items-center gap-1.5 text-xs px-2 py-1 rounded-md bg-muted border border-border"
                    >
                      <span
                        className="h-2 w-2 rounded-full"
                        style={{ backgroundColor: s.color || "#94a3b8" }}
                      />
                      {i + 1}. {s.name}
                      {s.is_won && <span className="text-emerald-600 font-medium">(ניצחון)</span>}
                      {s.is_lost && <span className="text-red-600 font-medium">(הפסד)</span>}
                    </span>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  )
}
