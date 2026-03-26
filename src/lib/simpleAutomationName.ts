import type { ActionSubtype, TriggerSubtype } from "@/types/automation"
import { ACTION_LABELS, CONTACT_FIELDS, LEAD_FIELDS, TRIGGER_LABELS } from "@/types/automation"

export type SimpleNamePipeline = { id: string; name: string }
export type SimpleNameStage = { id: string; pipeline_id: string; name: string }

const DELAY_UNIT_HE: Record<string, string> = {
  minutes: "דקות",
  hours: "שעות",
  days: "ימים",
}

function pipelineName(
  id: string | undefined,
  pipelines: SimpleNamePipeline[]
): string | null {
  if (!id) return null
  return pipelines.find((p) => p.id === id)?.name ?? null
}

function stageName(
  id: string | undefined,
  stages: SimpleNameStage[]
): string | null {
  if (!id || id === "_any") return null
  return stages.find((s) => s.id === id)?.name ?? null
}

function leadFieldLabel(key: string | undefined): string | null {
  if (!key) return null
  const f = LEAD_FIELDS.find((x) => x.key === key)
  return f?.label ?? null
}

function contactFieldLabel(key: string | undefined): string | null {
  if (!key) return null
  const f = CONTACT_FIELDS.find((x) => x.key === key)
  return f?.label ?? null
}

/** חלק הפעולה — בדרך כלל בתחילת השם */
function actionPhrase(
  actionSubtype: ActionSubtype,
  actionConfig: Record<string, unknown>,
  pipelines: SimpleNamePipeline[],
  stages: SimpleNameStage[]
): string {
  switch (actionSubtype) {
    case "send_whatsapp":
      return "שליחת הודעה"
    case "add_tag": {
      const tag = String(actionConfig.tag ?? "").trim()
      return tag ? `הוספת תגית «${tag}»` : "הוספת תגית"
    }
    case "remove_tag": {
      const tag = String(actionConfig.tag ?? "").trim()
      return tag ? `הסרת תגית «${tag}»` : "הסרת תגית"
    }
    case "update_lead_field": {
      const lbl = leadFieldLabel(actionConfig.field_key as string | undefined)
      return lbl ? `עדכון ${lbl} בליד` : "עדכון שדה בליד"
    }
    case "update_contact_field": {
      const lbl = contactFieldLabel(actionConfig.field_key as string | undefined)
      return lbl ? `עדכון ${lbl} באיש קשר` : "עדכון שדה באיש קשר"
    }
    case "delay": {
      const v = Number(actionConfig.delay_value) || 1
      const u = DELAY_UNIT_HE[String(actionConfig.delay_unit ?? "minutes")] ?? "דקות"
      return `השהייה ${v} ${u}`
    }
    case "send_webhook":
      return "שליחת Webhook"
    case "move_to_stage": {
      const sid = actionConfig.stage_id as string | undefined
      const st = stageName(sid, stages)
      const pid = actionConfig.pipeline_id as string | undefined
      const pn = pipelineName(pid, pipelines)
      if (st && pn) return `העברה לסטייג׳ ${st} (${pn})`
      if (st) return `העברה לסטייג׳ ${st}`
      return "העברה לסטייג׳"
    }
    default:
      return ACTION_LABELS[actionSubtype] ?? actionSubtype
  }
}

/** חלק הטריגר — אחרי הפעולה */
function triggerPhrase(
  triggerSubtype: TriggerSubtype,
  triggerConfig: Record<string, unknown>,
  pipelines: SimpleNamePipeline[],
  stages: SimpleNameStage[]
): string {
  switch (triggerSubtype) {
    case "lead.created": {
      const pn = pipelineName(triggerConfig.pipeline_id as string | undefined, pipelines)
      return pn ? `ביצירת ליד חדש ב${pn}` : "ביצירת ליד חדש"
    }
    case "lead.stage_entered": {
      const sid = triggerConfig.stage_id as string | undefined
      if (sid === "_any") return "בכניסה לכל סטייג׳"
      const sn = stageName(sid, stages)
      if (sn) return `בכניסה לסטייג׳ ל${sn}`
      return "בכניסה לסטייג׳"
    }
    case "lead.won": {
      const pn = pipelineName(triggerConfig.pipeline_id as string | undefined, pipelines)
      return pn ? `בזכייה בליד ב${pn}` : "בזכייה בליד"
    }
    case "lead.lost": {
      const pn = pipelineName(triggerConfig.pipeline_id as string | undefined, pipelines)
      return pn ? `בהפסד של ליד ב${pn}` : "בהפסד של ליד"
    }
    case "contact.created":
      return "ביצירת איש קשר"
    case "contact.tag_added": {
      const tag = String(triggerConfig.tag ?? "").trim()
      return tag ? `בהוספת תגית «${tag}» לאיש קשר` : "בהוספת תגית לאיש קשר"
    }
    default:
      return TRIGGER_LABELS[triggerSubtype] ?? triggerSubtype
  }
}

/**
 * שם תצוגה אוטומטי לאוטומציה פשוטה, לפי סוג טריגר/פעולה והגדרות (סטייג׳, פייפליין וכו').
 */
export function buildSimpleAutomationAutoName(
  triggerSubtype: TriggerSubtype,
  actionSubtype: ActionSubtype,
  triggerConfig: Record<string, unknown>,
  actionConfig: Record<string, unknown>,
  pipelines: SimpleNamePipeline[],
  stages: SimpleNameStage[]
): string {
  const a = actionPhrase(actionSubtype, actionConfig, pipelines, stages)
  const t = triggerPhrase(triggerSubtype, triggerConfig, pipelines, stages)
  const combined = `${a} ${t}`.replace(/\s+/g, " ").trim()
  const max = 200
  return combined.length <= max ? combined : `${combined.slice(0, max - 1)}…`
}
