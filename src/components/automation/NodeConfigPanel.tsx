"use client"

import { useCallback, useState } from "react"
import type { Node } from "@xyflow/react"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { VariableInput } from "./VariableInput"
import type { AutomationNodeData } from "@/types/automation"
import { TRIGGER_SUBTYPES, TRIGGER_LABELS, ACTION_LABELS, ACTION_SUBTYPES } from "@/types/automation"
import { Plus, Trash2, Mail, Tag, Clock, Edit, Webhook, ListPlus, Zap, GitBranch, Play, Check, MessageSquare } from "lucide-react"
import { cn } from "@/lib/utils"
import { Checkbox } from "@/components/ui/checkbox"

interface WhatsappCredential {
  id: string
  name: string
  provider: "official" | "green_api"
}

function WhatsappConfig({
  config,
  updateData,
  credentials,
}: {
  config: Record<string, unknown>
  updateData: (u: Partial<AutomationNodeData["config"]>) => void
  credentials: WhatsappCredential[]
}) {
  return (
    <div className="space-y-4" dir="rtl">
      <div className="space-y-2">
        <Label className="block text-right">בחר חיבור וואטסאפ</Label>
        <Select
          dir="rtl"
          value={(config?.credential_id as string) ?? ""}
          onValueChange={(v) => updateData({ credential_id: v })}
        >
          <SelectTrigger className="w-full bg-white">
            <SelectValue placeholder="בחר חיבור..." />
          </SelectTrigger>
          <SelectContent dir="rtl">
            {credentials.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.name} ({c.provider === "official" ? "רשמי" : "GreenAPI"})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label className="block text-right">הודעה (הקלד @ למשתנים)</Label>
        <VariableInput
          value={(config?.message as string) ?? ""}
          onChange={(v) => updateData({ message: v })}
          placeholder="הקלד את ההודעה כאן..."
          multiline
          className="min-h-[120px] text-right"
        />
      </div>
    </div>
  )
}

