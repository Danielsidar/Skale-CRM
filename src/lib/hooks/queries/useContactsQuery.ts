"use client"

import { useQuery, useQueryClient } from "@tanstack/react-query"
import { createClient } from "@/lib/supabase/client"
import { queryKeys } from "./queryKeys"

export interface ContactRow {
  id: string
  full_name: string | null
  email: string | null
  phone: string | null
  business_id: string
  owner_user_id: string | null
  created_at: string | null
  updated_at: string | null
  tags: string[] | null
  notes: string | null
  address: string | null
  company: string | null
  status: string | null
  [key: string]: unknown
}

interface UseContactsOptions {
  businessId: string | null
  search?: string
  ownerFilter?: "all" | "mine"
  currentUserId?: string | null
  page?: number
  pageSize?: number
}

async function fetchContacts(options: {
  businessId: string
  search: string
  ownerFilter: string
  currentUserId: string | null
  page: number
  pageSize: number
}) {
  const supabase = createClient()
  const { businessId, search, ownerFilter, currentUserId, page, pageSize } = options
  const from = (page - 1) * pageSize
  const to = from + pageSize - 1

  let query = supabase
    .from("contacts")
    .select("*", { count: "exact" })
    .eq("business_id", businessId)
    .order("updated_at", { ascending: false })
    .range(from, to)

  if (search) {
    query = query.or(
      `full_name.ilike.%${search}%,email.ilike.%${search}%,phone.ilike.%${search}%`
    )
  }

  if (ownerFilter === "mine" && currentUserId) {
    query = query.eq("owner_user_id", currentUserId)
  }

  const { data, error, count } = await query
  if (error) throw error

  return { contacts: (data ?? []) as ContactRow[], total: count ?? 0 }
}

export function useContactsQuery(options: UseContactsOptions) {
  const {
    businessId,
    search = "",
    ownerFilter = "all",
    currentUserId = null,
    page = 1,
    pageSize = 25,
  } = options

  return useQuery({
    queryKey: queryKeys.contacts.list(
      businessId ?? "",
      search,
      ownerFilter + (currentUserId ?? ""),
      page
    ),
    queryFn: () =>
      fetchContacts({
        businessId: businessId!,
        search,
        ownerFilter,
        currentUserId,
        page,
        pageSize,
      }),
    enabled: !!businessId,
    placeholderData: (prev) => prev,
  })
}

export function useContactsPrefetch() {
  const queryClient = useQueryClient()
  return (businessId: string) => {
    queryClient.prefetchQuery({
      queryKey: queryKeys.contacts.list(businessId, "", "all", 1),
      queryFn: () =>
        fetchContacts({
          businessId,
          search: "",
          ownerFilter: "all",
          currentUserId: null,
          page: 1,
          pageSize: 25,
        }),
    })
  }
}
