import { createAdminClient } from "@/lib/supabase/admin";
import { hashApiKey, validateApiKey } from "@/lib/utils/api-auth";
import { NextRequest, NextResponse } from "next/server";

export async function authenticateApiKey(req: NextRequest) {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return { error: "Missing or invalid Authorization header", status: 401 };
  }

  const apiKey = authHeader.replace("Bearer ", "");
  if (!validateApiKey(apiKey)) {
    return { error: "Invalid API Key format", status: 401 };
  }

  const keyHash = hashApiKey(apiKey);
  const supabase = createAdminClient();

  const { data: keyRecord, error } = await supabase
    .from("api_keys")
    .select("business_id, id, created_by")
    .eq("key_hash", keyHash)
    .single();

  if (error || !keyRecord) {
    console.error("Auth Error:", error);
    return { error: "Invalid API Key", status: 401 };
  }

  // Update last used timestamp (don't wait for it)
  supabase
    .from("api_keys")
    .update({ last_used_at: new Date().toISOString() })
    .eq("id", keyRecord.id)
    .then();

  return { businessId: keyRecord.business_id, userId: keyRecord.created_by };
}
