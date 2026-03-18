"use client"

import { useParams } from "next/navigation"
import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { useBusiness } from "@/lib/hooks/useBusiness"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ArrowRight, CheckCircle, XCircle, MinusCircle } from "lucide-react"
import Link from "next/link"
import type { Database } from "@/types/database.types"

type AutomationRun = Database["public"]["Tables"]["automation_runs"]["Row"]
type AutomationRunStep = Database["public"]["Tables"]["automation_run_steps"]["Row"]
type AutomationNode = Database["public"]["Tables"]["automation_nodes"]["Row"]

export default function AutomationRunDetailPage() {
  const params = useParams()
  const { businessId } = useBusiness()
  const runId = params.id as string
  const supabase = createClient()

  const [run, setRun] = useState<AutomationRun | null>(null)
  const [steps, setSteps] = useState<AutomationRunStep[]>([])
  const [nodes, setNodes] = useState<Record<string, AutomationNode>>({})
  const [automationName, setAutomationName] = useState<string>("")
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!businessId || !runId) return
    async function load() {
      const { data: runData, error: runErr } = await supabase
        .from("automation_runs")
        .select("*")
        .eq("id", runId)
        .eq("business_id", businessId)
        .single()

      if (runErr || !runData) {
        setLoading(false)
        return
      }
      setRun(runData)

      const { data: autoData } = await supabase
        .from("automations")
        .select("name")
        .eq("id", runData.automation_id)
        .single()
      setAutomationName((autoData as { name: string } | null)?.name ?? "")

      const { data: stepsData } = await supabase
        .from("automation_run_steps")
        .select("*")
        .eq("automation_run_id", runId)
        .order("created_at", { ascending: true })
      setSteps(stepsData ?? [])

      const stepList = stepsData ?? []
      const nodeIds = [...new Set(stepList.map((s) => s.node_id))]
      if (nodeIds.length > 0) {
        const { data: nodesData } = await supabase
          .from("automation_nodes")
          .select("*")
          .in("id", nodeIds)
        const map: Record<string, AutomationNode> = {}
        for (const n of nodesData ?? []) {
          map[n.id] = n
        }
        setNodes(map)
      }
      setLoading(false)
    }
    load()
  }, [businessId, runId, supabase])

  if (!businessId) return null
  if (loading) {
    return (
      <div className="flex min-h-[200px] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    )
  }
  if (!run) {
    return (
      <div className="space-y-4">
        <p className="text-muted-foreground">הרצה לא נמצאה.</p>
        <Button asChild variant="outline">
          <Link href="/automations">חזרה לאוטומציות</Link>
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button asChild variant="ghost" size="sm">
          <Link href="/automations">
            <ArrowRight className="h-4 w-4 ml-2" />
            חזרה לאוטומציות
          </Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>פרטי הרצה</CardTitle>
          <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            <span>{automationName}</span>
            <span>•</span>
            <span>
              {run.entity_type} / {run.entity_id}
            </span>
            <span>•</span>
            <Badge
              variant={
                run.status === "completed"
                  ? "default"
                  : run.status === "failed"
                    ? "destructive"
                    : "secondary"
              }
            >
              {run.status}
            </Badge>
            <span>•</span>
            <span>
              התחלה:{" "}
              {run.started_at
                ? new Date(run.started_at).toLocaleString("he-IL")
                : "-"}
            </span>
            {run.finished_at && (
              <>
                <span>•</span>
                <span>
                  סיום: {new Date(run.finished_at).toLocaleString("he-IL")}
                </span>
              </>
            )}
          </div>
        </CardHeader>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>צעדים</CardTitle>
        </CardHeader>
        <CardContent>
          {steps.length === 0 ? (
            <p className="text-muted-foreground py-4">אין צעדים בריצה זו.</p>
          ) : (
            <ul className="space-y-4">
              {steps.map((step, i) => {
                const node = nodes[step.node_id]
                const label = node
                  ? `${node.type}: ${node.subtype}`
                  : step.node_id.slice(0, 8)
                return (
                  <li
                    key={step.id}
                    className="rounded-lg border p-4 space-y-2"
                  >
                    <div className="flex items-center gap-2">
                      {step.status === "success" ? (
                        <CheckCircle className="h-5 w-5 text-emerald-500" />
                      ) : step.status === "failed" ? (
                        <XCircle className="h-5 w-5 text-destructive" />
                      ) : (
                        <MinusCircle className="h-5 w-5 text-muted-foreground" />
                      )}
                      <span className="font-medium">{label}</span>
                      <Badge
                        variant={
                          step.status === "success"
                            ? "default"
                            : step.status === "failed"
                              ? "destructive"
                              : "secondary"
                        }
                      >
                        {step.status}
                      </Badge>
                    </div>
                    {step.error_message && (
                      <pre className="text-destructive text-sm bg-destructive/10 p-2 rounded overflow-auto">
                        {step.error_message}
                      </pre>
                    )}
                    {Object.keys(step.input_payload ?? {}).length > 0 && (
                      <details className="text-sm">
                        <summary className="cursor-pointer text-muted-foreground">
                          Input payload
                        </summary>
                        <pre className="mt-1 p-2 bg-muted rounded overflow-auto max-h-40">
                          {JSON.stringify(step.input_payload, null, 2)}
                        </pre>
                      </details>
                    )}
                    {Object.keys(step.output_payload ?? {}).length > 0 && (
                      <details className="text-sm">
                        <summary className="cursor-pointer text-muted-foreground">
                          Output payload
                        </summary>
                        <pre className="mt-1 p-2 bg-muted rounded overflow-auto max-h-40">
                          {JSON.stringify(step.output_payload, null, 2)}
                        </pre>
                      </details>
                    )}
                  </li>
                )
              })}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
