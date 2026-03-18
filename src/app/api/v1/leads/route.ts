import { NextRequest, NextResponse } from "next/server";
import { authenticateApiKey } from "@/lib/api/authenticate";
import { createAdminClient } from "@/lib/supabase/admin";
import { createContact, createDeal } from "@/lib/services/crm";

export async function POST(req: NextRequest) {
  const auth = await authenticateApiKey(req);
  if (auth.error) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const businessId = auth.businessId;
  const body = await req.json();

  const {
    full_name,
    email,
    phone,
    source,
    value,
    notes,
    pipeline_id,
    stage_id,
    product_id,
    custom_fields = {},
  } = body;

  if (!full_name) {
    return NextResponse.json({ error: "full_name is required" }, { status: 400 });
  }

  const supabase = createAdminClient();

  try {
    // 1. Find or create contact
    let contactId = null;
    if (email || phone) {
      const query = supabase
        .from("contacts")
        .select("id")
        .eq("business_id", businessId);
      
      if (email && phone) {
        query.or(`email.eq.${email},phone.eq.${phone}`);
      } else if (email) {
        query.eq("email", email);
      } else {
        query.eq("phone", phone);
      }

      const { data: existingContact } = await query.maybeSingle();
      if (existingContact) {
        contactId = existingContact.id;
      }
    }

    if (!contactId) {
      const { data: newContact, error: contactError } = await createContact(supabase, {
        business_id: businessId,
        full_name,
        email,
        phone,
        source,
      });
      if (contactError) throw new Error(contactError);
      contactId = newContact!.id;
    }

    // 2. Resolve Pipeline and Stage
    let finalPipelineId = pipeline_id;
    let finalStageId = stage_id;

    if (!finalPipelineId || !finalStageId) {
      const { data: pipeline } = await supabase
        .from("pipelines")
        .select("id, stages(id)")
        .eq("business_id", businessId)
        .order("created_at", { ascending: true })
        .limit(1)
        .single();

      if (!pipeline) {
        return NextResponse.json({ error: "No pipeline found for this business" }, { status: 400 });
      }

      finalPipelineId = finalPipelineId || pipeline.id;
      if (!finalStageId) {
        const { data: stages } = await supabase
          .from("stages")
          .select("id")
          .eq("pipeline_id", finalPipelineId)
          .order("position", { ascending: true })
          .limit(1)
          .single();
        
        if (!stages) {
          return NextResponse.json({ error: "No stages found for the pipeline" }, { status: 400 });
        }
        finalStageId = stages.id;
      }
    }

    // 3. Create Deal (Lead)
    const { data: deal, error: dealError } = await createDeal(supabase, {
      business_id: businessId,
      pipeline_id: finalPipelineId,
      stage_id: finalStageId,
      product_id: product_id || null,
      title: full_name,
      contact_id: contactId,
      value: value || 0,
      source: source || "API",
      owner_user_id: auth.userId,
    });

    if (dealError) throw new Error(dealError);

    return NextResponse.json({
      success: true,
      deal_id: deal!.id,
      contact_id: contactId,
    });
  } catch (error: any) {
    console.error("API Error:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}
