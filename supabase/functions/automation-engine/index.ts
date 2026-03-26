import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const MAX_DEPTH = 10

interface RunPayload {
  business_id: string
  trigger_subtype: string
  entity_type: string
  entity_id: string
  payload?: Record<string, unknown>
  parent_run_id?: string | null
  execution_depth?: number
}

interface AutomationNode {
  id: string
  type: string
  subtype: string
  config: Record<string, unknown>
}

interface AutomationEdge {
  from_node_id: string
  to_node_id: string
  branch_label: string | null
}

function getValue(obj: unknown, path: string): unknown {
  const parts = path.split(".")
  let cur: unknown = obj
  for (const p of parts) {
    if (cur == null) return undefined
    cur = (cur as Record<string, unknown>)[p]
  }
  return cur
}

function interpolate(template: string, ctx: Record<string, unknown>): string {
  return template.replace(/\{\{([^}]+)\}\}/g, (_, key) => {
    const v = getValue(ctx, key.trim())
    return v != null ? String(v) : ""
  })
}

function interpolateObject(obj: unknown, ctx: Record<string, unknown>): unknown {
  if (typeof obj === "string") return interpolate(obj, ctx)
  if (Array.isArray(obj)) return obj.map((x) => interpolateObject(x, ctx))
  if (obj && typeof obj === "object") {
    const out: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(obj)) out[k] = interpolateObject(v, ctx)
    return out
  }
  return obj
}

function firstNameFromFullName(full: unknown): string {
  const t = String(full ?? "").trim()
  if (!t) return ""
  return t.split(/\s+/)[0] ?? ""
}

/** שדות תצוגה לתבניות {{appointment.*}} — ממולא מהפגישה הקרובה או מ־payload.appointment */
function appointmentContextFromRow(row: Record<string, unknown> | null | undefined): Record<string, unknown> {
  if (!row || typeof row !== "object") return {}
  const start = row.start_time ? new Date(String(row.start_time)) : null
  const end = row.end_time ? new Date(String(row.end_time)) : null
  const okS = start != null && !Number.isNaN(start.getTime())
  const okE = end != null && !Number.isNaN(end.getTime())
  return {
    ...row,
    date_formatted: okS
      ? start!.toLocaleDateString("he-IL", { year: "numeric", month: "long", day: "numeric" })
      : "",
    day_name: okS
      ? start!.toLocaleDateString("he-IL", { weekday: "long" })
      : "",
    time_formatted: okS ? start!.toLocaleTimeString("he-IL", { hour: "2-digit", minute: "2-digit" }) : "",
    end_time_formatted: okE ? end!.toLocaleTimeString("he-IL", { hour: "2-digit", minute: "2-digit" }) : "",
    date_short: okS ? start!.toLocaleDateString("he-IL") : "",
    date_iso: okS ? start!.toISOString().slice(0, 10) : "",
  }
}

/**
 * Green API SendMessage expects chatId like "79876543210@c.us" — full international
 * number (no +), never a national leading 0 (e.g. Israeli 05… must become 9725…).
 */
function normalizeDigitsForGreenApiChatId(phone: string): string {
  let d = phone.replace(/\D/g, "")
  if (d.startsWith("00")) d = d.slice(2)
  if (!d) return ""

  // Already has common country codes
  if (d.startsWith("972")) return d
  if (d.startsWith("1") && d.length === 11) return d

  // Israeli national: 0 + 9 digits (e.g. 0501234567 → 972501234567)
  if (d.startsWith("0") && d.length === 10) {
    return `972${d.slice(1)}`
  }
  // Israeli mobile stored without leading 0 (9 digits starting with 5)
  if (d.length === 9 && d.startsWith("5")) {
    return `972${d}`
  }
  // US/Canada NANP without country code
  if (d.length === 10 && d[0] !== "0") {
    return `1${d}`
  }

  return d
}

