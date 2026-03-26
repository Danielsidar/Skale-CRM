"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { useBusiness } from "@/lib/hooks/useBusiness"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ArrowRight, Plus, Trash2, Save, ExternalLink } from "lucide-react"
import { toast } from "sonner"

const SYSTEM_DEFAULT_STAGES = [
  { name: "ליד חדש", position: 0, color: "#94a3b8", probability: 10, is_won: false, is_lost: false },
  { name: "נוצר קשר", position: 1, color: "#60a5fa", probability: 20, is_won: false, is_lost: false },
  { name: "ליד איכותי", position: 2, color: "#38bdf8", probability: 40, is_won: false, is_lost: false },
  { name: "הצעה נשלחה", position: 3, color: "#22d3ee", probability: 60, is_won: false, is_lost: false },
  { name: "משא ומתן", position: 4, color: "#2dd4bf", probability: 80, is_won: false, is_lost: false },
  { name: "סגירה / הצלחה", position: 5, color: "#34d399", probability: 100, is_won: true, is_lost: false },
  { name: "הפסד", position: 6, color: "#f87171", probability: 0, is_won: false, is_lost: true },
]

export default function SettingsPipelinesPage() {
  const { businessId } = useBusiness()
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

      setDefaultStages(
        bizData?.default_pipeline_stages
          ? (bizData.default_pipeline_stages as any[])
          : SYSTEM_DEFAULT_STAGES
      )
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
    const filtered = defaultStages.filter((_, i) => i !== index)
    setDefaultStages(filtered.map((s, i) => ({ ...s, position: i })))
  }

  const updateDefaultStage = (index: number, updates: any) => {
    const updated = [...defaultStages]
    updated[index] = { ...updated[index], ...updates }
    setDefaultStages(updated)
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
          <h1 className="text-2xl font-bold tracking-tight">שלבי ברירת מחדל</h1>
          <p className="text-muted-foreground text-sm">שלבים אלו יתווספו לכל פייפליין חדש שתיצור</p>
        </div>
      </div>

      <div className="flex items-center justify-between p-4 rounded-lg border bg-muted/30">
        <div>
          <p className="text-sm font-medium">לניהול פייפליינים קיימים</p>
          <p className="text-xs text-muted-foreground">הוסף, ערוך ומחק פייפליינים ושלבים</p>
        </div>
        <Button variant="outline" size="sm" asChild className="gap-2">
          <Link href="/pipelines">
            <ExternalLink className="h-4 w-4" />
            פתח ניהול פייפליינים
          </Link>
        </Button>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-base font-bold">שלבי ברירת מחדל</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              יתווספו אוטומטית לכל פייפליין חדש
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={addDefaultStage} className="gap-2">
            <Plus className="h-4 w-4" />
            הוסף שלב
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            {defaultStages.map((stage, index) => (
              <div
                key={index}
                className="flex items-center gap-3 bg-muted/30 p-3 rounded-lg border border-border"
              >
                <div className="flex-1 flex items-center gap-3">
                  <span className="text-xs font-bold text-muted-foreground w-4">{index + 1}.</span>
                  <span className="h-3 w-3 rounded-full shrink-0" style={{ backgroundColor: stage.color }} />
                  <input
                    className="bg-transparent border-none focus:ring-0 text-sm font-medium flex-1 outline-none"
                    value={stage.name}
                    onChange={(e) => updateDefaultStage(index, { name: e.target.value })}
                    placeholder="שם השלב"
                  />
                </div>
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      className="bg-background border rounded px-2 py-1 text-xs w-14 text-center"
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

          <div className="flex justify-end pt-2">
            <Button onClick={saveDefaultStages} disabled={savingDefaults} className="gap-2">
              <Save className="h-4 w-4" />
              {savingDefaults ? "שומר..." : "שמור שינויים"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
