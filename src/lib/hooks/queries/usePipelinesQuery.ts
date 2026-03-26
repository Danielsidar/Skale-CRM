"use client"

import { useQuery, useQueryClient } from "@tanstack/react-query"
import { createClient } from "@/lib/supabase/client"
import { queryKeys } from "./queryKeys"

export interface StageWithPipeline {
  id: string
  name: string
  position: number
  pipeline_id: string
  color: string | null
  is_won: boolean | null
  is_lost: boolean | null
}

export interface PipelineWithStages {
  id: string
  name: string
  business_id: string
  created_at: string | null
  product_id: string | null
  stages: StageWithPipeline[]
}

async function fetchPipelines(businessId: string) {
  const supabase = createClient()
  const { data, error } = await supabase
    .from("pipelines")
    .select("*, stages(*)")
    .eq("business_id", businessId)
    .order("created_at", { ascending: true })

  if (error) throw error

  return (data ?? []).map((p) => ({
    ...p,
    stages: (p.stages ?? []).sort(
      (a: StageWithPipeline, b: StageWithPipeline) => a.position - b.position
    ),
  })) as PipelineWithStages[]
}

export function usePipelinesQuery(businessId: string | null) {
  return useQuery({
    queryKey: queryKeys.pipelines.all(businessId ?? ""),
    queryFn: () => fetchPipelines(businessId!),
    enabled: !!businessId,
    staleTime: 5 * 60 * 1000,
  })
}

export function usePipelinesPrefetch() {
  const queryClient = useQueryClient()
  return (businessId: string) => {
    queryClient.prefetchQuery({
      queryKey: queryKeys.pipelines.all(businessId),
      queryFn: () => fetchPipelines(businessId),
      staleTime: 5 * 60 * 1000,
    })
  }
}