function DelayConfig({
  config,
  updateData,
}: {
  config: Record<string, unknown>
  updateData: (u: Partial<AutomationNodeData["config"]>) => void
}) {
  return (
    <div className="space-y-4" dir="rtl">
      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-2">
          <Label className="block text-right">זמן</Label>
          <Input
            type="number"
            value={(config?.delay_value as number) ?? 1}
            onChange={(e) => updateData({ delay_value: parseInt(e.target.value) || 0 })}
            className="text-right"
          />
        </div>
        <div className="space-y-2">
          <Label className="block text-right">יחידות</Label>
          <Select
            dir="rtl"
            value={(config?.delay_unit as string) ?? "minutes"}
            onValueChange={(v) => updateData({ delay_unit: v })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent dir="rtl">
              <SelectItem value="minutes">דקות</SelectItem>
              <SelectItem value="hours">שעות</SelectItem>
              <SelectItem value="days">ימים</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  )
}

function TagConfig({
  config,
  updateData,
  label = "תגית",
}: {
  config: Record<string, unknown>
  updateData: (u: Partial<AutomationNodeData["config"]>) => void
  label?: string
}) {
  return (
    <div className="space-y-4" dir="rtl">
      <div className="space-y-2">
        <Label className="block text-right">{label}</Label>
        <Input
          value={(config?.tag as string) ?? ""}
          onChange={(e) => updateData({ tag: e.target.value })}
          placeholder="למשל: לקוח_חדש"
          className="text-right"
        />
      </div>
    </div>
  )
}

function FieldUpdateConfig({
  config,
  updateData,
}: {
  config: Record<string, unknown>
  updateData: (u: Partial<AutomationNodeData["config"]>) => void
}) {
  return (
    <div className="space-y-4" dir="rtl">
      <div className="space-y-2">
        <Label className="block text-right">שדה לעדכון</Label>
        <Input
          value={(config?.field_name as string) ?? ""}
          onChange={(e) => updateData({ field_name: e.target.value })}
          placeholder="למשל: phone"
          className="text-right"
        />
      </div>
      <div className="space-y-2">
        <Label className="block text-right">ערך חדש (הקלד @ למשתנים)</Label>
        <VariableInput
          value={(config?.field_value as string) ?? ""}
          onChange={(v) => updateData({ field_value: v })}
          placeholder="ערך חדש..."
          multiline={false}
        />
      </div>
    </div>
  )
}

function ConditionTagConfig({
  config,
  updateData,
}: {
  config: Record<string, unknown>
  updateData: (u: Partial<AutomationNodeData["config"]>) => void
}) {
  return (
    <div className="space-y-4" dir="rtl">
      <div className="space-y-2">
        <Label className="block text-right">בדוק תגית</Label>
        <Input
          value={(config?.tag as string) ?? ""}
          onChange={(e) => updateData({ tag: e.target.value })}
          placeholder="שם התגית..."
          className="text-right"
        />
      </div>
      <div className="space-y-2">
        <Label className="block text-right">התנאי</Label>
        <Select
          dir="rtl"
          value={(config?.operator as string) ?? "has_tag"}
          onValueChange={(v) => updateData({ operator: v })}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent dir="rtl">
            <SelectItem value="has_tag">קיימת אצל איש הקשר</SelectItem>
            <SelectItem value="no_tag">לא קיימת אצל איש הקשר</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  )
}

function PipelineSelectionConfig({
  config,
  updateData,
  pipelines,
}: {
  config: Record<string, unknown>
  updateData: (u: Partial<AutomationNodeData["config"]>) => void
  pipelines: PipelineOption[]
}) {
  const selectedPipelines = (config?.pipeline_ids as string[]) ?? []

  const togglePipeline = (pipelineId: string) => {
    const next = selectedPipelines.includes(pipelineId)
      ? selectedPipelines.filter((id) => id !== pipelineId)
      : [...selectedPipelines, pipelineId]
    updateData({ pipeline_ids: next })
  }

  return (
    <div className="space-y-4" dir="rtl">
      <div className="space-y-2">
        <Label className="block text-right">בחר פייפליינים</Label>
        <div className="flex flex-col gap-2 p-3 border rounded-lg bg-slate-50/50 max-h-[200px] overflow-y-auto">
          {pipelines.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-4">לא נמצאו פייפליינים</p>
          ) : (
            pipelines.map((p) => (
              <div key={p.id} className="flex items-center gap-3">
                <Checkbox
                  id={`pipeline-${p.id}`}
                  checked={selectedPipelines.includes(p.id)}
                  onCheckedChange={() => togglePipeline(p.id)}
                />
                <Label
                  htmlFor={`pipeline-${p.id}`}
                  className="text-sm font-medium cursor-pointer flex-1"
                >
                  {p.name}
                </Label>
              </div>
            ))
          )}
        </div>
        {selectedPipelines.length > 0 ? (
          <p className="text-[10px] text-muted-foreground mt-1">
            נבחרו {selectedPipelines.length} פייפליינים. האוטומציה תופעל עבור לידים חדשים בהם.
          </p>
        ) : (
          <p className="text-[10px] text-muted-foreground mt-1">
            אם לא נבחר אף פייפליין, האוטומציה תופעל עבור כל ליד חדש בכל פייפליין.
          </p>
        )}
      </div>
    </div>
  )
}

function parseBodyFields(template: string): { name: string; value: string }[] {
  try {
    const o = JSON.parse(template || "{}")
    if (o && typeof o === "object" && !Array.isArray(o))
      return Object.entries(o).map(([name, value]) => ({
        name,
        value: typeof value === "string" ? value : JSON.stringify(value ?? ""),
      }))
  } catch {
    // ignore
  }
  return []
}

