import { createClient } from "@/lib/supabase/server"
import { MailingService } from "@/lib/mailing/mailing-service"
import { NextResponse } from "next/server"

export async function POST(req: Request) {
  try {
    const supabase = await createClient()
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await req.json()
    const { businessId, name, subject, contentHtml, listIds } = body

    if (!businessId || !name || !subject || !contentHtml || !listIds || !Array.isArray(listIds)) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    // Verify user belongs to the business
    const { data: businessUser, error: businessError } = await supabase
      .from("business_users")
      .select("id")
      .eq("business_id", businessId)
      .eq("user_id", user.id)
      .single()

    if (businessError || !businessUser) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const mailingService = new MailingService(supabase)
    const result = await mailingService.sendCampaign({
      businessId,
      name,
      subject,
      contentHtml,
      listIds,
    })

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Mailing API Error:", error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}
