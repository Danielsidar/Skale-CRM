"use client"

import { useQuery } from "@tanstack/react-query"
import { createClient } from "@/lib/supabase/client"
import { queryKeys } from "./queryKeys"

export interface Product {
  id: string
  name: string
  price: number | null
  business_id: string
  description: string | null
}

async function fetchProducts(businessId: string): Promise<Product[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from("products")
    .select("id, name, price, business_id, description")
    .eq("business_id", businessId)
    .order("name")

  if (error) throw error
  return (data ?? []) as Product[]
}

export function useProductsQuery(businessId: string | null) {
  return useQuery({
    queryKey: queryKeys.products.all(businessId ?? ""),
    queryFn: () => fetchProducts(businessId!),
    enabled: !!businessId,
    staleTime: 5 * 60 * 1000,
  })
}
