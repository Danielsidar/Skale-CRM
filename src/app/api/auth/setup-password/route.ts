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
    const { email, password } = await req.json()
    if (!email || !password) {
      return NextResponse.json({ error: "Missing email or password" }, { status: 400 })
    }

    if (password.length < 6) {
      return NextResponse.json({ error: "Password must be at least 6 characters" }, { status: 400 })
    }

    // 1. Get user by email
    const { data: { users }, error: listError } = await supabaseAdmin.auth.admin.listUsers()
    if (listError) throw listError
    
    const user = users.find(u => u.email === email)
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    // 2. Check if user needs password setup
    if (user.user_metadata?.needs_password_setup !== true) {
      return NextResponse.json({ error: "User already has a password set" }, { status: 403 })
    }

    // 3. Update the user's password and remove the flag
    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(user.id, {
      password: password,
      user_metadata: { 
        ...user.user_metadata,
        needs_password_setup: false 
      }
    })

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })

  } catch (error: any) {
    console.error("Error setting up password:", error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}