function evaluateCondition(
  config: { logic?: string; rules?: Array<{ field: string; operator: string; value: unknown }> },
  ctx: Record<string, unknown>
): boolean {
  const rules = config?.rules ?? []
  if (rules.length === 0) return true
  const logic = config.logic ?? "and"
  const results = rules.map((r) => {
    const actual = getValue(ctx, r.field)
    const expected = r.value
    switch (r.operator) {
      case "eq": return actual == expected
      case "neq": return actual != expected
      case "gt": return Number(actual) > Number(expected)
      case "gte": return Number(actual) >= Number(expected)
      case "lt": return Number(actual) < Number(expected)
      case "lte": return Number(actual) <= Number(expected)
      case "contains":
        return Array.isArray(actual)
          ? (actual as unknown[]).includes(expected)
          : String(actual).includes(String(expected))
      case "has_tag":
        return Array.isArray(actual) && (actual as string[]).includes(expected as string)
      case "no_tag":
        return !Array.isArray(actual) || !(actual as string[]).includes(expected as string)
      default: return false
    }
  })
  return logic === "or" ? results.some(Boolean) : results.every(Boolean)
}

async function sendWebhookWithRetry(
  url: string,
  method: string,
  body: unknown,
  retries = 3
): Promise<{ ok: boolean; status?: number; body?: string; error?: string }> {
  let lastErr: string | undefined
  for (let i = 0; i < retries; i++) {
    try {
      const fetchOpts: RequestInit = {
        method: method || "POST",
        headers: { "Content-Type": "application/json" },
        signal: AbortSignal.timeout(15000),
      }
      if (method !== "GET" && method !== "HEAD") {
        fetchOpts.body = typeof body === "object" ? JSON.stringify(body) : String(body)
      }
      const res = await fetch(url, fetchOpts)
      const text = await res.text()
      if (!res.ok) {
        lastErr = `HTTP ${res.status}: ${text}`
        await new Promise((r) => setTimeout(r, Math.pow(2, i) * 1000))
        continue
      }
      return { ok: true, status: res.status, body: text }
    } catch (e) {
      lastErr = String(e)
      await new Promise((r) => setTimeout(r, Math.pow(2, i) * 1000))
    }
  }
  return { ok: false, error: lastErr }
}