function WebhookConfig({
  config,
  updateData,
}: {
  config: Record<string, unknown>
  updateData: (u: Partial<AutomationNodeData["config"]>) => void
}) {
  const bodyTemplate = (config?.body_template as string) ?? "{}"
  const [bodyTab, setBodyTab] = useState<"json" | "fields">("json")
  const [bodyFields, setBodyFields] = useState<{ name: string; value: string }[]>([])

  const syncFieldsToTemplate = useCallback(
    (fields: { name: string; value: string }[]) => {
      const o: Record<string, string> = {}
      fields.forEach((f) => {
        if (f.name.trim()) o[f.name.trim()] = f.value
      })
      updateData({ body_template: JSON.stringify(o, null, 2) })
    },
    [updateData]
  )

  const switchToFields = useCallback(() => {
    setBodyFields(parseBodyFields(bodyTemplate))
    setBodyTab("fields")
  }, [bodyTemplate])

  const addField = useCallback(() => {
    const next = [...bodyFields, { name: "", value: "" }]
    setBodyFields(next)
    syncFieldsToTemplate(next)
  }, [bodyFields, syncFieldsToTemplate])

  const updateField = useCallback(
    (index: number, part: "name" | "value", val: string) => {
      const next = bodyFields.map((f, i) =>
        i === index ? { ...f, [part]: val } : f
      )
      setBodyFields(next)
      syncFieldsToTemplate(next)
    },
    [bodyFields, syncFieldsToTemplate]
  )

  const removeField = useCallback(
    (index: number) => {
      const next = bodyFields.filter((_, i) => i !== index)
      setBodyFields(next)
      syncFieldsToTemplate(next)
    },
    [bodyFields, syncFieldsToTemplate]
  )

  return (
    <div className="space-y-4" dir="rtl">
      <div className="space-y-2">
        <Label className="block text-right">URL (הקלד @ למשתנים)</Label>
        <VariableInput
          value={(config?.url as string) ?? ""}
          onChange={(v) => updateData({ url: v })}
          placeholder="https://..."
          multiline={false}
        />
      </div>
      <div className="space-y-2">
        <Label className="block text-right">Method</Label>
        <Select
          dir="rtl"
          value={(config?.method as string) ?? "POST"}
          onValueChange={(v) => updateData({ method: v })}
        >
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent dir="rtl">
            <SelectItem value="GET">GET</SelectItem>
            <SelectItem value="POST">POST</SelectItem>
            <SelectItem value="PUT">PUT</SelectItem>
            <SelectItem value="PATCH">PATCH</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label className="block text-right">Body</Label>
        <Tabs
          dir="rtl"
          value={bodyTab}
          onValueChange={(v) => {
            if (v === "fields") {
              switchToFields()
              setBodyTab("fields")
            } else {
              setBodyTab("json")
            }
          }}
        >
          <TabsList className="w-full grid grid-cols-2">
            <TabsTrigger value="json">JSON ידני</TabsTrigger>
            <TabsTrigger value="fields">שדות</TabsTrigger>
          </TabsList>
          <TabsContent value="json" className="mt-2">
            <VariableInput
              value={bodyTemplate}
              onChange={(v) => updateData({ body_template: v })}
              placeholder='{"deal_id": "{{deal.id}}"}'
              multiline
              className="min-h-[120px] font-mono text-xs text-right"
            />
          </TabsContent>
          <TabsContent value="fields" className="mt-2 space-y-2">
            {bodyTab === "fields" &&
              bodyFields.map((f, i) => (
                <div key={i} className="flex gap-2 items-start">
                  <Input
                    placeholder="שם שדה"
                    value={f.name}
                    onChange={(e) => updateField(i, "name", e.target.value)}
                    className="shrink-0 w-28 text-right"
                  />
                  <div className="flex-1 min-w-0">
                    <VariableInput
                      value={f.value}
                      onChange={(v) => updateField(i, "value", v)}
                      placeholder="ערך (הקלד @ למשתנים)"
                      multiline={false}
                    />
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="shrink-0"
                    onClick={() => removeField(i)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            <Button type="button" variant="outline" size="sm" onClick={addField} className="w-full">
              <Plus className="h-4 w-4 ml-1" />
              הוסף שדה
            </Button>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}

export interface PipelineOption {
  id: string
  name: string
}

export interface StageOption {
  id: string
  pipeline_id: string
  name: string
}

interface NodeConfigPanelProps {
  node: Node | null
  onConfigChange: (nodeId: string, data: Partial<AutomationNodeData>) => void
  pipelines?: PipelineOption[]
  stages?: StageOption[]
  mailingLists?: { id: string; name: string }[]
  whatsappCredentials?: { id: string; name: string; provider: "official" | "green_api" }[]
}

export function NodeConfigPanel({ node, onConfigChange, pipelines = [], stages = [], mailingLists = [], whatsappCredentials = [] }: NodeConfigPanelProps) {
  const nodeData = node?.data as unknown as AutomationNodeData | undefined
  const updateData = useCallback(
    (updates: Partial<AutomationNodeData["config"]> | { label?: string; subtype?: string }) => {
      if (!node || !nodeData) return
      if ("label" in updates || "subtype" in updates) {
        onConfigChange(node.id, {
          label: (updates.label ?? nodeData.label) as string,
          subtype: (updates.subtype ?? nodeData.subtype) as string,
          config: nodeData.config,
        })
      } else {
        onConfigChange(node.id, {
          config: { ...nodeData.config, ...updates },
        })
      }
    },
    [node, nodeData, onConfigChange]
  )

  if (!node || !nodeData) {
    return (
      <Card className="w-full max-w-sm text-right" dir="rtl">
        <CardContent className="pt-6">
          <p className="text-muted-foreground text-sm">בחר צומת לעריכה</p>
        </CardContent>
      </Card>
    )
  }

  const { type, subtype, config } = nodeData

  const Icon = type === "trigger" ? Zap : type === "condition" ? GitBranch : subtype === "send_whatsapp" ? MessageSquare : Play

  return (
    <Card className="w-full max-w-sm text-right border-none shadow-none bg-transparent" dir="rtl">
      <CardHeader className="pb-4 pt-0 px-0">
        <div className="flex items-center gap-2 mb-1">
          <div className={cn(
            "rounded-md p-1.5",
            type === "trigger" ? "bg-amber-100 text-amber-600" :
            type === "condition" ? "bg-slate-100 text-slate-600" :
            "bg-blue-100 text-blue-600"
          )}>
            <Icon size={16} />
          </div>
          <span className="text-sm font-bold text-slate-700">הגדרות {type === "trigger" ? "טריגר" : type === "condition" ? "תנאי" : "פעולה"}</span>
        </div>
        <h3 className="text-lg font-bold text-slate-900">{nodeData.label || subtype}</h3>
      </CardHeader>
      <CardContent className="space-y-6 px-0">
        <div className="space-y-2 pb-4 border-b">
          <Label className="block text-right font-semibold">סוג {type === "trigger" ? "טריגר" : type === "condition" ? "תנאי" : "פעולה"}</Label>
          <Select
            dir="rtl"
            value={subtype}
            onValueChange={(v) => {
              let newLabel = v
              if (type === "trigger") newLabel = TRIGGER_LABELS[v] ?? v
              else if (type === "action") newLabel = ACTION_LABELS[v] ?? v
              else if (v === "condition.tag") newLabel = "תגית קיימת / לא קיימת"
              else if (v === "condition.field") newLabel = "ערך שדה שווה ל..."
              
              updateData({
                subtype: v,
                label: newLabel,
              })
            }}
          >
            <SelectTrigger className="w-full bg-white border-slate-200">
              <SelectValue />
            </SelectTrigger>
            <SelectContent dir="rtl">
              {type === "trigger" && TRIGGER_SUBTYPES.map((t) => (
                <SelectItem key={t} value={t}>{TRIGGER_LABELS[t] ?? t}</SelectItem>
              ))}
              {type === "action" && ACTION_SUBTYPES.map((a) => (
                <SelectItem key={a} value={a}>{ACTION_LABELS[a] ?? a}</SelectItem>
              ))}
              {type === "condition" && (
                <>
                  <SelectItem value="condition.tag">תגית</SelectItem>
                  <SelectItem value="condition.field">ערך שדה</SelectItem>
                </>
              )}
            </SelectContent>
          </Select>
        </div>

        {/* Dynamic Config Content */}
        {subtype === "webhook.incoming" && (
          <div className="p-4 bg-amber-50 rounded-lg border border-amber-100">
            <p className="text-xs text-amber-800 font-medium leading-relaxed">
              השתמש בכתובת ה-Webhook שתיווצר לאחר השמירה כדי לקבל נתונים ממקורות חיצוניים.
            </p>
          </div>
        )}

        {subtype === "lead.created" && (
          <PipelineSelectionConfig config={config} updateData={updateData} pipelines={pipelines} />
        )}

        {subtype === "send_whatsapp" && (
          <WhatsappConfig config={config} updateData={updateData} credentials={whatsappCredentials} />
        )}

        {subtype === "send_webhook" && (
          <WebhookConfig config={config} updateData={updateData} />
        )}

        {subtype === "add_tag" && (
          <TagConfig config={config} updateData={updateData} label="תגית להוספה" />
        )}

        {subtype === "delay" && (
          <DelayConfig config={config} updateData={updateData} />
        )}

        {subtype === "update_field" && (
          <FieldUpdateConfig config={config} updateData={updateData} />
        )}

        {subtype === "condition.tag" && (
          <ConditionTagConfig config={config} updateData={updateData} />
        )}

        {subtype === "condition.field" && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="block text-right">שם השדה</Label>
              <Input
                value={(config?.field_name as string) ?? ""}
                onChange={(e) => updateData({ field_name: e.target.value })}
                placeholder="למשל: city"
                className="text-right"
              />
            </div>
            <div className="space-y-2">
              <Label className="block text-right">ערך להשוואה</Label>
              <Input
                value={(config?.field_value as string) ?? ""}
                onChange={(e) => updateData({ field_value: e.target.value })}
                placeholder="ערך..."
                className="text-right"
              />
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
