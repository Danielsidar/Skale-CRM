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
    description,
    price,
  } = body;

  if (!name || price === undefined) {
    return NextResponse.json({ error: "name and price are required" }, { status: 400 });
  }

  const supabase = createAdminClient();

  try {
    const { data: product, error: productError } = await supabase
      .from("products")
      .insert({
        business_id: businessId,
        user_id: userId,
        name,
        description,
        price,
      })
      .select("id")
      .single();

    if (productError) throw new Error(productError.message);

    return NextResponse.json({
      success: true,
      product_id: product!.id,
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

  const { data: products, error } = await supabase
    .from("products")
    .select("*")
    .eq("business_id", businessId)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(products);
}