const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, content-type",
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  })
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders })

  try {
    const body = (await req.json()) as RunPayload
    const {
      business_id,
      trigger_subtype,
      entity_type,
      entity_id,
      payload = {},
      parent_run_id = null,
      execution_depth = 0,
    } = body

    if (!business_id || !trigger_subtype || !entity_type || !entity_id) {
      return jsonResponse({ error: "Missing required fields" }, 400)
    }
    if (execution_depth >= MAX_DEPTH) {
      return jsonResponse({ error: "Max execution depth exceeded" }, 400)
    }

    console.log("[automation-engine] run", {
      business_id,
      trigger_subtype,
      entity_type,
      entity_id,
      depth: execution_depth,
      payload_keys: payload && typeof payload === "object" ? Object.keys(payload as object) : [],
    })

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    const supabase = createClient(supabaseUrl, serviceKey)

    const { data: automations } = await supabase
      .from("automations")
      .select("id")
      .eq("business_id", business_id)
      .eq("status", "active")

    if (!automations?.length) {
      console.log("[automation-engine] no active automations for business", business_id)
      return jsonResponse({ triggered: 0 })
    }

    // Load entity and related contact
    let entity: Record<string, unknown> = {}
    let relatedContact: Record<string, unknown> = {}

    if (entity_type === "deal") {
      const { data } = await supabase.from("deals").select("*").eq("id", entity_id).single()
      entity = (data as Record<string, unknown>) ?? {}
      const contactId = entity?.contact_id as string | undefined
      if (contactId) {
        const { data: c } = await supabase.from("contacts").select("*").eq("id", contactId).single()
        relatedContact = (c as Record<string, unknown>) ?? {}
      }
    } else if (entity_type === "contact") {
      const { data } = await supabase.from("contacts").select("*").eq("id", entity_id).single()
      entity = (data as Record<string, unknown>) ?? {}
    } else if (entity_type === "task" || entity_type === "activity") {
      const { data } = await supabase.from("activities").select("*").eq("id", entity_id).single()
      entity = (data as Record<string, unknown>) ?? {}
    }

    const ctx: Record<string, unknown> = {
      trigger: trigger_subtype,
      entity_type,
      entity_id,
      deal: entity_type === "deal" ? entity : (payload?.deal ?? {}),
      contact: entity_type === "contact"
        ? entity
        : Object.keys(relatedContact).length ? relatedContact : (payload?.contact ?? {}),
      task: entity_type === "task" || entity_type === "activity" ? entity : (payload?.task ?? {}),
      ...payload,
    }

    const contactMerged = (ctx.contact as Record<string, unknown>) ?? {}
    ctx.contact = {
      ...contactMerged,
      first_name: contactMerged.first_name ?? firstNameFromFullName(contactMerged.full_name),
    }

    const contactIdForAppt =
      entity_type === "contact"
        ? entity_id
        : String((entity as Record<string, unknown>)?.contact_id ?? contactMerged.id ?? "") || null

    let appointmentRow: Record<string, unknown> | null = null
    const apptFromPayload = payload?.appointment
    if (apptFromPayload && typeof apptFromPayload === "object" && !Array.isArray(apptFromPayload)) {
      appointmentRow = apptFromPayload as Record<string, unknown>
    } else if (contactIdForAppt) {
      const { data: apData } = await supabase
        .from("appointments")
        .select("*")
        .eq("business_id", business_id)
        .eq("contact_id", contactIdForAppt)
        .eq("status", "scheduled")
        .gte("start_time", new Date().toISOString())
        .order("start_time", { ascending: true })
        .limit(1)
        .maybeSingle()
      appointmentRow = (apData as Record<string, unknown>) ?? null
    }
    ctx.appointment = appointmentContextFromRow(appointmentRow)

    for (const auto of automations) {
      const { data: nodes } = await supabase
        .from("automation_nodes")
        .select("*")
        .eq("automation_id", auto.id)
      const { data: edges } = await supabase
        .from("automation_edges")
        .select("from_node_id, to_node_id, branch_label")
        .eq("automation_id", auto.id)

      const triggerNode = (nodes as AutomationNode[] | null)?.find(
        (n) => n.type === "trigger" && n.subtype === trigger_subtype
      )
      if (!triggerNode || !nodes?.length || !edges?.length) {
        const reason = !triggerNode
          ? `no trigger node for ${trigger_subtype}`
          : !nodes?.length
            ? "no nodes"
            : "no edges (connect trigger to actions in the builder)"
        console.log("[automation-engine] skip automation", auto.id, reason)
        continue
      }

      // ── Trigger-specific filtering ─────────────────────────────────────────
      const tcfg = (triggerNode.config || {}) as Record<string, unknown>

      if (trigger_subtype === "lead.stage_entered") {
        if (tcfg.pipeline_id && tcfg.pipeline_id !== "" && payload?.pipeline_id !== tcfg.pipeline_id) {
          console.log("[automation-engine] skip automation", auto.id, "pipeline_id mismatch", {
            expected: tcfg.pipeline_id,
            got: payload?.pipeline_id,
          })
          continue
        }
        const cfgStage = tcfg.stage_id as string | undefined
        if (cfgStage && cfgStage !== "" && cfgStage !== "_any" && payload?.stage_id !== cfgStage) {
          console.log("[automation-engine] skip automation", auto.id, "stage_id mismatch", {
            expected: cfgStage,
            got: payload?.stage_id,
          })
          continue
        }
      }
      if (trigger_subtype === "lead.created" || trigger_subtype === "lead.won" || trigger_subtype === "lead.lost") {
        if (tcfg.pipeline_id && tcfg.pipeline_id !== "" && tcfg.pipeline_id !== "_any" && payload?.pipeline_id !== tcfg.pipeline_id) {
          console.log("[automation-engine] skip automation", auto.id, "pipeline_id mismatch (lead trigger)")
          continue
        }
      }
      if (trigger_subtype === "contact.tag_added") {
        if (tcfg.tag && tcfg.tag !== "" && payload?.tag !== tcfg.tag) {
          console.log("[automation-engine] skip automation", auto.id, "tag mismatch")
          continue
        }
      }
      // contact.created has no filters

      // ── Create run ─────────────────────────────────────────────────────────
      const { data: runRow } = await supabase
        .from("automation_runs")
        .insert({ automation_id: auto.id, business_id, entity_type, entity_id, status: "running", parent_run_id, execution_depth })
        .select("id")
        .single()

      const runId = (runRow as { id: string } | null)?.id
      if (!runId) continue

      const nodeMap = new Map<string, AutomationNode>()
      for (const n of nodes as AutomationNode[]) nodeMap.set(n.id, n)
      const edgesByFrom = new Map<string, AutomationEdge[]>()
      for (const e of edges as AutomationEdge[]) {
        const list = edgesByFrom.get(e.from_node_id) ?? []
        list.push(e)
        edgesByFrom.set(e.from_node_id, list)
      }

      let currentContext = { ...ctx }
      const queue: { nodeId: string }[] = [{ nodeId: triggerNode.id }]
      const visited = new Set<string>()

      while (queue.length > 0) {
        const { nodeId } = queue.shift()!
        if (visited.has(nodeId)) continue
        visited.add(nodeId)

        const node = nodeMap.get(nodeId)
        if (!node) continue

        if (node.type === "trigger") {
          // pass-through

        } else if (node.type === "condition") {
          const result = evaluateCondition(node.config as { logic?: string; rules?: unknown[] }, currentContext)
          const branchLabel = result ? "true" : "false"
          for (const e of (edgesByFrom.get(nodeId) ?? []).filter((e) => e.branch_label === branchLabel)) {
            queue.push({ nodeId: e.to_node_id })
          }
          await supabase.from("automation_run_steps").insert({
            automation_run_id: runId,
            node_id: nodeId,
            status: "success",
            input_payload: currentContext,
            output_payload: { result },
          })
          continue

        } else if (node.type === "action") {
          let stepStatus: "success" | "failed" = "success"
          let stepError: string | null = null
          const inputPayload = { ...currentContext }
          const cfg = node.config ?? {}

          try {
            // ── add_tag ──────────────────────────────────────────────────────
            if (node.subtype === "add_tag" && cfg.tag) {
              const contactId = entity_type === "contact"
                ? entity_id
                : (entity.contact_id as string | undefined) ?? (currentContext.contact as { id?: string } | null)?.id
              if (contactId) {
                const { data: c } = await supabase.from("contacts").select("tags").eq("id", contactId).single()
                const existing: string[] = (c as { tags: string[] | null } | null)?.tags ?? []
                const tag = cfg.tag as string
                if (!existing.includes(tag)) {
                  await supabase.from("contacts").update({ tags: [...existing, tag] }).eq("id", contactId)
                  currentContext = {
                    ...currentContext,
                    contact: { ...(currentContext.contact as object), tags: [...existing, tag] },
                  }
                  // זרימות שמאזינות ל־contact.tag_added (כולל אחרי פעולת add_tag באוטומציה)
                  if (execution_depth < MAX_DEPTH - 1) {
                    fetch(`${supabaseUrl}/functions/v1/automation-engine`, {
                      method: "POST",
                      headers: { "Content-Type": "application/json", Authorization: `Bearer ${serviceKey}` },
                      body: JSON.stringify({
                        business_id,
                        trigger_subtype: "contact.tag_added",
                        entity_type: "contact",
                        entity_id: contactId,
                        payload: { tag },
                        parent_run_id: runId,
                        execution_depth: execution_depth + 1,
                      }),
                    }).catch(() => {})
                  }
                }
              } else {
                stepStatus = "failed"; stepError = "No contact found"
              }

            // ── remove_tag ───────────────────────────────────────────────────
            } else if (node.subtype === "remove_tag" && cfg.tag) {
              const contactId = entity_type === "contact"
                ? entity_id
                : (entity.contact_id as string | undefined) ?? (currentContext.contact as { id?: string } | null)?.id
              if (contactId) {
                const { data: c } = await supabase.from("contacts").select("tags").eq("id", contactId).single()
                const existing: string[] = (c as { tags: string[] | null } | null)?.tags ?? []
                const tag = cfg.tag as string
                await supabase.from("contacts").update({ tags: existing.filter((t) => t !== tag) }).eq("id", contactId)
              } else {
                stepStatus = "failed"; stepError = "No contact found"
              }

            // ── update_lead_field ────────────────────────────────────────────
            } else if (node.subtype === "update_lead_field" && cfg.field_key && entity_type === "deal") {
              const value = interpolate(String(cfg.field_value ?? ""), currentContext)
              await supabase.from("deals").update({ [cfg.field_key as string]: value }).eq("id", entity_id)
              currentContext = { ...currentContext, deal: { ...(currentContext.deal as object), [cfg.field_key as string]: value } }

            // ── update_contact_field ─────────────────────────────────────────
            } else if (node.subtype === "update_contact_field" && cfg.field_key) {
              const contactId = entity_type === "contact"
                ? entity_id
                : (entity.contact_id as string | undefined) ?? (currentContext.contact as { id?: string } | null)?.id
              if (contactId) {
                const value = interpolate(String(cfg.field_value ?? ""), currentContext)
                await supabase.from("contacts").update({ [cfg.field_key as string]: value }).eq("id", contactId)
                currentContext = { ...currentContext, contact: { ...(currentContext.contact as object), [cfg.field_key as string]: value } }
              } else {
                stepStatus = "failed"; stepError = "No contact found"
              }

            // ── move_to_stage ────────────────────────────────────────────────
            } else if ((node.subtype === "move_to_stage" || node.subtype === "move_deal_stage") && cfg.stage_id && entity_type === "deal") {
              const updateData: { stage_id: string; pipeline_id?: string } = { stage_id: cfg.stage_id as string }
              if (cfg.pipeline_id) updateData.pipeline_id = cfg.pipeline_id as string
              await supabase.from("deals").update(updateData).eq("id", entity_id)
              if (execution_depth < MAX_DEPTH - 1) {
                const stagePayload: Record<string, unknown> = { stage_id: cfg.stage_id }
                if (cfg.pipeline_id) stagePayload.pipeline_id = cfg.pipeline_id
                fetch(`${supabaseUrl}/functions/v1/automation-engine`, {
                  method: "POST",
                  headers: { "Content-Type": "application/json", Authorization: `Bearer ${serviceKey}` },
                  body: JSON.stringify({ business_id, trigger_subtype: "lead.stage_entered", entity_type: "deal", entity_id, payload: stagePayload, parent_run_id: runId, execution_depth: execution_depth + 1 }),
                }).catch(() => {})
              }

            // ── delay ────────────────────────────────────────────────────────
            } else if (node.subtype === "delay") {
              const delayValue = (cfg.delay_value as number) || 1
              const delayUnit = (cfg.delay_unit as string) || "minutes"
              const multipliers: Record<string, number> = { minutes: 60, hours: 3600, days: 86400 }
              const seconds = delayValue * (multipliers[delayUnit] ?? 60)
              const runAfter = new Date(Date.now() + seconds * 1000).toISOString()
              for (const e of (edgesByFrom.get(nodeId) ?? [])) {
                await supabase.from("automation_scheduled_steps").insert({
                  automation_id: auto.id, run_id: runId, business_id,
                  node_id: e.to_node_id, entity_type, entity_id,
                  context: currentContext, run_after: runAfter, status: "pending",
                })
              }
              await supabase.from("automation_run_steps").insert({
                automation_run_id: runId, node_id: nodeId, status: "success",
                input_payload: inputPayload,
                output_payload: { scheduled_at: runAfter, delay_seconds: seconds },
                error_message: null,
              })
              continue

            // ── send_webhook ─────────────────────────────────────────────────
            } else if (node.subtype === "send_webhook" && cfg.url) {
              const url = interpolate(String(cfg.url), currentContext)
              const method = (cfg.method as string) || "POST"
              let webhookBody: unknown = {}
              if (cfg.body_template) {
                try {
                  webhookBody = typeof cfg.body_template === "string"
                    ? JSON.parse(interpolate(cfg.body_template, currentContext))
                    : interpolateObject(cfg.body_template, currentContext)
                } catch {
                  webhookBody = interpolate(String(cfg.body_template), currentContext)
                }
              } else {
                webhookBody = { trigger: trigger_subtype, entity_type, entity_id, ...currentContext }
              }
              const result = await sendWebhookWithRetry(url, method, webhookBody)
              if (!result.ok) { stepStatus = "failed"; stepError = result.error ?? "Webhook failed" }
              currentContext = { ...currentContext, webhook_response: result }

            // ── send_whatsapp ────────────────────────────────────────────────
            } else if (node.subtype === "send_whatsapp") {
              const credentialId = cfg.credential_id as string
              if (!credentialId) {
                stepStatus = "failed"; stepError = "No WhatsApp credential selected"
                currentContext = { ...currentContext, whatsapp_send: { error: stepError } }
              } else {
                const { data: cred } = await supabase.from("whatsapp_credentials").select("*").eq("id", credentialId).single()
                if (!cred) {
                  stepStatus = "failed"; stepError = "WhatsApp credential not found"
                  currentContext = { ...currentContext, whatsapp_send: { error: stepError } }
                } else {
                  const contact = (currentContext.contact as { phone?: string } | null) ?? {}
                  let phone = contact.phone
                  if (!phone && entity_type === "contact") phone = (entity.phone as string)
                  if (!phone) {
                    stepStatus = "failed"; stepError = "No phone number found for contact"
                    currentContext = { ...currentContext, whatsapp_send: { error: stepError } }
                  } else {
                    const message = interpolate(String(cfg.message || ""), currentContext)
                    if (cred.provider === "green_api") {
                      const greenDigits = normalizeDigitsForGreenApiChatId(phone)
                      if (!greenDigits) {
                        stepStatus = "failed"
                        stepError = "Phone number has no digits after normalization"
                        currentContext = { ...currentContext, whatsapp_send: { error: stepError } }
                      } else {
                        const chatId = `${greenDigits}@c.us`
                        const url =
                          `${cred.api_url || "https://api.green-api.com"}/waInstance${cred.instance_id}/sendMessage/${cred.api_token}`
                        const body = { chatId, message }
                        const result = await sendWebhookWithRetry(url, "POST", body)
                        if (!result.ok) { stepStatus = "failed"; stepError = result.error ?? "GreenAPI failed" }
                        currentContext = {
                          ...currentContext,
                          whatsapp_send: {
                            provider: "green_api",
                            chatId,
                            ok: result.ok,
                            http_status: result.status,
                            error: result.error ?? null,
                            response_preview: result.body != null ? String(result.body).slice(0, 800) : null,
                          },
                        }
                      }
                    } else {
                      const cleanPhone = normalizeDigitsForGreenApiChatId(phone)
                      const url = cred.api_url
                      if (!cleanPhone) {
                        stepStatus = "failed"
                        stepError = "Phone number has no digits after normalization"
                        currentContext = { ...currentContext, whatsapp_send: { error: stepError } }
                      } else if (!url) {
                        stepStatus = "failed"; stepError = "No API URL for official WhatsApp"
                        currentContext = { ...currentContext, whatsapp_send: { error: stepError } }
                      } else {
                        const result = await sendWebhookWithRetry(url, "POST", {
                          messaging_product: "whatsapp", to: cleanPhone, type: "text", text: { body: message },
                        })
                        if (!result.ok) { stepStatus = "failed"; stepError = result.error ?? "WhatsApp API failed" }
                        currentContext = {
                          ...currentContext,
                          whatsapp_send: {
                            provider: "official",
                            ok: result.ok,
                            http_status: result.status,
                            error: result.error ?? null,
                            response_preview: result.body != null ? String(result.body).slice(0, 800) : null,
                          },
                        }
                      }
                    }
                  }
                }
              }

            // ── create_task (legacy) ─────────────────────────────────────────
            } else if (node.subtype === "create_task") {
              const dealId = entity_type === "deal" ? entity_id : (currentContext.deal as { id?: string })?.id ?? null
              const contactId = entity_type === "contact"
                ? entity_id
                : (currentContext.contact as { id?: string })?.id ?? (currentContext.deal as { contact_id?: string })?.contact_id ?? null
              const { data: act } = await supabase.from("activities").insert({
                business_id, type: "task", deal_id: dealId, contact_id: contactId,
                created_by_user_id: (currentContext.user_id as string) ?? null,
                content: (cfg.title as string) ?? "Task",
                due_date: (cfg.due_date as string) ?? null,
                task_status: "open",
                assignee_user_id: (cfg.assignee_user_id as string) ?? null,
              }).select("id").single()
              const id = (act as { id: string } | null)?.id
              currentContext = { ...currentContext, task: { ...(currentContext.task as object || {}), id } }
            }

          } catch (err) {
            stepStatus = "failed"
            stepError = String(err)
          }

          await supabase.from("automation_run_steps").insert({
            automation_run_id: runId,
            node_id: nodeId,
            status: stepStatus,
            input_payload: inputPayload,
            output_payload: currentContext,
            error_message: stepError,
          })
        }

        // Enqueue next nodes
        if (node.type !== "condition") {
          for (const e of (edgesByFrom.get(nodeId) ?? [])) {
            queue.push({ nodeId: e.to_node_id })
          }
        }
      }

      await supabase
        .from("automation_runs")
        .update({ status: "completed", finished_at: new Date().toISOString() })
        .eq("id", runId)
    }

    return jsonResponse({ ok: true, triggered: automations.length })
  } catch (err) {
    return jsonResponse({ error: String(err) }, 500)
  }
})
