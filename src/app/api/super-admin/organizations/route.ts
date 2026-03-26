import { NextResponse } from "next/server"
import { createServerClient } from "@supabase/ssr"
import { createAdminClient } from "@/lib/supabase/admin"
import { cookies } from "next/headers"

async function verifySuperAdmin() {
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll() {},
      },
    }
  )
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const admin = createAdminClient()
  const { data } = await admin.from("super_admins").select("user_id").eq("user_id", user.id).single()
  return data ? user : null
}

export async function GET() {
  const user = await verifySuperAdmin()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

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

  const result = (businesses ?? []).map((b: any) => ({
    id: b.id,
    name: b.name,
    created_at: b.created_at,
    tier_id: b.tier_id,
    tier_name: b.tiers?.name ?? null,
    user_count: b.business_users?.[0]?.count ?? 0,
  }))

  return NextResponse.json(result)
}
