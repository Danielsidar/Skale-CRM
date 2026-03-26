import { createAdminClient } from "@/lib/supabase/admin"

export interface SystemStats {
  totalUsers: number
  totalBusinesses: number
  newUsersLast7Days: number
  newBusinessesLast30Days: number
  totalDeals: number
  totalContacts: number
}

export interface BusinessWithTier {
  id: string
  name: string
  created_at: string
  tier_id: string | null
  tier_name: string | null
  user_count: number
}

export interface UserWithBusiness {
  id: string
  email: string
  full_name: string | null
  created_at: string
  business_count: number
}

export async function getSystemStats(): Promise<SystemStats> {
  const supabase = createAdminClient()

  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()

  const [
    { count: totalUsers },
    { count: totalBusinesses },
    { count: newUsers },
    { count: newBusinesses },
    { count: totalDeals },
    { count: totalContacts },
  ] = await Promise.all([
    supabase.from("profiles").select("*", { count: "exact", head: true }),
    supabase.from("businesses").select("*", { count: "exact", head: true }),
    supabase.from("profiles").select("*", { count: "exact", head: true }).gte("created_at", sevenDaysAgo),
    supabase.from("businesses").select("*", { count: "exact", head: true }).gte("created_at", thirtyDaysAgo),
    supabase.from("deals").select("*", { count: "exact", head: true }),
    supabase.from("contacts").select("*", { count: "exact", head: true }),
  ])

  return {
    totalUsers: totalUsers ?? 0,
    totalBusinesses: totalBusinesses ?? 0,
    newUsersLast7Days: newUsers ?? 0,
    newBusinessesLast30Days: newBusinesses ?? 0,
    totalDeals: totalDeals ?? 0,
    totalContacts: totalContacts ?? 0,
  }
}

export async function getBusinessesWithTiers(): Promise<BusinessWithTier[]> {
  const supabase = createAdminClient()

  const { data: businesses } = await supabase
    .from("businesses")
    .select(`
      id,
      name,
      created_at,
      tier_id,
      tiers(name),
      business_users(count)
    `)
    .order("created_at", { ascending: false })

  return (businesses ?? []).map((b: any) => ({
    id: b.id,
    name: b.name,
    created_at: b.created_at,
    tier_id: b.tier_id,
    tier_name: b.tiers?.name ?? null,
    user_count: b.business_users?.[0]?.count ?? 0,
  }))
}

export async function getAllUsers(): Promise<UserWithBusiness[]> {
  const supabase = createAdminClient()

  const { data: profiles } = await supabase
    .from("profiles")
    .select(`
      id,
      email,
      full_name,
      created_at,
      business_users(count)
    `)
    .order("created_at", { ascending: false })

  return (profiles ?? []).map((p: any) => ({
    id: p.id,
    email: p.email ?? "",
    full_name: p.full_name,
    created_at: p.created_at,
    business_count: p.business_users?.[0]?.count ?? 0,
  }))
}

export async function assignTierToBusiness(businessId: string, tierId: string): Promise<void> {
  const supabase = createAdminClient()
  const { error } = await supabase
    .from("businesses")
    .update({ tier_id: tierId })
    .eq("id", businessId)
  if (error) throw error
}
