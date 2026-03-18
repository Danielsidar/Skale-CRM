import { createClient } from "@supabase/supabase-js"
import { createClient as createServerClient } from "@/lib/supabase/server"
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
    const supabase = await createServerClient()
    
    // 1. Get current user
    const { data: { user: currentUser }, error: authError } = await supabase.auth.getUser()
    if (authError || !currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { email, fullName, role, businessId } = await req.json()

    if (!email || !fullName || !role || !businessId) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    // 2. Verify current user is an admin in this business
    const { data: userMembership, error: membershipError } = await supabase
      .from("business_users")
      .select("role")
      .eq("business_id", businessId)
      .eq("user_id", currentUser.id)
      .single()

    if (membershipError || !userMembership || userMembership.role !== 'admin') {
      return NextResponse.json({ error: "Only admins can add users to the business" }, { status: 403 })
    }

    // 3. Create the user in Supabase Auth via Admin API
    // We set a temporary password. The user can reset it later.
    const tempPassword = Math.random().toString(36).slice(-10) + "A1!"
    
    const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password: tempPassword,
      email_confirm: true,
      user_metadata: { 
        full_name: fullName,
        needs_password_setup: true
      }
    })

    if (createError) {
      return NextResponse.json({ error: createError.message }, { status: 500 })
    }

    // 4. Link the new user to the business
    const { error: linkError } = await supabaseAdmin
      .from("business_users")
      .insert({
        business_id: businessId,
        user_id: newUser.user.id,
        role: role
      })

    if (linkError) {
      // Cleanup: delete the auth user if linking fails
      await supabaseAdmin.auth.admin.deleteUser(newUser.user.id)
      return NextResponse.json({ error: linkError.message }, { status: 500 })
    }

    return NextResponse.json({ 
      success: true, 
      userId: newUser.user.id,
      tempPassword // In a real app, you might send this via email or tell the admin
    })

  } catch (error: any) {
    console.error("Error adding user:", error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}
