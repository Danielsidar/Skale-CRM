/**
 * Automation Builder: node/edge types and trigger/action subtypes (simplified v1).
 */

export const TRIGGER_SUBTYPES = [
  "contact.tag_added",
  "webhook.incoming",
  "lead.created",
] as const

export const ACTION_SUBTYPES = [
  "send_whatsapp",
  "add_tag",
  "delay",
  "update_field",
  "send_webhook",
] as const

export type TriggerSubtype = (typeof TRIGGER_SUBTYPES)[number]
export type ActionSubtype = (typeof ACTION_SUBTYPES)[number]

export type NodeType = "trigger" | "condition" | "action"

export interface AutomationNodeData {
  type: NodeType
  subtype: string
  label: string
  config: Record<string, unknown>
  nodeId?: string
}

export interface ConditionConfig {
  logic: "and" | "or"
  rules: Array<{
    field: string
    operator: "eq" | "neq" | "gt" | "gte" | "lt" | "lte" | "contains" | "has_tag" | "no_tag"
    value: string | number | boolean
  }>
}

export const TRIGGER_LABELS: Record<string, string> = {
  "contact.tag_added": "התווספה תגית",
  "webhook.incoming": "Webhook נכנס",
  "lead.created": "ליד חדש",
}

export const ACTION_LABELS: Record<string, string> = {
  send_whatsapp: "שלח וואטסאפ",
  add_tag: "הוסף תגית",
  delay: "השהייה (Delay)",
  update_field: "עדכון שדה",
  send_webhook: "שליחת Webhook",
}

/** משתנים זמינים ב-URL וב-body של Webhook (הקלד @ להצגה) */
export const WEBHOOK_VARIABLES: { path: string; label: string; category: string }[] = [
  { path: "deal.id", label: "מזהה", category: "עסקה" },
  { path: "deal.title", label: "כותרת", category: "עסקה" },
  { path: "deal.value", label: "ערך", category: "עסקה" },
  { path: "deal.pipeline_id", label: "פייפליין", category: "עסקה" },
  { path: "deal.stage_id", label: "שלב", category: "עסקה" },
  { path: "deal.contact_id", label: "איש קשר", category: "עסקה" },
  { path: "contact.id", label: "מזהה", category: "איש קשר" },
  { path: "contact.full_name", label: "שם מלא", category: "איש קשר" },
  { path: "contact.email", label: "אימייל", category: "איש קשר" },
  { path: "contact.phone", label: "טלפון", category: "איש קשר" },
  { path: "trigger", label: "סוג טריגר", category: "אירוע" },
  { path: "entity_type", label: "סוג ישות", category: "אירוע" },
  { path: "entity_id", label: "מזהה ישות", category: "אירוע" },
  { path: "pipeline_id", label: "פייפליין", category: "אירוע" },
  { path: "stage_id", label: "שלב", category: "אירוע" },
]
