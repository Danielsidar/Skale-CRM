"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { generateApiKey, hashApiKey } from "@/lib/utils/api-auth";

export async function createApiKey(name: string, businessId: string) {
  const supabase = await createClient();
  const rawKey = generateApiKey();
  const keyHash = hashApiKey(rawKey);
  const keyPrefix = "sk_live_";

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Unauthorized");
  }

  const { error } = await supabase.from("api_keys").insert({
    business_id: businessId,
    name,
    key_hash: keyHash,
    key_prefix: keyPrefix,
    key_plain: rawKey, // Storing plain text key for convenience
    created_by: user.id,
  });

  if (error) {
    console.error("Error creating API key:", error);
    if (error.code === '42P01') {
      throw new Error("טבלת מפתחות ה-API לא קיימת. אנא הרץ את המיגרציות.");
    }
    throw new Error(`Failed to create API key: ${error.message}`);
  }

  revalidatePath("/settings/api-keys");
  return { key: rawKey };
}

export async function deleteApiKey(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("api_keys").delete().eq("id", id);

  if (error) {
    console.error("Error deleting API key:", error);
    throw new Error("Failed to delete API key");
  }

  revalidatePath("/settings/api-keys");
  return { success: true };
}

export async function getApiKeys(businessId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("api_keys")
    .select("*")
    .eq("business_id", businessId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching API keys:", error);
    // If the table doesn't exist, we just return empty array instead of crashing
    if (error.code === '42P01') {
      return [];
    }
    throw new Error(`Failed to fetch API keys: ${error.message}`);
  }

  return data;
}
