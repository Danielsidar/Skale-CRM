import { NextRequest, NextResponse } from "next/server";
import { authenticateApiKey } from "@/lib/api/authenticate";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(req: NextRequest) {
  const auth = await authenticateApiKey(req);
  if (auth.error) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const businessId = auth.businessId;
  const userId = auth.userId;
  const body = await req.json();

  const {
    name,
    contact_name,
    email,
    phone,
    source,
    notes,
  } = body;

  if (!name || !contact_name) {
    return NextResponse.json({ error: "name and contact_name are required" }, { status: 400 });
  }

  const supabase = createAdminClient();

  try {
    const { data: customer, error: customerError } = await supabase
      .from("customers")
      .insert({
        business_id: businessId,
        user_id: userId,
        name,
        contact_name,
        email,
        phone,
        source,
        notes,
      })
      .select("id")
      .single();

    if (customerError) throw new Error(customerError.message);

    return NextResponse.json({
      success: true,
      customer_id: customer!.id,
    });
  } catch (error: any) {
    console.error("API Error:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  const auth = await authenticateApiKey(req);
  if (auth.error) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const businessId = auth.businessId;
  const supabase = createAdminClient();

  const { data: customers, error } = await supabase
    .from("customers")
    .select("*")
    .eq("business_id", businessId)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(customers);
}
