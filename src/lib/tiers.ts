import { createAdminClient } from "@/lib/supabase/admin"

export interface TierFeatures {
  mailing: boolean
  automations: boolean
  api_access: boolean
  booking: boolean
  whatsapp: boolean
  max_users: number | null
  max_contacts: number | null
  max_deals: number | null
  max_pipelines: number | null
  max_automations: number | null
  max_mailing_lists: number | null
  max_api_keys: number | null
}

export interface Tier {
  id: string
  name: string
  description: string | null
  price: number | null
  is_active: boolean
  sort_order: number
  features: TierFeatures
  created_at: string
  updated_at: string
}

export const DEFAULT_FREE_FEATURES: TierFeatures = {
  mailing: false,
  automations: false,
  api_access: false,
  booking: true,
  whatsapp: false,
  max_users: 2,
  max_contacts: 200,
  max_deals: 50,
  max_pipelines: 1,
  max_automations: 0,
  max_mailing_lists: 0,
  max_api_keys: 0,
}

export const FEATURE_LABELS: Record<keyof TierFeatures, string> = {
  mailing: "מיילינג",
  automations: "אוטומציות",
  api_access: "גישת API",
  booking: "Booking Links",
  whatsapp: "WhatsApp",
  max_users: "מקסימום משתמשים",
  max_contacts: "מקסימום אנשי קשר",
  max_deals: "מקסימום עסקאות",
  max_pipelines: "מקסימום Pipelines",
  max_automations: "מקסימום אוטומציות",
  max_mailing_lists: "מקסימום רשימות תפוצה",
  max_api_keys: "מקסימום API Keys",
}

export const BOOLEAN_FEATURES: (keyof TierFeatures)[] = [
  "mailing",
  "automations",
  "api_access",
  "booking",
  "whatsapp",
]

export const LIMIT_FEATURES: (keyof TierFeatures)[] = [
  "max_users",
  "max_contacts",
  "max_deals",
  "max_pipelines",
  "max_automations",
  "max_mailing_lists",
  "max_api_keys",
]

export async function getAllTiers(): Promise<Tier[]> {
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from("tiers")
    .select("*")
    .order("sort_order", { ascending: true })

  if (error) throw error
  return (data ?? []) as Tier[]
}

export async function getTierById(id: string): Promise<Tier | null> {
  const supabase = createAdminClient()
  const { data } = await supabase
    .from("tiers")
    .select("*")
    .eq("id", id)
    .single()
  return data as Tier | null
}

export async function getBusinessTierFeatures(businessId: string): Promise<TierFeatures> {
  const supabase = createAdminClient()
  const { data } = await supabase
    .from("businesses")
    .select("tiers(features)")
    .eq("id", businessId)
    .single()

  const features = (data as any)?.tiers?.features
  return (features as TierFeatures) ?? DEFAULT_FREE_FEATURES
}
