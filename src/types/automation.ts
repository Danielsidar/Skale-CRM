/**
 * Automation Builder: node/edge types and trigger/action subtypes.
 */

export const TRIGGER_SUBTYPES = [
  "lead.created",
  "lead.stage_entered",
  "lead.won",
  "lead.lost",
  "contact.created",
  "contact.tag_added",
] as const

export const ACTION_SUBTYPES = [
  "send_whatsapp",
  "add_tag",
  "remove_tag",
  "update_lead_field",
  "update_contact_field",
  "delay",
  "send_webhook",
  "move_to_stage",
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
  "lead.created": "ליד חדש נוצר",
  "lead.stage_entered": "כניסה לסטייג'",
  "lead.won": "ליד נסגר — זכייה",
  "lead.lost": "ליד נסגר — הפסד",
  "contact.created": "איש קשר חדש נוצר",
  "contact.tag_added": "תגית נוספה לאיש קשר",
}

export const ACTION_LABELS: Record<string, string> = {
  send_whatsapp: "שלח וואטסאפ",
  add_tag: "הוסף תגית לאיש קשר",
  remove_tag: "הסר תגית מאיש קשר",
  update_lead_field: "עדכן שדה של הליד",
  update_contact_field: "עדכן שדה של איש הקשר",
  delay: "השהייה (Delay)",
  send_webhook: "שליחת Webhook",
  move_to_stage: "העברה לסטייג'",
}

/** Which entity each action operates on — shown as a badge in the node */
export const ACTION_ENTITY_TARGET: Record<string, string> = {
  send_whatsapp: "איש קשר",
  add_tag: "איש קשר",
  remove_tag: "איש קשר",
  update_lead_field: "ליד",
  update_contact_field: "איש קשר",
  delay: "זרימה",
  send_webhook: "כללי",
  move_to_stage: "ליד",
}

/** Updatable fields on a deal (ליד) */
export const LEAD_FIELDS = [
  { key: "title", label: "שם הליד" },
  { key: "value", label: "ערך הליד (מספר)" },
  { key: "source", label: "מקור" },
] as const

/** Updatable fields on a contact (איש קשר) */
export const CONTACT_FIELDS = [
  { key: "full_name", label: "שם מלא" },
  { key: "phone", label: "טלפון" },
  { key: "email", label: "אימייל" },
  { key: "source", label: "מקור" },
] as const

/** משתנים זמינים ב-URL וב-body של Webhook (הקלד @ להצגה) */
export const WEBHOOK_VARIABLES: { path: string; label: string; category: string }[] = [
  { path: "deal.id", label: "מזהה", category: "ליד" },
  { path: "deal.title", label: "שם הליד", category: "ליד" },
  { path: "deal.value", label: "ערך", category: "ליד" },
  { path: "deal.pipeline_id", label: "פייפליין", category: "ליד" },
  { path: "deal.stage_id", label: "שלב", category: "ליד" },
  { path: "contact.id", label: "מזהה", category: "איש קשר" },
  { path: "contact.full_name", label: "שם מלא", category: "איש קשר" },
  { path: "contact.first_name", label: "שם פרטי (מהשם המלא)", category: "איש קשר" },
  { path: "contact.email", label: "אימייל", category: "איש קשר" },
  { path: "contact.phone", label: "טלפון", category: "איש קשר" },
  { path: "appointment.id", label: "מזהה פגישה", category: "פגישות" },
  { path: "appointment.title", label: "כותרת", category: "פגישות" },
  { path: "appointment.description", label: "תיאור", category: "פגישות" },
  { path: "appointment.date_formatted", label: "תאריך פגישה", category: "פגישות" },
  { path: "appointment.time_formatted", label: "זמן פגישה", category: "פגישות" },
  { path: "appointment.day_name", label: "יום פגישה", category: "פגישות" },
  { path: "appointment.end_time_formatted", label: "שעת סיום", category: "פגישות" },
  { path: "appointment.date_short", label: "תאריך (מקוצר)", category: "פגישות" },
  { path: "appointment.date_iso", label: "תאריך (YYYY-MM-DD)", category: "פגישות" },
  { path: "appointment.start_time", label: "התחלה (ISO)", category: "פגישות" },
  { path: "appointment.end_time", label: "סיום (ISO)", category: "פגישות" },
  { path: "appointment.status", label: "סטטוס", category: "פגישות" },
  { path: "appointment.location", label: "מיקום", category: "פגישות" },
  { path: "appointment.meeting_link", label: "קישור לפגישה", category: "פגישות" },
  { path: "trigger", label: "סוג טריגר", category: "אירוע" },
  { path: "pipeline_id", label: "פייפליין", category: "אירוע" },
  { path: "stage_id", label: "שלב", category: "אירוע" },
]
