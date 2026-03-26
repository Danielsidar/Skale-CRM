import type { SupabaseClient } from "@supabase/supabase-js"

const SUPABASE_URL =
  typeof process !== "undefined" ? process.env.NEXT_PUBLIC_SUPABASE_URL : ""
const SUPABASE_ANON_KEY =
  typeof process !== "undefined" ? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY : ""

/** Prefer service role on the server (API routes, server actions) so Edge accepts the JWT; anon on the client. */
function automationInvokeBearer(): string | null {
  if (typeof process === "undefined") return SUPABASE_ANON_KEY || null
  return (
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    null
  )
}

/**
 * Invoke automation-engine. Always await from server code (API routes, server actions):
 * fire-and-forget fetch is often cut off when the handler returns (serverless freeze).
 */
export async function triggerAutomationFlow(params: {
  businessId: string
  triggerSubtype: string
  entityType: string
  entityId: string
  payload?: Record<string, unknown>
}): Promise<void> {
  const bearer = automationInvokeBearer()
  if (!SUPABASE_URL || !bearer) {
    console.warn(
      "[triggerAutomationFlow] Missing NEXT_PUBLIC_SUPABASE_URL and a JWT — set SUPABASE_SERVICE_ROLE_KEY (server) or NEXT_PUBLIC_SUPABASE_ANON_KEY — automations will not run."
    )
    return
  }
  const url = `${SUPABASE_URL}/functions/v1/automation-engine`
  const body = {
    business_id: params.businessId,
    trigger_subtype: params.triggerSubtype,
    entity_type: params.entityType,
    entity_id: params.entityId,
    payload: params.payload ?? {},
  }
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${bearer}`,
      },
      body: JSON.stringify(body),
    })
    if (!res.ok) {
      const text = await res.text().catch(() => "")
      console.error(
        "[triggerAutomationFlow] automation-engine error",
        res.status,
        text.slice(0, 800),
        { trigger: params.triggerSubtype, entity_type: params.entityType, entity_id: params.entityId }
      )
    }
  } catch (err) {
    console.error("[triggerAutomationFlow] network error", err, {
      trigger: params.triggerSubtype,
      entity_type: params.entityType,
      entity_id: params.entityId,
    })
  }
}

export interface CreateDealInput {
  business_id: string
  pipeline_id: string
  stage_id: string
  title: string
  contact_id?: string | null
  company_id?: string | null
  product_id?: string | null
  owner_user_id?: string | null
  value?: number
  currency?: string
  source?: string | null
  tags?: string[]
  created_at?: string | null
}

export interface CreateContactInput {
  business_id: string
  full_name: string
  email?: string | null
  phone?: string | null
  company_id?: string | null
  tags?: string[]
  source?: string | null
  owner_user_id?: string | null
  created_at?: string | null
}

export type ActivityType = "note" | "call" | "meeting" | "task" | "message" | "email"

export interface LogActivityInput {
  business_id: string
  type: ActivityType
  contact_id?: string | null
  deal_id?: string | null
  created_by_user_id: string
  content?: string | null
  metadata?: Record<string, unknown>
  due_date?: string | null
  task_status?: "open" | "done"
  assignee_user_id?: string | null
  created_at?: string | null
}

/**
 * Move a deal to a new stage atomically (deal update + history row).
 * Returns { ok: true, deal_id, stage_id, old_stage_id } or { ok: false, error }.
 */
export async function moveDealStage(
  supabase: SupabaseClient,
  params: {
    dealId: string
    newStageId: string
    changedByUserId: string
    lostReason?: string | null
    businessId?: string
  }
): Promise<{ ok: boolean; deal_id?: string; stage_id?: string; old_stage_id?: string; error?: string }> {
  const { data, error } = await supabase.rpc("move_deal_stage", {
    p_deal_id: params.dealId,
    p_new_stage_id: params.newStageId,
    p_changed_by_user_id: params.changedByUserId,
    p_lost_reason: params.lostReason ?? null,
  })

  if (error) {
    return { ok: false, error: error.message }
  }
  const result = data as { ok: boolean; deal_id?: string; stage_id?: string; old_stage_id?: string; error?: string }
  if (result.ok && result.deal_id && result.stage_id && params.businessId) {
    // Fetch stage info, deal info (contact + pipeline) all in parallel
    const stageIds = [result.stage_id, result.old_stage_id].filter(Boolean) as string[]
    const [stagesResult, dealResult] = await Promise.all([
      supabase.from("stages").select("id, name, is_won, is_lost").in("id", stageIds),
      supabase.from("deals").select("contact_id, title, pipeline_id").eq("id", result.deal_id).single(),
    ])

    const stages = stagesResult.data ?? []
    const deal = dealResult.data
    const oldStage = stages.find(s => s.id === result.old_stage_id)?.name
    const newStage = stages.find(s => s.id === result.stage_id)?.name
    const stageInfo = stages.find(s => s.id === result.stage_id)
    const pipelineId = deal?.pipeline_id ?? null

    if (deal?.contact_id) {
      await supabase.from("activities").insert({
        business_id: params.businessId,
        type: "note",
        contact_id: deal.contact_id,
        deal_id: result.deal_id,
        created_by_user_id: params.changedByUserId,
        content: `🔄 העיסקה "${deal.title}" הועברה ${oldStage ? `מ-${oldStage} ` : ""}ל-${newStage}`,
        metadata: { 
          event: "stage_change", 
          old_stage_id: result.old_stage_id, 
          new_stage_id: result.stage_id 
        }
      })
    }

    const automationCalls: Promise<void>[] = [
      triggerAutomationFlow({
        businessId: params.businessId,
        triggerSubtype: "lead.stage_entered",
        entityType: "deal",
        entityId: result.deal_id,
        payload: {
          stage_id: result.stage_id,
          old_stage_id: result.old_stage_id,
          pipeline_id: pipelineId,
        },
      }),
    ]
    if (stageInfo?.is_won) {
      automationCalls.push(
        triggerAutomationFlow({
          businessId: params.businessId,
          triggerSubtype: "lead.won",
          entityType: "deal",
          entityId: result.deal_id,
          payload: { stage_id: result.stage_id, pipeline_id: pipelineId },
        })
      )
    } else if (stageInfo?.is_lost) {
      automationCalls.push(
        triggerAutomationFlow({
          businessId: params.businessId,
          triggerSubtype: "lead.lost",
          entityType: "deal",
          entityId: result.deal_id,
          payload: { stage_id: result.stage_id, pipeline_id: pipelineId },
        })
      )
    }
    await Promise.all(automationCalls)
  }
  return result
}

/**
 * Create a new deal. Stage must belong to the given pipeline.
 * If a contact_id is provided, checks if there's already an active deal in the same pipeline.
 * An active deal is one whose stage is neither won nor lost.
 * If active deal exists, updates it instead of creating a new one.
 */
export async function createDeal(
  supabase: SupabaseClient,
  input: CreateDealInput & { created_at?: string }
): Promise<{ data?: { id: string; is_duplicate?: boolean }; error?: string }> {
  // 1. If contact_id is provided, check for active deals in the same pipeline
  if (input.contact_id) {
    const { data: existingDeals } = await supabase
      .from("deals")
      .select(`
        id,
        stage:stages!inner(is_won, is_lost)
      `)
      .eq("contact_id", input.contact_id)
      .eq("pipeline_id", input.pipeline_id)
      .eq("stages.is_won", false)
      .eq("stages.is_lost", false)
      .limit(1)

    if (existingDeals && existingDeals.length > 0) {
      const existingDeal = existingDeals[0] as any
      const dealId = existingDeal.id

      // 2. Update the existing deal with new info (value, title, tags)
      const { error: updateError } = await supabase
        .from("deals")
        .update({
          value: input.value ?? undefined,
          title: input.title,
          tags: input.tags ?? undefined,
          source: input.source ?? undefined,
          updated_at: new Date().toISOString()
        })
        .eq("id", dealId)

      if (updateError) return { error: updateError.message }

      // 3. Log an activity that the lead was "merged"
      await supabase.from("activities").insert({
        business_id: input.business_id,
        type: "note",
        contact_id: input.contact_id,
        deal_id: dealId,
        created_by_user_id: input.owner_user_id || "",
        content: `🔄 הלקוח השאיר פרטים שוב ב-Pipeline זה. המידע בתיק העסקה עודכן.`,
        metadata: { event: "duplicate_lead_merged", original_input: input }
      })

      return { data: { id: dealId, is_duplicate: true } }
    }
  }

  // 4. No active deal found, proceed with insertion
  const { data, error } = await supabase
    .from("deals")
    .insert({
      business_id: input.business_id,
      pipeline_id: input.pipeline_id,
      stage_id: input.stage_id,
      title: input.title,
      contact_id: input.contact_id ?? null,
      company_id: input.company_id ?? null,
      product_id: input.product_id ?? null,
      owner_user_id: input.owner_user_id ?? null,
      value: input.value ?? 0,
      currency: input.currency ?? "USD",
      source: input.source ?? null,
      tags: input.tags ?? [],
      ...(input.created_at ? { created_at: input.created_at } : {}),
    })
    .select("id")
    .single()

  if (error) return { error: error.message }
  const id = (data as { id: string }).id
  await Promise.all([
    triggerAutomationFlow({
      businessId: input.business_id,
      triggerSubtype: "lead.created",
      entityType: "deal",
      entityId: id,
      payload: { pipeline_id: input.pipeline_id, stage_id: input.stage_id },
    }),
    triggerAutomationFlow({
      businessId: input.business_id,
      triggerSubtype: "lead.stage_entered",
      entityType: "deal",
      entityId: id,
      payload: {
        pipeline_id: input.pipeline_id,
        stage_id: input.stage_id,
        old_stage_id: null,
      },
    }),
  ])
  return { data: { id } }
}

export interface UpdateDealInput {
  title?: string
  contact_id?: string | null
  product_id?: string | null
  value?: number
  currency?: string
  stage_id?: string
  tags?: string[]
}

/**
 * Update an existing deal.
 */
export async function updateDeal(
  supabase: SupabaseClient,
  id: string,
  input: UpdateDealInput
): Promise<{ error?: string }> {
  const { error } = await supabase
    .from("deals")
    .update(input)
    .eq("id", id)

  if (error) return { error: error.message }
  return {}
}

/**
 * Create a new contact. Optionally check for duplicate by email/phone (soft match).
 */
export async function createContact(
  supabase: SupabaseClient,
  input: CreateContactInput
): Promise<{ data?: { id: string }; error?: string }> {
  // Check for existing contact by email or phone in the same business
  if (input.email || input.phone) {
    const orFilters = []
    if (input.email) orFilters.push(`email.ilike.${input.email.trim()}`)
    if (input.phone) orFilters.push(`phone.eq.${input.phone.trim()}`)

    const { data: existingContact } = await supabase
      .from("contacts")
      .select("id")
      .eq("business_id", input.business_id)
      .or(orFilters.join(","))
      .maybeSingle()

    if (existingContact) {
      return { data: { id: existingContact.id } }
    }
  }

  const { data, error } = await supabase
    .from("contacts")
    .insert({
      business_id: input.business_id,
      full_name: input.full_name,
      email: input.email ?? null,
      phone: input.phone ?? null,
      company_id: input.company_id ?? null,
      tags: input.tags ?? [],
      source: input.source ?? null,
      owner_user_id: input.owner_user_id ?? null,
      ...(input.created_at ? { created_at: input.created_at } : {}),
    })
    .select("id")
    .single()

  if (error) return { error: error.message }
  const id = (data as { id: string }).id
  await triggerAutomationFlow({
    businessId: input.business_id,
    triggerSubtype: "contact.created",
    entityType: "contact",
    entityId: id,
  })
  return { data: { id } }
}

export interface CreateCustomerInput {
  business_id: string
  user_id: string
  name: string
  contact_name: string
  email?: string | null
  phone?: string | null
  source?: string | null
  notes?: string | null
}

/**
 * Create a new customer.
 */
export async function createCustomer(
  supabase: SupabaseClient,
  input: CreateCustomerInput
): Promise<{ data?: { id: string }; error?: string }> {
  const { data, error } = await supabase
    .from("customers")
    .insert({
      business_id: input.business_id,
      user_id: input.user_id,
      name: input.name,
      contact_name: input.contact_name,
      email: input.email ?? null,
      phone: input.phone ?? null,
      source: input.source ?? null,
      notes: input.notes ?? null,
    })
    .select("id")
    .single()

  if (error) return { error: error.message }
  return { data: { id: (data as { id: string }).id } }
}

/**
 * Convert a deal/contact to a customer and record a purchase.
 */
export async function convertToCustomer(
  supabase: SupabaseClient,
  params: {
    businessId: string
    userId: string
    contactId: string
    dealId: string
    productId?: string | null
    price: number
    notes?: string | null
  }
): Promise<{ ok: boolean; error?: string }> {
  try {
    // 1. Get contact details
    const { data: contact, error: contactErr } = await supabase
      .from("contacts")
      .select("*")
      .eq("id", params.contactId)
      .single()

    if (contactErr || !contact) throw new Error("איש קשר לא נמצא")

    // 2. Check if customer already exists (by email or phone within the same business)
    let customerId: string | null = null
    const { data: existingCustomer } = await supabase
      .from("customers")
      .select("id")
      .eq("business_id", params.businessId)
      .or(`email.eq.${contact.email},phone.eq.${contact.phone}`)
      .maybeSingle()

    if (existingCustomer) {
      customerId = existingCustomer.id
    } else {
      // 3. Create new customer
      const { data: newCustomer, error: createErr } = await supabase
        .from("customers")
        .insert({
          business_id: params.businessId,
          user_id: params.userId,
          name: contact.full_name, // Defaulting business name to contact name
          contact_name: contact.full_name,
          email: contact.email,
          phone: contact.phone,
          source: contact.source,
          notes: contact.custom_fields ? JSON.stringify(contact.custom_fields) : null,
        })
        .select("id")
        .single()

      if (createErr) throw createErr
      customerId = (newCustomer as { id: string }).id
    }

    // 4. Create purchase record
    const { error: purchaseErr } = await supabase
      .from("customer_purchases")
      .insert({
        business_id: params.businessId,
        user_id: params.userId,
        customer_id: customerId,
        product_id: params.productId ?? null,
        price: params.price,
        notes: params.notes ?? null,
      })

    if (purchaseErr) throw purchaseErr

    // 5. Log activity
    await supabase.from("activities").insert({
      business_id: params.businessId,
      type: "note",
      contact_id: params.contactId,
      created_by_user_id: params.userId,
      content: `🎉 הפך ללקוח! רכישה בסך ₪${params.price.toLocaleString()}${params.notes ? ` (${params.notes})` : ""}`,
      metadata: { 
        event: "conversion", 
        deal_id: params.dealId,
        price: params.price
      }
    })

    return { ok: true }
  } catch (err) {
    console.error("Error converting to customer:", err)
    return { ok: false, error: err instanceof Error ? err.message : "שגיאה בתהליך המרת לקוח" }
  }
}

/**
 * Log an activity (note, call, meeting, task, message). At least one of contact_id or deal_id required.
 */
export async function logActivity(
  supabase: SupabaseClient,
  input: LogActivityInput
): Promise<{ data?: { id: string }; error?: string }> {
  if (!input.contact_id && !input.deal_id) {
    return { error: "contact_id or deal_id required" }
  }

  const { data, error } = await supabase
    .from("activities")
    .insert({
      business_id: input.business_id,
      type: input.type,
      contact_id: input.contact_id ?? null,
      deal_id: input.deal_id ?? null,
      created_by_user_id: input.created_by_user_id,
      content: input.content ?? null,
      metadata: (input.metadata as Record<string, unknown>) ?? {},
      due_date: input.due_date ?? null,
      task_status: input.task_status ?? "open",
      assignee_user_id: input.assignee_user_id ?? null,
      ...(input.created_at ? { created_at: input.created_at } : {}),
    })
    .select("id")
    .single()

  if (error) return { error: error.message }
  const id = (data as { id: string }).id
  if (input.type === "task") {
    await triggerAutomationFlow({
      businessId: input.business_id,
      triggerSubtype: "task.created",
      entityType: "activity",
      entityId: id,
      payload: {
        user_id: input.created_by_user_id,
        due_date: input.due_date,
        content: input.content,
        deal_id: input.deal_id,
        contact_id: input.contact_id,
      },
    })
  }
  return { data: { id } }
}

/**
 * Run automation rules for a trigger. Finds active rules matching trigger + conditions,
 * executes actions (create task, assign owner, webhook, add tag), logs each run.
 */
export async function runAutomations(
  supabase: SupabaseClient,
  params: {
    businessId: string
    triggerType: string
    entityType: string
    entityId: string
    payload?: Record<string, unknown>
  }
): Promise<void> {
  const { data: rules } = await supabase
    .from("automation_rules")
    .select("id, conditions, actions")
    .eq("business_id", params.businessId)
    .eq("trigger_type", params.triggerType)
    .eq("active", true)

  if (!rules?.length) return

  for (const rule of rules) {
    const conditions = (rule.conditions as Array<{ type: string; value?: unknown }>) ?? []
    let passes = true
    for (const cond of conditions) {
      if (cond.type === "pipeline_is" && params.payload?.pipeline_id !== cond.value) {
        passes = false
        break
      }
      if (cond.type === "stage_is" && params.payload?.stage_id !== cond.value) {
        passes = false
        break
      }
      if (cond.type === "deal_value_gt" && typeof params.payload?.value === "number" && params.payload.value <= (cond.value as number)) {
        passes = false
        break
      }
    }
    if (!passes) continue

    const actions = (rule.actions as Array<{ type: string; config?: Record<string, unknown> }>) ?? []
    const result: { actions: string[]; errors: string[] } = { actions: [], errors: [] }

    for (const action of actions) {
      try {
        if (action.type === "create_task" && action.config) {
          const { data: act } = await supabase.from("activities").insert({
            business_id: params.businessId,
            type: "task",
            deal_id: params.entityType === "deal" ? params.entityId : null,
            contact_id: params.entityType === "contact" ? params.entityId : (params.payload?.contact_id as string) ?? null,
            created_by_user_id: (params.payload?.user_id as string) ?? null,
            content: (action.config.title as string) ?? "Task",
            due_date: (action.config.due_date as string) ?? null,
            task_status: "open",
            assignee_user_id: (action.config.assignee_user_id as string) ?? null,
          }).select("id").single()
          result.actions.push(`create_task:${(act as { id: string })?.id}`)
        } else if (action.type === "assign_owner" && action.config?.owner_user_id) {
          if (params.entityType === "deal") {
            await supabase.from("deals").update({ owner_user_id: action.config.owner_user_id }).eq("id", params.entityId)
            result.actions.push("assign_owner:deal")
          }
        } else if (action.type === "send_webhook" && action.config?.url) {
          await fetch(action.config.url as string, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              trigger: params.triggerType,
              entity_type: params.entityType,
              entity_id: params.entityId,
              ...params.payload,
            }),
          })
          result.actions.push("send_webhook")
        } else if (action.type === "add_tag" && action.config?.tag && params.entityType === "contact") {
          const { data: contact } = await supabase.from("contacts").select("tags").eq("id", params.entityId).single()
          const tags = ((contact as { tags: string[] | null })?.tags ?? []).concat(action.config.tag as string)
          await supabase.from("contacts").update({ tags }).eq("id", params.entityId)
          result.actions.push("add_tag")
        }
      } catch (err) {
        result.errors.push(String(err))
      }
    }

    await supabase.from("automation_rule_runs").insert({
      automation_rule_id: rule.id,
      entity_type: params.entityType,
      entity_id: params.entityId,
      status: result.errors.length ? "partial" : "success",
      result: result as unknown as Record<string, unknown>,
      error_message: result.errors.length ? result.errors.join("; ") : null,
    })
  }
}
