"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { buildSimpleAutomationAutoName } from "@/lib/simpleAutomationName"
import type { Node } from "@xyflow/react"
import { createClient } from "@/lib/supabase/client"
import { useTierFeatures } from "@/lib/hooks/useTierFeatures"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { NodeConfigPanel, type PipelineOption, type StageOption } from "./NodeConfigPanel"
import type { AutomationNodeData, ActionSubtype, TriggerSubtype } from "@/types/automation"
import {
  TRIGGER_SUBTYPES,
  ACTION_SUBTYPES,
  TRIGGER_LABELS,
  ACTION_LABELS,
} from "@/types/automation"
import { toast } from "sonner"

function coerceTrigger(s: string): TriggerSubtype {
  return (TRIGGER_SUBTYPES as readonly string[]).includes(s)
    ? (s as TriggerSubtype)
    : "lead.stage_entered"
}

function coerceAction(s: string): ActionSubtype {
  return (ACTION_SUBTYPES as readonly string[]).includes(s)
    ? (s as ActionSubtype)
    : "send_whatsapp"
}

export interface SimpleAutomationEditorProps {
  businessId: string | null
  /** null/undefined = יצירה חדשה */
  automationId?: string | null
  /** כשדיאלוג יצירה נפתח מחדש */
  dialogOpen?: boolean
  layout?: "dialog" | "page"
  onCreated?: (id: string) => void
  onSaved?: () => void
  onCancel?: () => void
}

