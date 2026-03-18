import type { SupabaseClient } from "@supabase/supabase-js"

export interface Notification {
  id: string
  business_id: string
  user_id: string
  type: string
  title: string
  message: string | null
  is_read: boolean
  entity_type: string | null
  entity_id: string | null
  created_by_user_id: string | null
  created_at: string
  read_at: string | null
}

export async function getNotifications(
  supabase: SupabaseClient,
  opts: { businessId: string; limit?: number; unreadOnly?: boolean }
): Promise<{ data: Notification[]; error?: string }> {
  let query = supabase
    .from("notifications")
    .select("*")
    .eq("business_id", opts.businessId)
    .order("created_at", { ascending: false })
    .limit(opts.limit ?? 20)

  if (opts.unreadOnly) {
    query = query.eq("is_read", false)
  }

  const { data, error } = await query
  if (error) return { data: [], error: error.message }
  return { data: (data ?? []) as Notification[] }
}

export async function getUnreadCount(
  supabase: SupabaseClient,
  businessId: string
): Promise<number> {
  const { count, error } = await supabase
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .eq("business_id", businessId)
    .eq("is_read", false)

  if (error) return 0
  return count ?? 0
}

export async function markAsRead(
  supabase: SupabaseClient,
  notificationId: string
): Promise<void> {
  await supabase
    .from("notifications")
    .update({ is_read: true, read_at: new Date().toISOString() })
    .eq("id", notificationId)
}

export async function markAllAsRead(
  supabase: SupabaseClient,
  businessId: string
): Promise<void> {
  await supabase
    .from("notifications")
    .update({ is_read: true, read_at: new Date().toISOString() })
    .eq("business_id", businessId)
    .eq("is_read", false)
}

export async function createNotification(
  supabase: SupabaseClient,
  params: {
    businessId: string
    userId: string
    type: string
    title: string
    message?: string
    entityType?: string
    entityId?: string
    createdByUserId?: string
  }
): Promise<void> {
  await supabase.from("notifications").insert({
    business_id: params.businessId,
    user_id: params.userId,
    type: params.type,
    title: params.title,
    message: params.message ?? null,
    entity_type: params.entityType ?? null,
    entity_id: params.entityId ?? null,
    created_by_user_id: params.createdByUserId ?? null,
  })
}

export async function notifyBusinessAdmins(
  supabase: SupabaseClient,
  params: {
    businessId: string
    type: string
    title: string
    message?: string
    entityType?: string
    entityId?: string
    createdByUserId?: string
  }
): Promise<void> {
  const { data: admins } = await supabase
    .from("business_users")
    .select("user_id")
    .eq("business_id", params.businessId)
    .in("role", ["admin", "manager"])

  if (!admins?.length) return

  const rows = admins.map((a) => ({
    business_id: params.businessId,
    user_id: a.user_id,
    type: params.type,
    title: params.title,
    message: params.message ?? null,
    entity_type: params.entityType ?? null,
    entity_id: params.entityId ?? null,
    created_by_user_id: params.createdByUserId ?? null,
  }))

  await supabase.from("notifications").insert(rows)
}

export function getNotificationIcon(type: string): string {
  switch (type) {
    case "deal_assigned": return "🤝"
    case "deal_stage_changed": return "🔄"
    case "deal_won": return "🎉"
    case "deal_lost": return "😞"
    case "task_assigned": return "📋"
    case "task_due": return "⏰"
    case "contact_created": return "👤"
    case "new_lead": return "🎯"
    case "mention": return "💬"
    default: return "🔔"
  }
}

export function getNotificationRoute(type: string, entityType?: string | null, entityId?: string | null): string | null {
  if (!entityType || !entityId) return null
  switch (entityType) {
    case "deal": return "/leads"
    case "contact": return "/contacts"
    case "customer": return "/customers"
    case "appointment": return "/calendar"
    default: return null
  }
}
