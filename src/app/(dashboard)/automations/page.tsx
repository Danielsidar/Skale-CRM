"use client"

import { useEffect, useState, useRef, useCallback, Suspense } from "react"
import { createPortal } from "react-dom"
import { useRouter, useSearchParams } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { useBusiness } from "@/lib/hooks/useBusiness"
import { useTierFeatures } from "@/lib/hooks/useTierFeatures"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Plus,
  Zap,
  Play,
  Pause,
  History,
  Trash2,
  MoreVertical,
  Copy,
  Lock,
  Tag,
  X,
  Pencil,
  Check,
  FileText,
  RefreshCw,
} from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import Link from "next/link"
import type { Database } from "@/types/database.types"
import { toast } from "sonner"
import {
  NewAutomationChoiceDialog,
  SimpleAutomationDialog,
  SimpleAutomationEditDialog,
} from "@/components/automation"

type Automation = Database["public"]["Tables"]["automations"]["Row"]
type AutomationRun = Database["public"]["Tables"]["automation_runs"]["Row"]
type AutomationRunStep = Database["public"]["Tables"]["automation_run_steps"]["Row"]
type Category = Database["public"]["Tables"]["automation_folders"]["Row"]

type AutomationLogRow = {
  step: AutomationRunStep
  run: Pick<
    AutomationRun,
    "id" | "automation_id" | "entity_type" | "entity_id" | "status" | "started_at"
  >
  automationName: string
  nodeType: string | null
  nodeSubtype: string | null
}

function summarizeWhatsappFromOutput(output: unknown): string | null {
  if (!output || typeof output !== "object") return null
  const w = (output as Record<string, unknown>).whatsapp_send
  if (!w || typeof w !== "object") return null
  const o = w as Record<string, unknown>
  const parts: string[] = []
  if (o.provider) parts.push(String(o.provider))
  if (o.ok === false && o.error) parts.push(String(o.error))
  if (o.response_preview) parts.push(String(o.response_preview).slice(0, 160))
  return parts.length ? parts.join(" · ") : null
}

// ── Inline category combobox ──────────────────────────────────────────────────
function CategoryCombobox({
  categories,
  value,
  onChange,
  onCreateAndAssign,
}: {
  categories: Category[]
  value: string | null
  onChange: (id: string | null) => void
  onCreateAndAssign: (name: string) => Promise<void>
}) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState("")
  const [dropdownPos, setDropdownPos] = useState({ top: 0, left: 0, width: 208 })
  const triggerRef = useRef<HTMLButtonElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const current = categories.find(c => c.id === value)

  const filtered = categories.filter(c =>
    c.name.toLowerCase().includes(query.toLowerCase())
  )
  const showCreate = query.trim() && !categories.some(
    c => c.name.toLowerCase() === query.trim().toLowerCase()
  )

  const updatePos = useCallback(() => {
    if (triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect()
      setDropdownPos({
        top: rect.bottom + window.scrollY + 4,
        left: rect.left + window.scrollX,
        width: Math.max(rect.width, 200)
      })
    }
  }, [])

  useEffect(() => {
    if (open) {
      updatePos()
      window.addEventListener("scroll", updatePos, true)
      window.addEventListener("resize", updatePos)
      setTimeout(() => inputRef.current?.focus(), 10)
    }
    return () => {
      window.removeEventListener("scroll", updatePos, true)
      window.removeEventListener("resize", updatePos)
    }
  }, [open, updatePos])

  const select = (id: string | null) => {
    onChange(id)
    setOpen(false)
    setQuery("")
  }

  const create = async () => {
    if (!query.trim()) return
    await onCreateAndAssign(query.trim())
    setOpen(false)
    setQuery("")
  }

  const dropdown = open ? (
    <div
      ref={dropdownRef}
      style={{ position: "absolute", top: dropdownPos.top, left: dropdownPos.left, width: dropdownPos.width, zIndex: 9999 }}
      className="rounded-lg border bg-popover shadow-lg overflow-hidden"
    >
      <div className="p-2 border-b">
        <input
          ref={inputRef}
          value={query}
          onChange={e => setQuery(e.target.value)}
          onKeyDown={e => {
            if (e.key === "Enter") { showCreate ? create() : (filtered[0] && select(filtered[0].id)) }
            if (e.key === "Escape") setOpen(false)
          }}
          placeholder="חפש או צור קטגוריה..."
          className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground text-right"
          dir="rtl"
        />
      </div>
      <div className="max-h-48 overflow-y-auto py-1">
        {value !== null && (
          <button
            onClick={() => select(null)}
            className="flex w-full items-center gap-2 px-3 py-1.5 text-sm hover:bg-muted text-right text-muted-foreground"
          >
            <X className="h-3.5 w-3.5 shrink-0" />
            הסר קטגוריה
          </button>
        )}
        {filtered.length === 0 && !showCreate && (
          <p className="px-3 py-2 text-xs text-muted-foreground text-right">אין תוצאות</p>
        )}
        {filtered.map(c => (
          <button
            key={c.id}
            onClick={() => select(c.id)}
            className="flex w-full items-center justify-between px-3 py-1.5 text-sm hover:bg-muted text-right"
          >
            <span>{c.name}</span>
            {c.id === value && <Check className="h-3.5 w-3.5 text-primary shrink-0" />}
          </button>
        ))}
        {showCreate && (
          <button
            onClick={create}
            className="flex w-full items-center gap-2 px-3 py-1.5 text-sm hover:bg-muted text-primary font-medium text-right border-t mt-1"
          >
            <Plus className="h-3.5 w-3.5 shrink-0" />
            צור &quot;{query.trim()}&quot;
          </button>
        )}
      </div>
    </div>
  ) : null

  return (
    <>
      <button
        ref={triggerRef}
        onClick={() => setOpen(!open)}
        className={`inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium border transition-colors ${
          current ? "bg-slate-50 border-slate-200 text-slate-700" : "bg-transparent border-dashed border-slate-300 text-slate-400 hover:border-slate-400 hover:text-slate-600"
        }`}
      >
        <Tag className="h-3 w-3" />
        <span>{current?.name || "+ הוסף קטגוריה"}</span>
      </button>
      {typeof document !== "undefined" && dropdown ? createPortal(dropdown, document.body) : null}
    </>
  )
}