export function SimpleAutomationEditor({
  businessId,
  automationId = null,
  dialogOpen = true,
  layout = "page",
  onCreated,
  onSaved,
  onCancel,
}: SimpleAutomationEditorProps) {
  const supabase = createClient()
  const { features, loading: featuresLoading } = useTierFeatures()
  const isCreate = !automationId

  const [triggerSubtype, setTriggerSubtype] = useState<TriggerSubtype>("lead.stage_entered")
  const [triggerConfig, setTriggerConfig] = useState<Record<string, unknown>>({})
  const [actionSubtype, setActionSubtype] = useState<ActionSubtype>("send_whatsapp")
  const [actionConfig, setActionConfig] = useState<Record<string, unknown>>({})
  const [triggerNodeId, setTriggerNodeId] = useState("simple-trigger")
  const [actionNodeId, setActionNodeId] = useState("simple-action")

  const [pipelines, setPipelines] = useState<PipelineOption[]>([])
  const [stages, setStages] = useState<StageOption[]>([])
  const [whatsappCredentials, setWhatsappCredentials] = useState<
    { id: string; name: string; provider: "official" | "green_api" }[]
  >([])
  const [submitting, setSubmitting] = useState(false)
  const [loadingEdit, setLoadingEdit] = useState(false)

  useEffect(() => {
    if (!businessId) return
    async function loadRefs() {
      const { data: pipelinesData } = await supabase
        .from("pipelines")
        .select("id, name")
        .eq("business_id", businessId)
        .order("name")
      setPipelines((pipelinesData ?? []).map((p) => ({ id: p.id, name: p.name })))
      const pipelineIds = (pipelinesData ?? []).map((p) => p.id)
      const { data: stagesData } = pipelineIds.length
        ? await supabase
            .from("stages")
            .select("id, pipeline_id, name")
            .in("pipeline_id", pipelineIds)
            .order("position")
        : { data: [] as { id: string; pipeline_id: string; name: string }[] }
      setStages((stagesData ?? []).map((s) => ({ id: s.id, pipeline_id: s.pipeline_id, name: s.name })))
      const { data: whatsappCredsData } = await supabase
        .from("whatsapp_credentials")
        .select("id, name, provider")
        .eq("business_id", businessId)
        .order("name")
      setWhatsappCredentials((whatsappCredsData as typeof whatsappCredentials) ?? [])
    }
    void loadRefs()
  }, [businessId, supabase])

  useEffect(() => {
    if (!isCreate || !dialogOpen || layout !== "dialog") return
    setTriggerSubtype("lead.stage_entered")
    setActionSubtype("send_whatsapp")
    setTriggerConfig({})
    setActionConfig({})
    setTriggerNodeId("simple-trigger")
    setActionNodeId("simple-action")
  }, [dialogOpen, isCreate, layout])

  useEffect(() => {
    if (!automationId || !businessId) return
    let cancelled = false
    setLoadingEdit(true)
    async function load() {
      const { data: auto, error: autoErr } = await supabase
        .from("automations")
        .select("id, name, is_simple")
        .eq("id", automationId)
        .eq("business_id", businessId)
        .single()
      const { data: nodes } = await supabase
        .from("automation_nodes")
        .select("*")
        .eq("automation_id", automationId)
      if (cancelled) return
      if (autoErr || !auto) {
        toast.error("לא ניתן לטעון את האוטומציה")
        setLoadingEdit(false)
        return
      }
      const trigger = nodes?.find((n) => n.type === "trigger")
      const action = nodes?.find((n) => n.type === "action")
      if (!trigger || !action) {
        toast.error("לא נמצאו טריגר ופעולה — נסו את העורך המורכב")
        setLoadingEdit(false)
        return
      }
      setTriggerNodeId(trigger.id)
      setActionNodeId(action.id)
      setTriggerSubtype(coerceTrigger(trigger.subtype))
      setActionSubtype(coerceAction(action.subtype))
      setTriggerConfig((trigger.config as Record<string, unknown>) ?? {})
      setActionConfig((action.config as Record<string, unknown>) ?? {})
      setLoadingEdit(false)
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [automationId, businessId, supabase])

  const onTriggerSubtypePick = useCallback((v: string) => {
    const t = v as TriggerSubtype
    setTriggerSubtype(t)
    setTriggerConfig({})
  }, [])

  const onActionSubtypePick = useCallback((v: string) => {
    const a = v as ActionSubtype
    setActionSubtype(a)
    setActionConfig({})
  }, [])

  const triggerNode: Node = useMemo(
    () => ({
      id: triggerNodeId,
      type: "trigger",
      position: { x: 0, y: 0 },
      data: {
        type: "trigger" as const,
        subtype: triggerSubtype,
        label: TRIGGER_LABELS[triggerSubtype] ?? triggerSubtype,
        config: triggerConfig,
        nodeId: triggerNodeId,
      },
    }),
    [triggerSubtype, triggerConfig, triggerNodeId]
  )

  const actionNode: Node = useMemo(
    () => ({
      id: actionNodeId,
      type: "action",
      position: { x: 0, y: 0 },
      data: {
        type: "action" as const,
        subtype: actionSubtype,
        label: ACTION_LABELS[actionSubtype] ?? actionSubtype,
        config: actionConfig,
        nodeId: actionNodeId,
      },
    }),
    [actionSubtype, actionConfig, actionNodeId]
  )

  const onTriggerConfigChange = useCallback((_nodeId: string, data: Partial<AutomationNodeData>) => {
    if (data.config !== undefined) setTriggerConfig(data.config)
    if (data.subtype) setTriggerSubtype(data.subtype as TriggerSubtype)
  }, [])

  const onActionConfigChange = useCallback((_nodeId: string, data: Partial<AutomationNodeData>) => {
    if (data.config !== undefined) setActionConfig(data.config)
    if (data.subtype) setActionSubtype(data.subtype as ActionSubtype)
  }, [])

  const autoName = useMemo(
    () =>
      buildSimpleAutomationAutoName(
        triggerSubtype,
        actionSubtype,
        triggerConfig,
        actionConfig,
        pipelines,
        stages
      ),
    [triggerSubtype, actionSubtype, triggerConfig, actionConfig, pipelines, stages]
  )

  const handleSubmit = async () => {
    if (!businessId || featuresLoading) return
    if (!features.automations) {
      toast.error("אוטומציות לא זמינות במסלול שלך")
      return
    }

    const nameToSave = autoName

    if (isCreate) {
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
      const triggerId = crypto.randomUUID()
      const actionId = crypto.randomUUID()
      setSubmitting(true)
      try {
        const { data: autoRow, error: autoErr } = await supabase
          .from("automations")
          .insert({
            business_id: businessId,
            name: nameToSave.slice(0, 200),
            status: "draft",
            version: 1,
            is_simple: true,
          })
          .select("id")
          .single()
        if (autoErr || !autoRow?.id) {
          toast.error("לא ניתן ליצור אוטומציה")
          return
        }
        const newId = autoRow.id
        const { error: nodesErr } = await supabase.from("automation_nodes").insert([
          {
            id: triggerId,
            automation_id: newId,
            type: "trigger",
            subtype: triggerSubtype,
            config: triggerConfig,
            position_x: 80,
            position_y: 120,
          },
          {
            id: actionId,
            automation_id: newId,
            type: "action",
            subtype: actionSubtype,
            config: actionConfig,
            position_x: 420,
            position_y: 120,
          },
        ])
        if (nodesErr) {
          toast.error("שגיאה בשמירת הצמתים")
          await supabase.from("automations").delete().eq("id", newId)
          return
        }
        const { error: edgeErr } = await supabase.from("automation_edges").insert({
          automation_id: newId,
          from_node_id: triggerId,
          to_node_id: actionId,
          branch_label: null,
        })
        if (edgeErr) {
          toast.error("שגיאה ביצירת הקישור בין טריגר לפעולה")
          return
        }
        toast.success("האוטומציה נוצרה")
        onCreated?.(newId)
      } finally {
        setSubmitting(false)
      }
      return
    }

    setSubmitting(true)
    try {
      await supabase
        .from("automations")
        .update({ name: nameToSave.slice(0, 200), updated_at: new Date().toISOString() })
        .eq("id", automationId)
        .eq("business_id", businessId)

      const { error: u1 } = await supabase
        .from("automation_nodes")
        .update({
          subtype: triggerSubtype,
          config: triggerConfig,
        })
        .eq("id", triggerNodeId)
        .eq("automation_id", automationId)

      const { error: u2 } = await supabase
        .from("automation_nodes")
        .update({
          subtype: actionSubtype,
          config: actionConfig,
        })
        .eq("id", actionNodeId)
        .eq("automation_id", automationId)

      if (u1 || u2) {
        toast.error("שגיאה בשמירה")
        return
      }
      toast.success("נשמר")
      onSaved?.()
    } finally {
      setSubmitting(false)
    }
  }

  const formBody = (
    <div className="space-y-6 py-2">
      <div className="space-y-2">
        <Label className="text-slate-700">שם האוטומציה</Label>
        <p className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-medium text-slate-900 text-right leading-snug">
          {autoName}
        </p>
        <p className="text-xs text-muted-foreground text-right">
          השם נקבע אוטומטית לפי סוג הטריגר, הסטייג׳/פייפליין והפעולה.
        </p>
      </div>

      <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-4 space-y-4">
        <p className="text-sm leading-relaxed text-slate-800">
          <span className="text-muted-foreground">ברגע ש</span>{" "}
          <Select dir="rtl" value={triggerSubtype} onValueChange={onTriggerSubtypePick}>
            <SelectTrigger className="inline-flex h-9 min-w-[200px] max-w-full align-middle bg-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent dir="rtl">
              {TRIGGER_SUBTYPES.map((t) => (
                <SelectItem key={t} value={t}>
                  {TRIGGER_LABELS[t] ?? t}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </p>
        <NodeConfigPanel
          node={triggerNode}
          onConfigChange={onTriggerConfigChange}
          pipelines={pipelines}
          stages={stages}
          whatsappCredentials={whatsappCredentials}
          embedMode
        />
      </div>

      <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-4 space-y-4">
        <p className="text-sm leading-relaxed text-slate-800">
          <span className="text-muted-foreground">הפעולה שצריכה לקרות היא</span>{" "}
          <Select dir="rtl" value={actionSubtype} onValueChange={onActionSubtypePick}>
            <SelectTrigger className="inline-flex h-9 min-w-[200px] max-w-full align-middle bg-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent dir="rtl">
              {ACTION_SUBTYPES.map((a) => (
                <SelectItem key={a} value={a}>
                  {ACTION_LABELS[a] ?? a}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </p>
        <NodeConfigPanel
          node={actionNode}
          onConfigChange={onActionConfigChange}
          pipelines={pipelines}
          stages={stages}
          whatsappCredentials={whatsappCredentials}
          embedMode
        />
      </div>
    </div>
  )

  if (loadingEdit && !isCreate) {
    return (
      <div className="flex min-h-[240px] items-center justify-center" dir="rtl">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    )
  }

  const footer = (
    <div
      className={
        layout === "dialog"
          ? "flex flex-row-reverse flex-wrap gap-2 justify-start pt-2"
          : "flex flex-wrap gap-2 justify-end pt-4 border-t"
      }
    >
      {onCancel ? (
        <Button variant="outline" onClick={onCancel} disabled={submitting}>
          ביטול
        </Button>
      ) : null}
      <Button onClick={() => void handleSubmit()} disabled={submitting || !businessId || featuresLoading}>
        {submitting ? "שומר…" : isCreate ? "צור אוטומציה" : "שמור"}
      </Button>
    </div>
  )

  return (
    <div dir="rtl" className="text-right">
      {formBody}
      {footer}
    </div>
  )
}
