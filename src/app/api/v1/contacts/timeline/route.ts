import { NextRequest, NextResponse } from "next/server";
import { authenticateApiKey } from "@/lib/api/authenticate";
import { createAdminClient } from "@/lib/supabase/admin";

const VALID_TYPES = ["note", "call", "email", "meeting", "message"] as const;

export async function POST(req: NextRequest) {
  const auth = await authenticateApiKey(req);
  if (auth.error) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const businessId = auth.businessId;
  const body = await req.json();
  const { contact_email, type, content } = body;

  if (!contact_email) {
    return NextResponse.json({ error: "contact_email is required" }, { status: 400 });
  }
  if (!type || !VALID_TYPES.includes(type)) {
    return NextResponse.json(
      { error: `type is required and must be one of: ${VALID_TYPES.join(", ")}` },
      { status: 400 }
    );
  }
  if (!content) {
    return NextResponse.json({ error: "content is required" }, { status: 400 });
  }

  const supabase = createAdminClient();

  const { data: contact, error: contactError } = await supabase
    .from("contacts")
    .select("id")
    .eq("business_id", businessId)
    .eq("email", contact_email)
    .maybeSingle();

  if (contactError) {
    return NextResponse.json({ error: contactError.message }, { status: 500 });
  }
  if (!contact) {
    return NextResponse.json(
      { error: `No contact found with email: ${contact_email}` },
      { status: 404 }
    );
  }

  const { data: activity, error: activityError } = await supabase
    .from("activities")
    .insert({
      business_id: businessId,
      type,
      contact_id: contact.id,
      created_by_user_id: auth.userId,
      content,
    })
    .select("id")
    .single();

  if (activityError) {
    return NextResponse.json({ error: activityError.message }, { status: 500 });
  }

  return NextResponse.json({
    success: true,
    activity_id: (activity as { id: string }).id,
    contact_id: contact.id,
  });
}
