"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { useBusiness } from "@/lib/hooks/useBusiness"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Plus, Zap, History } from "lucide-react"
import Link from "next/link"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import type { Database } from "@/types/database.types"

type AutomationRule = Database["public"]["Tables"]["automation_rules"]["Row"]
type AutomationRuleRun = Database["public"]["Tables"]["automation_rule_runs"]["Row"]

export default function AutomationsSettingsPage() {
  const { businessId } = useBusiness()
  const [rules, setRules] = useState<AutomationRule[]>([])
  const [runs, setRuns] = useState<AutomationRuleRun[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    if (!businessId) return
    async function load() {
      const { data: rulesData } = await supabase
        .from("automation_rules")
        .select("*")
        .eq("business_id", businessId)
        .order("created_at", { ascending: false })
      setRules(rulesData ?? [])

      const ids = (rulesData ?? []).map((r) => r.id)
      if (ids.length > 0) {
        const { data: runsData } = await supabase
          .from("automation_rule_runs")
          .select("*")
          .in("automation_rule_id", ids)
          .order("created_at", { ascending: false })
          .limit(50)
        setRuns(runsData ?? [])
      } else {
        setRuns([])
      }
      setLoading(false)
    }
    load()
  }, [businessId, supabase])

  if (!businessId) return null

  if (loading) {
    return (
      <div className="flex min-h-[200px] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    )
  }

  const getRuleName = (ruleId: string) => rules.find((r) => r.id === ruleId)?.name ?? ruleId.slice(0, 8)

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">אוטומציות</h1>
        <p className="text-muted-foreground text-sm mt-1">
          הגדר כללים שיפעלו אוטומטית לפי טריגרים (למשל שינוי שלב עיסקה).
        </p>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5" />
            כללי אוטומציה
          </CardTitle>
          <Button asChild size="sm">
            <Link href="/settings/automations/new">
              <Plus className="h-4 w-4 ml-2" />
              כלל חדש
            </Link>
          </Button>
        </CardHeader>
        <CardContent>
          {rules.length === 0 ? (
            <p className="text-muted-foreground text-sm py-4">אין כללים. צור כלל שיפעל למשל בעת שינוי שלב עיסקה.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-right">שם</TableHead>
                  <TableHead className="text-right">טריגר</TableHead>
                  <TableHead className="text-right">סטטוס</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rules.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium">{r.name}</TableCell>
                    <TableCell className="text-muted-foreground">{r.trigger_type}</TableCell>
                    <TableCell>
                      {r.active ? (
                        <Badge variant="default" className="bg-emerald-600">פעיל</Badge>
                      ) : (
                        <Badge variant="secondary">כבוי</Badge>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            היסטוריית הרצות
          </CardTitle>
        </CardHeader>
        <CardContent>
          {runs.length === 0 ? (
            <p className="text-muted-foreground text-sm py-4">אין הרצות עדיין.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-right">כלל</TableHead>
                  <TableHead className="text-right">ישות</TableHead>
                  <TableHead className="text-right">סטטוס</TableHead>
                  <TableHead className="text-right">תאריך</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {runs.slice(0, 20).map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium">{getRuleName(r.automation_rule_id)}</TableCell>
                    <TableCell className="text-muted-foreground">{r.entity_type} / {r.entity_id.slice(0, 8)}…</TableCell>
                    <TableCell>
                      <Badge variant={r.status === "success" ? "default" : "secondary"}>
                        {r.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {new Date(r.created_at!).toLocaleString("he-IL")}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
