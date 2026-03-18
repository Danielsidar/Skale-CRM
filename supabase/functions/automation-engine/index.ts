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

function interpolateObject(
  obj: unknown,
  ctx: Record<string, unknown>
): unknown {
  if (typeof obj === "string") return interpolate(obj, ctx)
  if (Array.isArray(obj)) return obj.map((x) => interpolateObject(x, ctx))
  if (obj && typeof obj === "object") {
    const out: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(obj)) {
      out[k] = interpolateObject(v, ctx)
    }
    return out
  }
  return obj
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
      case "eq":
        return actual == expected
      case "neq":
        return actual != expected
      case "gt":
        return Number(actual) > Number(expected)
      case "gte":
        return Number(actual) >= Number(expected)
      case "lt":
        return Number(actual) < Number(expected)
      case "lte":
        return Number(actual) <= Number(expected)
      case "contains":
        return Array.isArray(actual)
          ? (actual as unknown[]).includes(expected)
          : String(actual).includes(String(expected))
      default:
        return false
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
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders })
  }
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
      return jsonResponse(
        { error: "Missing business_id, trigger_subtype, entity_type, entity_id" },
        400
      )
    }

    if (execution_depth >= MAX_DEPTH) {
      return jsonResponse({ error: "Max execution depth exceeded" }, 400)
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    const supabase = createClient(supabaseUrl, serviceKey)

    const { data: automations } = await supabase
      .from("automations")
      .select("id")
      .eq("business_id", business_id)
      .eq("status", "active")

    if (!automations?.length) {
      return jsonResponse({ triggered: 0 })
    }

    let entity: Record<string, unknown> = {}
    let relatedContact: Record<string, unknown> = {}
    if (entity_type === "deal") {
      const { data } = await supabase.from("deals").select("*").eq("id", entity_id).single()
      entity = (data as Record<string, unknown>) ?? {}
      const contactId = entity?.contact_id as string | undefined
      if (contactId) {
        const { data: contactData } = await supabase
          .from("contacts")
          .select("*")
          .eq("id", contactId)
          .single()
        relatedContact = (contactData as Record<string, unknown>) ?? {}
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
      deal: entity_type === "deal" ? entity : payload?.deal ?? {},
      contact:
        entity_type === "contact" ? entity : Object.keys(relatedContact).length ? relatedContact : (payload?.contact ?? {}),
      task: entity_type === "task" || entity_type === "activity" ? entity : payload?.task ?? {},
      ...payload,
    }

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
      if (!triggerNode || !nodes?.length || !edges?.length) continue

      const cfg = (triggerNode.config || {}) as Record<string, unknown>
      if (trigger_subtype === "deal.created") {
        if (cfg.pipeline_id != null && payload?.pipeline_id !== cfg.pipeline_id) continue
        if (cfg.stage_id != null && payload?.stage_id !== cfg.stage_id) continue
      }
      if (trigger_subtype === "deal.won") {
        if (cfg.pipeline_id != null && payload?.pipeline_id !== cfg.pipeline_id) continue
      }

      const { data: runRow } = await supabase
        .from("automation_runs")
        .insert({
          automation_id: auto.id,
          business_id,
          entity_type,
          entity_id,
          status: "running",
          parent_run_id,
          execution_depth,
        })
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
      const queue: { nodeId: string; branchLabel?: string | null }[] = [
        { nodeId: triggerNode.id },
      ]
      const visited = new Set<string>()

      while (queue.length > 0) {
        const { nodeId } = queue.shift()!
        if (visited.has(nodeId)) continue
        visited.add(nodeId)

        const node = nodeMap.get(nodeId)
        if (!node) continue

        if (node.type === "trigger") {
          // just pass through to next nodes
        } else if (node.type === "condition") {
          const config = (node.config || {}) as { logic?: string; rules?: unknown[] }
          const result = evaluateCondition(config, currentContext)
          const branchLabel = result ? "true" : "false"
          const outEdges = (edgesByFrom.get(nodeId) ?? []).filter(
            (e) => e.branch_label === branchLabel
          )
          for (const e of outEdges) {
            queue.push({ nodeId: e.to_node_id, branchLabel: e.branch_label })
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

          try {
            const cfg = node.config ?? {}
            if (node.subtype === "create_task") {
              const dealId = entity_type === "deal" ? entity_id : (currentContext.deal as { id?: string })?.id ?? null
              const contactId = entity_type === "contact" ? entity_id : (currentContext.contact as { id?: string })?.id ?? (currentContext.deal as { contact_id?: string })?.contact_id ?? null
              if (!dealId && !contactId) {
                stepStatus = "failed"
                stepError = "deal_id or contact_id required for task"
              } else {
              const { data: act } = await supabase
                .from("activities")
                .insert({
                  business_id,
                  type: "task",
                  deal_id: dealId,
                  contact_id: contactId,
                  created_by_user_id: (currentContext.user_id as string) ?? (currentContext.deal as { owner_user_id?: string })?.owner_user_id ?? null,
                  content: (cfg.title as string) ?? "Task",
                  due_date: (cfg.due_date as string) ?? null,
                  task_status: "open",
                  assignee_user_id: (cfg.assignee_user_id as string) ?? null,
                })
                .select("id")
                .single()
              const id = (act as { id: string } | null)?.id
              currentContext = { ...currentContext, task: { ...(currentContext.task as object || {}), id } }
              }
            } else if (node.subtype === "send_webhook" && cfg.url) {
              const url = interpolate(String(cfg.url), currentContext)
              const method = (cfg.method as string) || "POST"
              let body: unknown = {}
              if (cfg.body_template) {
                try {
                  body = typeof cfg.body_template === "string"
                    ? JSON.parse(interpolate(cfg.body_template, currentContext))
                    : interpolateObject(cfg.body_template, currentContext)
                } catch {
                  body = interpolate(String(cfg.body_template), currentContext)
                }
              } else {
                body = { trigger: trigger_subtype, entity_type, entity_id, ...currentContext }
              }
              const result = await sendWebhookWithRetry(url, method, body)
              if (!result.ok) {
                stepStatus = "failed"
                stepError = result.error ?? "Webhook failed"
              }
              currentContext = { ...currentContext, webhook_response: result }
            } else if (node.subtype === "add_tag" && cfg.tag && entity_type === "contact") {
              const { data: c } = await supabase.from("contacts").select("tags").eq("id", entity_id).single()
              const tags = ((c as { tags: string[] } | null)?.tags ?? []).concat(cfg.tag as string)
              await supabase.from("contacts").update({ tags }).eq("id", entity_id)
            } else if (node.subtype === "move_deal_stage" && cfg.stage_id && entity_type === "deal") {
              await supabase.from("deals").update({ stage_id: cfg.stage_id }).eq("id", entity_id)
            } else if (node.subtype === "send_whatsapp") {
              const credentialId = cfg.credential_id as string
              if (!credentialId) {
                stepStatus = "failed"
                stepError = "No WhatsApp credential selected"
              } else {
                const { data: cred } = await supabase
                  .from("whatsapp_credentials")
                  .select("*")
                  .eq("id", credentialId)
                  .single()

                if (!cred) {
                  stepStatus = "failed"
                  stepError = "WhatsApp credential not found"
                } else {
                  const contact = (currentContext.contact as { phone?: string } | null) ?? {}
                  let phone = contact.phone
                  if (!phone && entity_type === "contact") phone = (entity.phone as string)
                  
                  if (!phone) {
                    stepStatus = "failed"
                    stepError = "No phone number found for contact"
                  } else {
                    // Clean phone number: remove +, spaces, dashes
                    const cleanPhone = phone.replace(/[^\d]/g, "")
                    const message = interpolate(String(cfg.message || ""), currentContext)

                    if (cred.provider === "green_api") {
                      const url = `${cred.api_url || "https://api.green-api.com"}/waInstance${cred.instance_id}/sendMessage/${cred.api_token}`
                      const result = await sendWebhookWithRetry(url, "POST", {
                        chatId: `${cleanPhone}@c.us`,
                        message,
                      })
                      if (!result.ok) {
                        stepStatus = "failed"
                        stepError = result.error ?? "GreenAPI request failed"
                      }
                    } else {
                      // Official WhatsApp (Meta)
                      const url = cred.api_url
                      if (!url) {
                        stepStatus = "failed"
                        stepError = "No API URL for official WhatsApp"
                      } else {
                        const result = await sendWebhookWithRetry(url, "POST", {
                          messaging_product: "whatsapp",
                          to: cleanPhone,
                          type: "text",
                          text: { body: message },
                        })
                        if (!result.ok) {
                          stepStatus = "failed"
                          stepError = result.error ?? "Official WhatsApp request failed"
                        }
                      }
                    }
                  }
                }
              }
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

          const outEdges = edgesByFrom.get(nodeId) ?? []
          for (const e of outEdges) {
            queue.push({ nodeId: e.to_node_id })
          }
          continue
        }

        const outEdges = edgesByFrom.get(nodeId) ?? []
        const followAll = node.type === "trigger" || node.type === "action"
        for (const e of outEdges) {
          if (followAll || e.branch_label == null || e.branch_label === "") {
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