function AutomationsListPageInner() {
  const { businessId } = useBusiness()
  const { features, loading: featuresLoading } = useTierFeatures()
  const router = useRouter()
  const searchParams = useSearchParams()
  const [automations, setAutomations] = useState<Automation[]>([])
  const [runs, setRuns] = useState<AutomationRun[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [activeCategoryId, setActiveCategoryId] = useState<string | "all">("all")
  const [automationMainTab, setAutomationMainTab] = useState("list")
  const [logRows, setLogRows] = useState<AutomationLogRow[]>([])
  const [logsLoading, setLogsLoading] = useState(false)
  const [logDetailRow, setLogDetailRow] = useState<AutomationLogRow | null>(null)

  // Category dialog state
  const [isCategoryDialogOpen, setIsCategoryDialogOpen] = useState(false)
  const [newCategoryName, setNewCategoryName] = useState("")
  const [editingCategory, setEditingCategory] = useState<Category | null>(null)

  const [newChoiceOpen, setNewChoiceOpen] = useState(false)
  const [simpleCreateOpen, setSimpleCreateOpen] = useState(false)
  const [simpleEditId, setSimpleEditId] = useState<string | null>(null)
  const [creatingComplex, setCreatingComplex] = useState(false)

  const [editingNameId, setEditingNameId] = useState<string | null>(null)
  const [editingNameValue, setEditingNameValue] = useState("")

  const supabase = createClient()

  const spKey = searchParams.toString()
  useEffect(() => {
    const params = new URLSearchParams(spKey)
    const wantNew = params.get("new") === "1"
    const editId = params.get("simpleEdit")
    const uuidRe = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    if (!wantNew && !editId) return
    if (wantNew) setNewChoiceOpen(true)
    if (editId && uuidRe.test(editId)) setSimpleEditId(editId)
    router.replace("/automations", { scroll: false })
  }, [spKey, router])

  useEffect(() => {
    if (!businessId) return
    loadData()
  }, [businessId])

  async function loadData() {
    setLoading(true)
    // Parallelize all three independent queries
    const [autoResult, catResult, runsResult] = await Promise.all([
      supabase
        .from("automations")
        .select("*")
        .eq("business_id", businessId!)
        .order("updated_at", { ascending: false }),
      supabase
        .from("automation_folders")
        .select("*")
        .eq("business_id", businessId!)
        .order("name", { ascending: true }),
      supabase
        .from("automation_runs")
        .select("*")
        .eq("business_id", businessId!)
        .order("started_at", { ascending: false })
        .limit(50),
    ])
    setAutomations(autoResult.data ?? [])
    setCategories(catResult.data ?? [])
    setRuns(runsResult.data ?? [])
    setLoading(false)
  }

  const startComplexAutomation = useCallback(async () => {
    if (!businessId || creatingComplex || featuresLoading) return
    if (!features.automations) {
      toast.error("אוטומציות לא זמינות במסלול שלך")
      return
    }
    if (features.max_automations !== null) {
      const { count } = await supabase
        .from("automations")
        .select("*", { count: "exact", head: true })
        .eq("business_id", businessId)
      if (count !== null && count >= features.max_automations) {
        toast.error(`הגעת למגבלת האוטומציות (${features.max_automations})`)
        return
      }
    }
    setCreatingComplex(true)
    try {
      const { data, error } = await supabase
        .from("automations")
        .insert({
          business_id: businessId,
          name: "אוטומציה חדשה",
          status: "draft",
          version: 1,
          is_simple: false,
        })
        .select("id")
        .single()
      if (error || !data?.id) {
        toast.error("לא ניתן ליצור אוטומציה")
        return
      }
      router.push(`/automations/${data.id}/builder`)
    } finally {
      setCreatingComplex(false)
    }
  }, [businessId, creatingComplex, features.automations, features.max_automations, featuresLoading, router, supabase])

  const loadAutomationLogs = useCallback(async () => {
    if (!businessId) return
    setLogsLoading(true)
    try {
      const { data: runsData, error: runsErr } = await supabase
        .from("automation_runs")
        .select("id, automation_id, entity_type, entity_id, status, started_at")
        .eq("business_id", businessId)
        .order("started_at", { ascending: false })
        .limit(100)

      if (runsErr || !runsData?.length) {
        setLogRows([])
        return
      }

      const runIds = runsData.map((r) => r.id)
      const autoIds = [...new Set(runsData.map((r) => r.automation_id))]

      // Fetch steps and automation names in parallel
      const [stepsResult, autosResult] = await Promise.all([
        supabase
          .from("automation_run_steps")
          .select("*")
          .in("automation_run_id", runIds)
          .order("created_at", { ascending: false })
          .limit(400),
        supabase.from("automations").select("id, name").in("id", autoIds),
      ])

      const runMap = Object.fromEntries(runsData.map((r) => [r.id, r]))
      const autoMap = Object.fromEntries((autosResult.data ?? []).map((a) => [a.id, a.name]))
      const steps = stepsResult.data ?? []

      // Fetch nodes for those steps
      const nodeIds = [...new Set(steps.map((s) => s.node_id))]
      const { data: nodesData } = await supabase
        .from("automation_nodes")
        .select("id, type, subtype")
        .in("id", nodeIds)
      const nodeMap = Object.fromEntries((nodesData ?? []).map((n) => [n.id, n]))

      const rows: AutomationLogRow[] = []
      for (const step of steps) {
        const run = runMap[step.automation_run_id]
        if (!run) continue
        const node = nodeMap[step.node_id]
        rows.push({
          step,
          run,
          automationName: autoMap[run.automation_id] ?? "—",
          nodeType: node?.type ?? null,
          nodeSubtype: node?.subtype ?? null,
        })
      }
      setLogRows(rows)
    } finally {
      setLogsLoading(false)
    }
  }, [businessId, supabase])

  const handleSaveCategory = async () => {
    if (!newCategoryName.trim() || !businessId) return

    if (editingCategory) {
      const { error } = await supabase
        .from("automation_folders")
        .update({ name: newCategoryName.trim() })
        .eq("id", editingCategory.id)
      if (error) toast.error("שגיאה בעדכון")
      else {
        setCategories(prev => prev.map(c => c.id === editingCategory.id ? { ...c, name: newCategoryName.trim() } : c).sort((a, b) => a.name.localeCompare(b.name, "he")))
        setIsCategoryDialogOpen(false)
        toast.success("הקטגוריה עודכנה")
      }
    } else {
      const { data, error } = await supabase
        .from("automation_folders")
        .insert({ business_id: businessId, name: newCategoryName.trim() })
        .select()
        .single()
      if (error) toast.error("שגיאה ביצירה")
      else {
        setCategories(prev => [...prev, data].sort((a, b) => a.name.localeCompare(b.name, "he")))
        setIsCategoryDialogOpen(false)
        toast.success("הקטגוריה נוצרה")
      }
    }
  }

  const deleteCategory = async (cat: Category) => {
    if (!confirm(`למחוק את הקטגוריה "${cat.name}"? האוטומציות יישארו ללא קטגוריה.`)) return
    const { error } = await supabase.from("automation_folders").delete().eq("id", cat.id)
    if (error) toast.error("שגיאה במחיקה")
    else {
      setCategories(prev => prev.filter(c => c.id !== cat.id))
      setAutomations(prev => prev.map(a => a.folder_id === cat.id ? { ...a, folder_id: null } : a))
      if (activeCategoryId === cat.id) setActiveCategoryId("all")
      toast.success("הקטגוריה נמחקה")
    }
  }

  const assignCategory = async (automationId: string, folderId: string | null) => {
    const { error } = await supabase
      .from("automations")
      .update({ folder_id: folderId })
      .eq("id", automationId)
    if (error) toast.error("שגיאה בשיוך קטגוריה")
    else {
      setAutomations(prev => prev.map(a => a.id === automationId ? { ...a, folder_id: folderId } : a))
    }
  }

  const createCategoryAndAssign = async (automationId: string, name: string) => {
    if (!businessId) return
    const { data, error } = await supabase
      .from("automation_folders")
      .insert({ business_id: businessId, name })
      .select()
      .single()
    if (error || !data) { toast.error("שגיאה ביצירת קטגוריה"); return }
    setCategories(prev => [...prev, data].sort((a, b) => a.name.localeCompare(b.name, "he")))
    await assignCategory(automationId, data.id)
    toast.success(`הקטגוריה "${name}" נוצרה`)
  }

  const toggleStatus = async (a: Automation) => {
    const next = a.status === "active" ? "paused" : "active"
    const { error } = await supabase.from("automations").update({ status: next }).eq("id", a.id)
    if (error) { toast.error("שגיאה בעדכון הסטטוס"); return }
    setAutomations(prev => prev.map(x => (x.id === a.id ? { ...x, status: next } : x)))
    toast.success(`האוטומציה ${next === "active" ? "הופעלה" : "הושהתה"}`)
  }

  const duplicate = async (a: Automation) => {
    if (!businessId) return
    const { data: nodes } = await supabase.from("automation_nodes").select("*").eq("automation_id", a.id)
    const { data: edges } = await supabase.from("automation_edges").select("*").eq("automation_id", a.id)
    const { data: newRow } = await supabase
      .from("automations")
      .insert({
        business_id: businessId,
        name: `${a.name} (עותק)`,
        status: "draft",
        version: 1,
        folder_id: a.folder_id,
        is_simple: a.is_simple ?? false,
      })
      .select("id")
      .single()
    if (!newRow?.id || !nodes?.length) return
    const idMap = new Map<string, string>()
    for (const n of nodes) idMap.set(n.id, crypto.randomUUID())
    for (const n of nodes) {
      await supabase.from("automation_nodes").insert({
        id: idMap.get(n.id), automation_id: newRow.id,
        type: n.type, subtype: n.subtype, config: n.config,
        position_x: n.position_x, position_y: n.position_y,
      })
    }
    for (const e of edges ?? []) {
      const fromId = idMap.get(e.from_node_id)
      const toId = idMap.get(e.to_node_id)
      if (fromId && toId)
        await supabase.from("automation_edges").insert({
          automation_id: newRow.id, from_node_id: fromId,
          to_node_id: toId, branch_label: e.branch_label,
        })
    }
    loadData()
    toast.success("האוטומציה שוכפלה")
  }

  const deleteAutomation = async (id: string) => {
    if (!confirm("למחוק אוטומציה זו?")) return
    const { error } = await supabase.from("automations").delete().eq("id", id)
    if (error) { toast.error("שגיאה במחיקה"); return }
    setAutomations(prev => prev.filter(a => a.id !== id))
    toast.success("האוטומציה נמחקה")
  }

  const bulkAction = async (action: "activate" | "deactivate" | "delete") => {
    if (selectedIds.length === 0) return
    if (action === "delete") {
      if (!confirm(`למחוק ${selectedIds.length} אוטומציות?`)) return
      const { error } = await supabase.from("automations").delete().in("id", selectedIds)
      if (error) toast.error("שגיאה במחיקה")
      else {
        setAutomations(prev => prev.filter(a => !selectedIds.includes(a.id)))
        setSelectedIds([])
        toast.success("האוטומציות נמחקו")
      }
    } else {
      const nextStatus = action === "activate" ? "active" : "paused"
      const { error } = await supabase.from("automations").update({ status: nextStatus }).in("id", selectedIds)
      if (error) toast.error("שגיאה בעדכון")
      else {
        setAutomations(prev => prev.map(a => selectedIds.includes(a.id) ? { ...a, status: nextStatus } : a))
        setSelectedIds([])
        toast.success("הסטטוס עודכן")
      }
    }
  }

  const toggleSelectAll = () => {
    if (selectedIds.length === filteredAutomations.length) setSelectedIds([])
    else setSelectedIds(filteredAutomations.map(a => a.id))
  }

  const toggleSelect = (id: string) =>
    setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id])

  const renameAutomation = async (id: string, newName: string) => {
    if (!newName.trim()) return
    const { error } = await supabase.from("automations").update({ name: newName }).eq("id", id)
    if (error) {
      toast.error("שגיאה בעדכון השם")
      return
    }
    setAutomations(prev => prev.map(a => (a.id === id ? { ...a, name: newName } : a)))
    setEditingNameId(null)
    toast.success("השם עודכן")
  }

  const filteredAutomations = automations.filter(a =>
    activeCategoryId === "all" ? true : a.folder_id === activeCategoryId
  )

  useEffect(() => {
    if (!featuresLoading && !features.automations) router.replace("/dashboard")
  }, [features.automations, featuresLoading, router])

  if (!businessId || (!featuresLoading && !features.automations)) return null

  if (loading && automations.length === 0) {
    return (
      <div className="flex min-h-[200px] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    )
  }

  const atAutomationLimit =
    features.max_automations !== null && automations.length >= features.max_automations
  const canCreateAutomation = !!features.automations && !atAutomationLimit

  return (
    <div className="space-y-6" dir="rtl">
      {atAutomationLimit && (
        <div className="flex items-center gap-3 rounded-xl border border-orange-200 bg-orange-50 p-4 text-orange-800 text-right">
          <Lock className="h-5 w-5 shrink-0 text-orange-600" />
          <div>
            <p className="font-bold text-sm">הגעת למגבלת האוטומציות ({automations.length}/{features.max_automations})</p>
            <p className="text-xs mt-0.5 text-orange-700">שדרג את המסלול שלך כדי ליצור אוטומציות נוספות.</p>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between gap-4">
        <div className="text-right min-w-0">
          <h1 className="text-2xl font-bold tracking-tight">אוטומציות</h1>
          <p className="text-muted-foreground text-sm mt-1">
            בנה זרימות אוטומטיות עם טריגרים, תנאים ופעולות.
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-3">
          {canCreateAutomation ? (
            <Button type="button" className="flex items-center gap-2" onClick={() => setNewChoiceOpen(true)}>
              אוטומציה חדשה
              <Plus className="h-4 w-4" />
            </Button>
          ) : (
            <Button disabled variant="outline" className="gap-2 opacity-60 cursor-not-allowed">
              <Lock className="h-4 w-4" />
              אוטומציה חדשה
            </Button>
          )}
        </div>
      </div>

      <Tabs
        value={automationMainTab}
        onValueChange={(v) => {
          setAutomationMainTab(v)
          if (v === "logs") void loadAutomationLogs()
        }}
        className="w-full"
        dir="rtl"
      >
        <TabsList className="grid w-full max-w-2xl grid-cols-3 mb-4">
          <TabsTrigger value="list">אוטומציות שלי</TabsTrigger>
          <TabsTrigger value="history">היסטוריית הרצות</TabsTrigger>
          <TabsTrigger value="logs" className="gap-1">
            <FileText className="h-3.5 w-3.5" />
            לוגים
          </TabsTrigger>
        </TabsList>

        <TabsContent value="list" className="space-y-4 pt-2">
          {/* Category filter bar */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => setActiveCategoryId("all")}
              className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm font-medium transition-colors ${
                activeCategoryId === "all"
                  ? "bg-primary text-primary-foreground border-primary"
                  : "border-border bg-background hover:bg-muted text-foreground"
              }`}
            >
              הכל
              <span className="rounded-full bg-white/20 px-1.5 text-xs">{automations.length}</span>
            </button>

            {categories.map(cat => {
              const count = automations.filter(a => a.folder_id === cat.id).length
              const isActive = activeCategoryId === cat.id
              return (
                <div key={cat.id} className="group relative">
                  <button
                    onClick={() => setActiveCategoryId(cat.id)}
                    className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm font-medium transition-colors pr-2 ${
                      isActive
                        ? "bg-primary text-primary-foreground border-primary"
                        : "border-border bg-background hover:bg-muted text-foreground"
                    }`}
                  >
                    {cat.name}
                    <span className={`rounded-full px-1.5 text-xs ${isActive ? "bg-white/20" : "bg-muted"}`}>
                      {count}
                    </span>
                  </button>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button className="absolute -top-1.5 -right-1.5 hidden group-hover:flex h-4 w-4 items-center justify-center rounded-full bg-muted border border-border text-muted-foreground hover:bg-destructive hover:text-destructive-foreground transition-colors">
                        <MoreVertical className="h-2.5 w-2.5" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start">
                      <DropdownMenuItem
                        className="text-right"
                        onClick={() => {
                          setEditingCategory(cat)
                          setNewCategoryName(cat.name)
                          setIsCategoryDialogOpen(true)
                        }}
                      >
                        <Pencil className="h-3.5 w-3.5 ms-2" />
                        עריכה
                      </DropdownMenuItem>
                      <DropdownMenuItem className="text-destructive text-right" onClick={() => deleteCategory(cat)}>
                        <X className="h-3.5 w-3.5 ms-2" />
                        מחיקה
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              )
            })}

            <Button
              variant="ghost"
              size="sm"
              className="rounded-full h-7 gap-1 text-muted-foreground hover:text-foreground px-3"
              onClick={() => {
                setEditingCategory(null)
                setNewCategoryName("")
                setIsCategoryDialogOpen(true)
              }}
            >
              <Plus className="h-3.5 w-3.5" />
              קטגוריה חדשה
            </Button>
          </div>

          {/* Bulk action toolbar */}
          {selectedIds.length > 0 && (
            <div className="flex items-center justify-between rounded-lg border bg-muted/50 px-4 py-2">
              <div className="flex items-center gap-3">
                <span className="text-sm font-medium">{selectedIds.length} נבחרו</span>
                <div className="flex items-center gap-2 border-r border-border pr-3">
                  <Button variant="outline" size="sm" onClick={() => bulkAction("activate")}>הפעל</Button>
                  <Button variant="outline" size="sm" onClick={() => bulkAction("deactivate")}>השהה</Button>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="sm">
                        <Tag className="h-3.5 w-3.5 ml-1" />
                        שנה קטגוריה
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" dir="rtl">
                      <DropdownMenuItem
                        className="text-right"
                        onClick={async () => {
                          await supabase.from("automations").update({ folder_id: null }).in("id", selectedIds)
                          setAutomations(prev => prev.map(a => selectedIds.includes(a.id) ? { ...a, folder_id: null } : a))
                          setSelectedIds([])
                        }}
                      >
                        ללא קטגוריה
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      {categories.map(c => (
                        <DropdownMenuItem
                          key={c.id}
                          className="text-right"
                          onClick={async () => {
                            await supabase.from("automations").update({ folder_id: c.id }).in("id", selectedIds)
                            setAutomations(prev => prev.map(a => selectedIds.includes(a.id) ? { ...a, folder_id: c.id } : a))
                            setSelectedIds([])
                          }}
                        >
                          {c.name}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                  <Button variant="destructive" size="sm" onClick={() => bulkAction("delete")}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
              <button className="text-xs text-muted-foreground hover:text-foreground shrink-0" onClick={() => setSelectedIds([])}>
                ביטול בחירה
              </button>
            </div>
          )}

          {filteredAutomations.length === 0 ? (
            <Card dir="rtl">
              <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-4">
                  <Zap className="h-6 w-6 text-muted-foreground" />
                </div>
                <p className="text-muted-foreground max-w-xs">
                  {activeCategoryId === "all"
                    ? "אין אוטומציות עדיין. צור אוטומציה חדשה ובנה זרימה חכמה לעסק שלך."
                    : "אין אוטומציות בקטגוריה זו."}
                </p>
                {canCreateAutomation && activeCategoryId === "all" && (
                  <Button type="button" className="mt-6 flex items-center gap-2" onClick={() => setNewChoiceOpen(true)}>
                    אוטומציה חדשה
                    <Plus className="h-4 w-4" />
                  </Button>
                )}
              </CardContent>
            </Card>
          ) : (
            <Card className="overflow-hidden">
              <Table dir="rtl">
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[48px] text-right">
                      <Checkbox
                        checked={selectedIds.length === filteredAutomations.length && filteredAutomations.length > 0}
                        onCheckedChange={toggleSelectAll}
                      />
                    </TableHead>
                    <TableHead className="text-right">שם האוטומציה</TableHead>
                    <TableHead className="w-[100px] text-right">סוג</TableHead>
                    <TableHead className="w-[100px] text-right">סטטוס</TableHead>
                    <TableHead className="w-[180px] text-right">קטגוריה</TableHead>
                    <TableHead className="w-[120px] text-right">עודכן</TableHead>
                    <TableHead className="w-[140px] text-left">פעולות</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredAutomations.map((a) => {
                    return (
                      <TableRow key={a.id} className={selectedIds.includes(a.id) ? "bg-muted/50" : ""}>
                        <TableCell className="w-[48px] text-right">
                          <Checkbox
                            checked={selectedIds.includes(a.id)}
                            onCheckedChange={() => toggleSelect(a.id)}
                          />
                        </TableCell>
                        <TableCell className="font-medium text-right">
                          {editingNameId === a.id ? (
                            <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
                              <Input
                                value={editingNameValue}
                                onChange={e => setEditingNameValue(e.target.value)}
                                onKeyDown={e => {
                                  if (e.key === "Enter") renameAutomation(a.id, editingNameValue)
                                  if (e.key === "Escape") setEditingNameId(null)
                                }}
                                onBlur={() => renameAutomation(a.id, editingNameValue)}
                                className="h-8 text-right"
                                autoFocus
                              />
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-8 w-8 text-emerald-600 hover:text-emerald-700"
                                onClick={() => renameAutomation(a.id, editingNameValue)}
                              >
                                <Check className="h-4 w-4" />
                              </Button>
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-8 w-8 text-rose-600 hover:text-rose-700"
                                onClick={() => setEditingNameId(null)}
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                          ) : (
                            <div className="flex group items-center gap-2 justify-start">
                              {a.is_simple ? (
                                <button
                                  type="button"
                                  className="hover:underline text-right font-medium"
                                  onClick={() => setSimpleEditId(a.id)}
                                >
                                  {a.name}
                                </button>
                              ) : (
                                <Link href={`/automations/${a.id}/builder`} className="hover:underline">
                                  {a.name}
                                </Link>
                              )}
                              <button
                                onClick={() => {
                                  setEditingNameId(a.id)
                                  setEditingNameValue(a.name)
                                }}
                                className="opacity-0 group-hover:opacity-100 p-1 hover:bg-muted rounded transition-opacity"
                                title="ערוך שם"
                              >
                                <Pencil className="h-3 w-3 text-muted-foreground" />
                              </button>
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="w-[100px] text-right">
                          {a.is_simple ? (
                            <Badge variant="outline" className="text-[10px] font-normal border-amber-200 bg-amber-50/80 text-amber-900">
                              פשוטה
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-[10px] font-normal border-blue-200 bg-blue-50/80 text-blue-900">
                              מורכבת
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="w-[100px] text-right">
                          <Badge
                            variant={
                              a.status === "active" ? "default" :
                              a.status === "paused" ? "secondary" : "outline"
                            }
                          >
                            {a.status === "active" ? "פעיל" : a.status === "paused" ? "מושהה" : "טיוטה"}
                          </Badge>
                        </TableCell>
                        <TableCell className="w-[180px] text-right">
                          <CategoryCombobox
                            categories={categories}
                            value={a.folder_id ?? null}
                            onChange={(id) => assignCategory(a.id, id)}
                            onCreateAndAssign={(name) => createCategoryAndAssign(a.id, name)}
                          />
                        </TableCell>
                        <TableCell className="w-[120px] text-right text-sm text-muted-foreground whitespace-nowrap">
                          {a.updated_at ? new Date(a.updated_at).toLocaleDateString("he-IL") : "—"}
                        </TableCell>
                        <TableCell className="w-[140px] text-left">
                          <div className="flex items-center justify-start gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => toggleStatus(a)}
                              disabled={a.status === "draft"}
                              title={a.status === "active" ? "השהה" : "הפעל"}
                            >
                              {a.status === "active" ? (
                                <Pause className="h-4 w-4" />
                              ) : (
                                <Play className="h-4 w-4" />
                              )}
                            </Button>
                            {a.is_simple ? (
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => setSimpleEditId(a.id)}
                              >
                                עריכה
                              </Button>
                            ) : (
                              <Button asChild variant="ghost" size="sm">
                                <Link href={`/automations/${a.id}/builder`}>עריכה</Link>
                              </Button>
                            )}
                            <DropdownMenu modal={false}>
                              <DropdownMenuTrigger asChild>
                                <Button type="button" variant="ghost" size="sm" aria-label="פעולות נוספות">
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="start" className="min-w-[10rem]">
                                <DropdownMenuItem
                                  className="text-right"
                                  onSelect={() => duplicate(a)}
                                >
                                  <Copy className="h-4 w-4 ms-2" />
                                  שכפול
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  className="text-destructive text-right"
                                  onSelect={() => deleteAutomation(a.id)}
                                >
                                  <Trash2 className="h-4 w-4 ms-2" />
                                  מחק
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="history" className="pt-4">
          <Card className="overflow-hidden">
            <CardHeader className="text-right">
              <CardTitle className="flex items-center justify-end gap-2 text-lg">
                היסטוריית הרצות אחרונות
                <History className="h-5 w-5" />
              </CardTitle>
            </CardHeader>
            <CardContent>
              {runs.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-muted-foreground">אין הרצות עדיין.</p>
                </div>
              ) : (
                <Table dir="rtl">
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-right">יישות</TableHead>
                      <TableHead className="text-right">סטטוס</TableHead>
                      <TableHead className="text-right">זמן התחלה</TableHead>
                      <TableHead className="text-left">פרטים</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {runs.map((r) => (
                      <TableRow key={r.id}>
                        <TableCell className="text-right">
                          <span className="text-sm font-mono">
                            {r.entity_type} / {r.entity_id.slice(0, 8)}…
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          <Badge
                            variant={
                              r.status === "completed" ? "default" :
                              r.status === "failed" ? "destructive" : "secondary"
                            }
                          >
                            {r.status === "running" ? "רץ" : r.status === "completed" ? "הושלם" : "נכשל"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right text-sm">
                          {r.started_at ? new Date(r.started_at).toLocaleString("he-IL") : ""}
                        </TableCell>
                        <TableCell className="text-left">
                          <Button asChild variant="ghost" size="sm">
                            <Link href={`/automations/runs/${r.id}`}>פרטי הרצה</Link>
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="logs" className="pt-4">
          <Card className="overflow-hidden">
            <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3 text-right space-y-0">
              <div>
                <CardTitle className="flex items-center justify-end gap-2 text-lg">
                  לוג צעדים
                  <FileText className="h-5 w-5" />
                </CardTitle>
                <p className="text-sm text-muted-foreground mt-1 font-normal">
                  כל צעד שבוצע באוטומציות (פעולות, תנאים, שגיאות). קריאות מהדפדפן לשרת שלא הגיעו לכאן יופיעו בקונסול של הדפדפן (F12).
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="gap-2 shrink-0"
                disabled={logsLoading}
                onClick={() => void loadAutomationLogs()}
              >
                <RefreshCw className={`h-4 w-4 ${logsLoading ? "animate-spin" : ""}`} />
                רענן
              </Button>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              {logsLoading && logRows.length === 0 ? (
                <div className="flex min-h-[160px] items-center justify-center">
                  <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                </div>
              ) : logRows.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-muted-foreground">אין צעדים מתועדים עדיין.</p>
                  <p className="text-xs text-muted-foreground mt-2 max-w-md mx-auto">
                    אם העברת ליד בין שלבים ואין כאן כלום — בדוק קונסול (שגיאת רשת ל־automation-engine), או לוגים של Edge Function ב-Supabase.
                  </p>
                </div>
              ) : (
                <Table dir="rtl">
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-right whitespace-nowrap">זמן</TableHead>
                      <TableHead className="text-right">אוטומציה</TableHead>
                      <TableHead className="text-right">צומת</TableHead>
                      <TableHead className="text-right">סטטוס</TableHead>
                      <TableHead className="text-right min-w-[200px]">הודעה / תקציר</TableHead>
                      <TableHead className="text-left whitespace-nowrap">פעולות</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {logRows.map((row) => {
                      const ws = summarizeWhatsappFromOutput(row.step.output_payload)
                      const summary =
                        row.step.error_message ||
                        ws ||
                        (row.step.status === "success" && row.nodeSubtype === "send_whatsapp"
                          ? "נשלח (ראה פרטים)"
                          : "")
                      return (
                        <TableRow key={row.step.id}>
                          <TableCell className="text-right text-sm whitespace-nowrap">
                            {row.step.created_at
                              ? new Date(row.step.created_at).toLocaleString("he-IL")
                              : "—"}
                          </TableCell>
                          <TableCell className="text-right text-sm font-medium">
                            {row.automationName}
                          </TableCell>
                          <TableCell className="text-right text-sm text-muted-foreground">
                            {row.nodeType && row.nodeSubtype
                              ? `${row.nodeType} / ${row.nodeSubtype}`
                              : row.step.node_id.slice(0, 8) + "…"}
                          </TableCell>
                          <TableCell className="text-right">
                            <Badge
                              variant={
                                row.step.status === "success"
                                  ? "default"
                                  : row.step.status === "failed"
                                    ? "destructive"
                                    : "secondary"
                              }
                            >
                              {row.step.status === "success"
                                ? "הצליח"
                                : row.step.status === "failed"
                                  ? "נכשל"
                                  : row.step.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right text-xs max-w-[280px] break-words">
                            {summary || "—"}
                          </TableCell>
                          <TableCell className="text-left whitespace-nowrap">
                            <div className="flex flex-wrap justify-start gap-1">
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => setLogDetailRow(row)}
                              >
                                פרטים
                              </Button>
                              <Button asChild variant="ghost" size="sm">
                                <Link href={`/automations/runs/${row.run.id}`}>הרצה</Link>
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={!!logDetailRow} onOpenChange={(open) => !open && setLogDetailRow(null)}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto" dir="rtl">
          <DialogHeader>
            <DialogTitle className="text-right">פרטי צעד</DialogTitle>
          </DialogHeader>
          {logDetailRow && (
            <div className="space-y-3 text-right text-sm">
              <p>
                <span className="text-muted-foreground">אוטומציה: </span>
                {logDetailRow.automationName}
              </p>
              <p>
                <span className="text-muted-foreground">צומת: </span>
                {logDetailRow.nodeType && logDetailRow.nodeSubtype
                  ? `${logDetailRow.nodeType} / ${logDetailRow.nodeSubtype}`
                  : logDetailRow.step.node_id}
              </p>
              {logDetailRow.step.error_message && (
                <div className="rounded-md border border-destructive/30 bg-destructive/5 p-3">
                  <p className="font-medium text-destructive">שגיאה</p>
                  <p className="mt-1 break-words">{logDetailRow.step.error_message}</p>
                </div>
              )}
              <div>
                <p className="text-muted-foreground mb-1">פלט (output)</p>
                <pre className="text-xs bg-muted p-3 rounded-md overflow-x-auto text-left" dir="ltr">
                  {JSON.stringify(logDetailRow.step.output_payload ?? {}, null, 2)}
                </pre>
              </div>
              <div>
                <p className="text-muted-foreground mb-1">קלט (input) — מקוצר</p>
                <pre className="text-xs bg-muted p-3 rounded-md overflow-x-auto text-left max-h-40 overflow-y-auto" dir="ltr">
                  {(() => {
                    const raw = JSON.stringify(logDetailRow.step.input_payload ?? {}, null, 2)
                    return raw.length > 4000 ? `${raw.slice(0, 4000)}\n…` : raw
                  })()}
                </pre>
              </div>
              <Button asChild variant="outline" className="w-full">
                <Link href={`/automations/runs/${logDetailRow.run.id}`}>לדף ההרצה המלא</Link>
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Category Dialog */}
      <Dialog open={isCategoryDialogOpen} onOpenChange={setIsCategoryDialogOpen}>
        <DialogContent dir="rtl">
          <DialogHeader>
            <DialogTitle className="text-right">
              {editingCategory ? "עריכת קטגוריה" : "קטגוריה חדשה"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2 text-right">
              <Label htmlFor="categoryName">שם הקטגוריה</Label>
              <Input
                id="categoryName"
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                placeholder="למשל: שיווק, מכירות, לקוחות..."
                className="text-right"
                onKeyDown={(e) => e.key === "Enter" && handleSaveCategory()}
                autoFocus
              />
            </div>
          </div>
          <DialogFooter className="flex-row-reverse gap-2">
            <Button variant="outline" onClick={() => setIsCategoryDialogOpen(false)}>
              ביטול
            </Button>
            <Button onClick={handleSaveCategory}>
              {editingCategory ? "עדכון" : "יצירה"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <NewAutomationChoiceDialog
        open={newChoiceOpen}
        onOpenChange={setNewChoiceOpen}
        onChooseSimple={() => setSimpleCreateOpen(true)}
        onChooseComplex={startComplexAutomation}
        complexLoading={creatingComplex}
      />
      <SimpleAutomationDialog
        open={simpleCreateOpen}
        onOpenChange={setSimpleCreateOpen}
        businessId={businessId}
        onCreated={() => {
          void loadData()
        }}
      />
      <SimpleAutomationEditDialog
        open={simpleEditId != null}
        onOpenChange={(open) => {
          if (!open) setSimpleEditId(null)
        }}
        automationId={simpleEditId}
        businessId={businessId}
        onSaved={() => {
          void loadData()
        }}
      />
    </div>
  )
}

function AutomationsSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 bg-muted rounded-xl animate-pulse" />
          <div className="space-y-1.5">
            <div className="h-6 w-28 bg-muted rounded animate-pulse" />
            <div className="h-4 w-44 bg-muted rounded animate-pulse" />
          </div>
        </div>
        <div className="h-10 w-36 bg-muted rounded-lg animate-pulse" />
      </div>
      <div className="h-10 w-64 bg-muted rounded-lg animate-pulse" />
      <div className="space-y-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="rounded-xl border border-border p-4 flex items-center gap-4">
            <div className="h-10 w-10 bg-muted rounded-lg animate-pulse flex-shrink-0" />
            <div className="flex-1 space-y-2">
              <div className="h-4 w-48 bg-muted rounded animate-pulse" />
              <div className="h-3 w-32 bg-muted rounded animate-pulse" />
            </div>
            <div className="h-6 w-16 bg-muted rounded-full animate-pulse" />
            <div className="h-8 w-8 bg-muted rounded-lg animate-pulse" />
          </div>
        ))}
      </div>
    </div>
  )
}

export default function AutomationsListPage() {
  return (
    <Suspense fallback={<AutomationsSkeleton />}>
      <AutomationsListPageInner />
    </Suspense>
  )
}
