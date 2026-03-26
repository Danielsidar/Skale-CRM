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
import {
  TRIGGER_SUBTYPES,
  TRIGGER_LABELS,
  ACTION_LABELS,
  ACTION_SUBTYPES,
  LEAD_FIELDS,
  CONTACT_FIELDS,
} from "@/types/automation"
import { Plus, Trash2, Webhook, GitBranch, Play, MessageSquare } from "lucide-react"
import { cn } from "@/lib/utils"

interface WhatsappCredential {
  id: string
  name: string
  provider: "official" | "green_api"
}

// ─── Trigger configs ──────────────────────────────────────────────────────────

function StageEnteredTriggerConfig({
  config,
  updateData,
  pipelines,
  stages,
}: {
  config: Record<string, unknown>
  updateData: (u: Partial<AutomationNodeData["config"]>) => void
  pipelines: PipelineOption[]
  stages: StageOption[]
}) {
  const selectedPipelineId = (config?.pipeline_id as string) ?? ""
  const selectedStageId = (config?.stage_id as string) ?? ""
  const filteredStages = selectedPipelineId ? stages.filter((s) => s.pipeline_id === selectedPipelineId) : []

  return (
    <div className="space-y-4" dir="rtl">
      <div className="space-y-2">
        <Label className="block text-right">פייפליין</Label>
        <Select dir="rtl" value={selectedPipelineId} onValueChange={(v) => updateData({ pipeline_id: v, stage_id: "" })}>
          <SelectTrigger className="w-full bg-white">
            <SelectValue placeholder="כל הפייפליינים" />
          </SelectTrigger>
          <SelectContent dir="rtl">
            {pipelines.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label className="block text-right">סטייג'</Label>
        <Select dir="rtl" value={selectedStageId} onValueChange={(v) => updateData({ stage_id: v })} disabled={!selectedPipelineId}>
          <SelectTrigger className="w-full bg-white">
            <SelectValue placeholder={selectedPipelineId ? "בחר סטייג'..." : "בחר פייפליין תחילה"} />
          </SelectTrigger>
          <SelectContent dir="rtl">
            <SelectItem value="_any">כל סטייג'</SelectItem>
            {filteredStages.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <p className="text-[10px] text-muted-foreground">האוטומציה תופעל כאשר ליד נכנס לסטייג' הנבחר.</p>
    </div>
  )
}

function LeadCreatedTriggerConfig({
  config,
  updateData,
  pipelines,
}: {
  config: Record<string, unknown>
  updateData: (u: Partial<AutomationNodeData["config"]>) => void
  pipelines: PipelineOption[]
}) {
  return (
    <div className="space-y-4" dir="rtl">
      <div className="space-y-2">
        <Label className="block text-right">פייפליין (אופציונלי)</Label>
        <Select dir="rtl" value={(config?.pipeline_id as string) ?? ""} onValueChange={(v) => updateData({ pipeline_id: v === "_any" ? "" : v })}>
          <SelectTrigger className="w-full bg-white">
            <SelectValue placeholder="כל הפייפליינים" />
          </SelectTrigger>
          <SelectContent dir="rtl">
            <SelectItem value="_any">כל הפייפליינים</SelectItem>
            {pipelines.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <p className="text-[10px] text-muted-foreground">האוטומציה תופעל בכל פעם שנוצר ליד חדש (בפייפליין הנבחר).</p>
    </div>
  )
}

function LeadWonLostTriggerConfig({
  config,
  updateData,
  pipelines,
}: {
  config: Record<string, unknown>
  updateData: (u: Partial<AutomationNodeData["config"]>) => void
  pipelines: PipelineOption[]
}) {
  return (
    <div className="space-y-4" dir="rtl">
      <div className="space-y-2">
        <Label className="block text-right">פייפליין (אופציונלי)</Label>
        <Select dir="rtl" value={(config?.pipeline_id as string) ?? ""} onValueChange={(v) => updateData({ pipeline_id: v === "_any" ? "" : v })}>
          <SelectTrigger className="w-full bg-white">
            <SelectValue placeholder="כל הפייפליינים" />
          </SelectTrigger>
          <SelectContent dir="rtl">
            <SelectItem value="_any">כל הפייפליינים</SelectItem>
            {pipelines.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
    </div>
  )
}

function ContactTagTriggerConfig({
  config,
  updateData,
}: {
  config: Record<string, unknown>
  updateData: (u: Partial<AutomationNodeData["config"]>) => void
}) {
  return (
    <div className="space-y-4" dir="rtl">
      <div className="space-y-2">
        <Label className="block text-right">שם התגית (אופציונלי)</Label>
        <Input
          value={(config?.tag as string) ?? ""}
          onChange={(e) => updateData({ tag: e.target.value })}
          placeholder='כל תגית, או כתוב שם ספציפי...'
          className="text-right"
        />
      </div>
      <p className="text-[10px] text-muted-foreground">תשאיר ריק כדי להפעיל על כל הוספת תגית.</p>
    </div>
  )
}

// ─── Action configs ───────────────────────────────────────────────────────────

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
      <div className="p-3 rounded-lg bg-green-50 border border-green-100 text-xs text-green-800">
        ההודעה תישלח לטלפון של <strong>איש הקשר</strong> המקושר לליד.
      </div>
      <div className="space-y-2">
        <Label className="block text-right">חיבור וואטסאפ</Label>
        <Select dir="rtl" value={(config?.credential_id as string) ?? ""} onValueChange={(v) => updateData({ credential_id: v })}>
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

function TagConfig({
  config,
  updateData,
  description,
}: {
  config: Record<string, unknown>
  updateData: (u: Partial<AutomationNodeData["config"]>) => void
  description: string
}) {
  return (
    <div className="space-y-4" dir="rtl">
      <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-100 text-xs text-emerald-800">
        {description}
      </div>
      <div className="space-y-2">
        <Label className="block text-right">שם התגית</Label>
        <Input
          value={(config?.tag as string) ?? ""}
          onChange={(e) => updateData({ tag: e.target.value })}
          placeholder="למשל: VIP"
          className="text-right"
        />
      </div>
    </div>
  )
}

function UpdateLeadFieldConfig({
  config,
  updateData,
}: {
  config: Record<string, unknown>
  updateData: (u: Partial<AutomationNodeData["config"]>) => void
}) {
  return (
    <div className="space-y-4" dir="rtl">
      <div className="p-3 rounded-lg bg-blue-50 border border-blue-100 text-xs text-blue-800">
        מעדכן שדה של <strong>הליד</strong> שהפעיל את האוטומציה.
      </div>
      <div className="space-y-2">
        <Label className="block text-right">שדה לעדכון</Label>
        <Select dir="rtl" value={(config?.field_key as string) ?? ""} onValueChange={(v) => updateData({ field_key: v })}>
          <SelectTrigger className="w-full bg-white">
            <SelectValue placeholder="בחר שדה..." />
          </SelectTrigger>
          <SelectContent dir="rtl">
            {LEAD_FIELDS.map((f) => <SelectItem key={f.key} value={f.key}>{f.label}</SelectItem>)}
          </SelectContent>
        </Select>
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

function UpdateContactFieldConfig({
  config,
  updateData,
}: {
  config: Record<string, unknown>
  updateData: (u: Partial<AutomationNodeData["config"]>) => void
}) {
  return (
    <div className="space-y-4" dir="rtl">
      <div className="p-3 rounded-lg bg-purple-50 border border-purple-100 text-xs text-purple-800">
        מעדכן שדה של <strong>איש הקשר</strong> המקושר לליד.
      </div>
      <div className="space-y-2">
        <Label className="block text-right">שדה לעדכון</Label>
        <Select dir="rtl" value={(config?.field_key as string) ?? ""} onValueChange={(v) => updateData({ field_key: v })}>
          <SelectTrigger className="w-full bg-white">
            <SelectValue placeholder="בחר שדה..." />
          </SelectTrigger>
          <SelectContent dir="rtl">
            {CONTACT_FIELDS.map((f) => <SelectItem key={f.key} value={f.key}>{f.label}</SelectItem>)}
          </SelectContent>
        </Select>
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
            min={1}
            value={(config?.delay_value as number) ?? 1}
            onChange={(e) => updateData({ delay_value: parseInt(e.target.value) || 1 })}
            className="text-right"
          />
        </div>
        <div className="space-y-2">
          <Label className="block text-right">יחידות</Label>
          <Select dir="rtl" value={(config?.delay_unit as string) ?? "minutes"} onValueChange={(v) => updateData({ delay_unit: v })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
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

function MoveToStageActionConfig({
  config,
  updateData,
  pipelines,
  stages,
}: {
  config: Record<string, unknown>
  updateData: (u: Partial<AutomationNodeData["config"]>) => void
  pipelines: PipelineOption[]
  stages: StageOption[]
}) {
  const selectedPipelineId = (config?.pipeline_id as string) ?? ""
  const filteredStages = selectedPipelineId ? stages.filter((s) => s.pipeline_id === selectedPipelineId) : []

  return (
    <div className="space-y-4" dir="rtl">
      <div className="p-3 rounded-lg bg-blue-50 border border-blue-100 text-xs text-blue-800">
        הליד יועבר לסטייג' הנבחר. אם הסטייג' בפייפליין אחר — הליד יועבר לשם.
      </div>
      <div className="space-y-2">
        <Label className="block text-right">פייפליין</Label>
        <Select dir="rtl" value={selectedPipelineId} onValueChange={(v) => updateData({ pipeline_id: v, stage_id: "" })}>
          <SelectTrigger className="w-full bg-white">
            <SelectValue placeholder="בחר פייפליין..." />
          </SelectTrigger>
          <SelectContent dir="rtl">
            {pipelines.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label className="block text-right">סטייג' יעד</Label>
        <Select dir="rtl" value={(config?.stage_id as string) ?? ""} onValueChange={(v) => updateData({ stage_id: v })} disabled={!selectedPipelineId}>
          <SelectTrigger className="w-full bg-white">
            <SelectValue placeholder={selectedPipelineId ? "בחר סטייג'..." : "בחר פייפליין תחילה"} />
          </SelectTrigger>
          <SelectContent dir="rtl">
            {filteredStages.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
          </SelectContent>
        </Select>
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
        <Label className="block text-right">בדוק תגית של איש הקשר</Label>
        <Input
          value={(config?.tag as string) ?? ""}
          onChange={(e) => updateData({ tag: e.target.value })}
          placeholder="שם התגית..."
          className="text-right"
        />
      </div>
      <div className="space-y-2">
        <Label className="block text-right">התנאי</Label>
        <Select dir="rtl" value={(config?.operator as string) ?? "has_tag"} onValueChange={(v) => updateData({ operator: v })}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent dir="rtl">
            <SelectItem value="has_tag">קיימת אצל איש הקשר</SelectItem>
            <SelectItem value="no_tag">לא קיימת אצל איש הקשר</SelectItem>
          </SelectContent>
        </Select>
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
  } catch { /* ignore */ }
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
      fields.forEach((f) => { if (f.name.trim()) o[f.name.trim()] = f.value })
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

  const updateField = useCallback((index: number, part: "name" | "value", val: string) => {
    const next = bodyFields.map((f, i) => i === index ? { ...f, [part]: val } : f)
    setBodyFields(next)
    syncFieldsToTemplate(next)
  }, [bodyFields, syncFieldsToTemplate])

  const removeField = useCallback((index: number) => {
    const next = bodyFields.filter((_, i) => i !== index)
    setBodyFields(next)
    syncFieldsToTemplate(next)
  }, [bodyFields, syncFieldsToTemplate])

  return (
    <div className="space-y-4" dir="rtl">
      <div className="space-y-2">
        <Label className="block text-right">URL (הקלד @ למשתנים)</Label>
        <VariableInput value={(config?.url as string) ?? ""} onChange={(v) => updateData({ url: v })} placeholder="https://..." multiline={false} />
      </div>
      <div className="space-y-2">
        <Label className="block text-right">Method</Label>
        <Select dir="rtl" value={(config?.method as string) ?? "POST"} onValueChange={(v) => updateData({ method: v })}>
          <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
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
        <Tabs dir="rtl" value={bodyTab} onValueChange={(v) => { if (v === "fields") { switchToFields(); setBodyTab("fields") } else { setBodyTab("json") } }}>
          <TabsList className="w-full grid grid-cols-2">
            <TabsTrigger value="json">JSON ידני</TabsTrigger>
            <TabsTrigger value="fields">שדות</TabsTrigger>
          </TabsList>
          <TabsContent value="json" className="mt-2">
            <VariableInput value={bodyTemplate} onChange={(v) => updateData({ body_template: v })} placeholder='{"deal_id": "{{deal.id}}"}' multiline className="min-h-[120px] font-mono text-xs text-right" />
          </TabsContent>
          <TabsContent value="fields" className="mt-2 space-y-2">
            {bodyTab === "fields" && bodyFields.map((f, i) => (
              <div key={i} className="flex gap-2 items-start">
                <Input placeholder="שם שדה" value={f.name} onChange={(e) => updateField(i, "name", e.target.value)} className="shrink-0 w-28 text-right" />
                <div className="flex-1 min-w-0">
                  <VariableInput value={f.value} onChange={(v) => updateField(i, "value", v)} placeholder="ערך (הקלד @ למשתנים)" multiline={false} />
                </div>
                <Button type="button" variant="ghost" size="icon" className="shrink-0" onClick={() => removeField(i)}>
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

// ─── Exports ──────────────────────────────────────────────────────────────────

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
  /** מצב יצירה פשוטה: רק שדות קונפיגורציה, בלי כותרת כבדה ובלי בחירת סוג צומת */
  embedMode?: boolean
}

export function NodeConfigPanel({
  node,
  onConfigChange,
  pipelines = [],
  stages = [],
  mailingLists = [],
  whatsappCredentials = [],
  embedMode = false,
}: NodeConfigPanelProps) {
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
        onConfigChange(node.id, { config: { ...nodeData.config, ...updates } })
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

  const Icon = type === "trigger" ? () => <span>⚡</span> : type === "condition" ? GitBranch : subtype === "send_whatsapp" ? MessageSquare : Play

  const configBody = (
    <>
        {/* Type selector */}
        {!embedMode && (
        <div className="space-y-2 pb-4 border-b">
          <Label className="block text-right font-semibold">
            סוג {type === "trigger" ? "טריגר" : type === "condition" ? "תנאי" : "פעולה"}
          </Label>
          <Select
            dir="rtl"
            value={subtype}
            onValueChange={(v) => {
              let newLabel = v
              if (type === "trigger") newLabel = TRIGGER_LABELS[v] ?? v
              else if (type === "action") newLabel = ACTION_LABELS[v] ?? v
              else if (v === "condition.tag") newLabel = "תגית קיימת / לא קיימת"
              else if (v === "condition.field") newLabel = "ערך שדה שווה ל..."
              updateData({ subtype: v, label: newLabel })
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
        )}

        {/* Trigger configs */}
        {subtype === "lead.created" && (
          <LeadCreatedTriggerConfig config={config} updateData={updateData} pipelines={pipelines} />
        )}
        {subtype === "lead.stage_entered" && (
          <StageEnteredTriggerConfig config={config} updateData={updateData} pipelines={pipelines} stages={stages} />
        )}
        {(subtype === "lead.won" || subtype === "lead.lost") && (
          <LeadWonLostTriggerConfig config={config} updateData={updateData} pipelines={pipelines} />
        )}
        {subtype === "contact.created" && (
          <p className="text-[10px] text-muted-foreground">האוטומציה תופעל בכל פעם שנוצר איש קשר חדש.</p>
        )}
        {subtype === "contact.tag_added" && (
          <ContactTagTriggerConfig config={config} updateData={updateData} />
        )}

        {/* Action configs */}
        {subtype === "send_whatsapp" && (
          <WhatsappConfig config={config} updateData={updateData} credentials={whatsappCredentials} />
        )}
        {subtype === "add_tag" && (
          <TagConfig
            config={config}
            updateData={updateData}
            description="התגית תתווסף לאיש הקשר המקושר לליד."
          />
        )}
        {subtype === "remove_tag" && (
          <TagConfig
            config={config}
            updateData={updateData}
            description="התגית תוסר מאיש הקשר המקושר לליד."
          />
        )}
        {subtype === "update_lead_field" && (
          <UpdateLeadFieldConfig config={config} updateData={updateData} />
        )}
        {subtype === "update_contact_field" && (
          <UpdateContactFieldConfig config={config} updateData={updateData} />
        )}
        {subtype === "delay" && (
          <DelayConfig config={config} updateData={updateData} />
        )}
        {subtype === "send_webhook" && (
          <WebhookConfig config={config} updateData={updateData} />
        )}
        {subtype === "move_to_stage" && (
          <MoveToStageActionConfig config={config} updateData={updateData} pipelines={pipelines} stages={stages} />
        )}

        {/* Condition configs */}
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
                placeholder="למשל: deal.value או contact.city"
                className="text-right"
              />
              <p className="text-[10px] text-muted-foreground">השתמש ב- deal.FIELD לשדות ליד, contact.FIELD לשדות איש קשר</p>
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
    </>
  )

  if (embedMode) {
    return (
      <div className="w-full text-right space-y-6" dir="rtl">
        {configBody}
      </div>
    )
  }

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
          <span className="text-sm font-bold text-slate-700">
            הגדרות {type === "trigger" ? "טריגר" : type === "condition" ? "תנאי" : "פעולה"}
          </span>
        </div>
        <h3 className="text-lg font-bold text-slate-900">{nodeData.label || subtype}</h3>
      </CardHeader>

      <CardContent className="space-y-6 px-0">
        {configBody}
      </CardContent>
    </Card>
  )
}
