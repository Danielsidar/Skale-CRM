import { createClient } from "@supabase/supabase-js"
import { NextResponse } from "next/server"

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
)

export async function POST(req: Request) {
  try {
    const { email } = await req.json()
    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 })
    }

    const normalizedEmail = email.toLowerCase().trim()

    // 1. Get user by email from the users table (public view or via admin API)
    // listUsers is easier for metadata, but we need to find the specific user
    const { data: { users }, error } = await supabaseAdmin.auth.admin.listUsers()
    
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const user = users.find(u => u.email?.toLowerCase() === normalizedEmail)

    if (!user) {
      return NextResponse.json({ 
        exists: false 
      })
    }

    // Supabase stores metadata in user_metadata
    const needsPasswordSetup = user.user_metadata?.needs_password_setup === true

    return NextResponse.json({
      exists: true,
      needsPasswordSetup,
      fullName: user.user_metadata?.full_name || ""
    })

  } catch (error: any) {
    console.error("Error checking user:", error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}
