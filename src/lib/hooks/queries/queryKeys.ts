// Centralized query key factory for consistent cache keys across all hooks
export const queryKeys = {
  business: {
    all: (userId: string) => ["business", userId] as const,
  },
  pipelines: {
    all: (businessId: string) => ["pipelines", businessId] as const,
  },
  stages: {
    all: (businessId: string) => ["stages", businessId] as const,
    byPipeline: (pipelineId: string) => ["stages", "pipeline", pipelineId] as const,
  },
  deals: {
    all: (businessId: string) => ["deals", businessId] as const,
    list: (businessId: string, filters: Record<string, unknown>, page: number, pageSize: number) =>
      ["deals", businessId, "list", filters, page, pageSize] as const,
    tags: (businessId: string) => ["deals", businessId, "tags"] as const,
  },
  contacts: {
    all: (businessId: string) => ["contacts", businessId] as const,
    list: (businessId: string, search: string, ownerFilter: string, page: number) =>
      ["contacts", businessId, "list", search, ownerFilter, page] as const,
    detail: (contactId: string) => ["contacts", "detail", contactId] as const,
  },
  businessUsers: {
    all: (businessId: string) => ["business-users", businessId] as const,
  },
  tierFeatures: {
    byBusiness: (businessId: string) => ["tier-features", businessId] as const,
  },
  permissions: {
    byUser: (businessId: string, userId: string, role: string) =>
      ["permissions", businessId, userId, role] as const,
  },
  products: {
    all: (businessId: string) => ["products", businessId] as const,
  },
  automations: {
    all: (businessId: string) => ["automations", businessId] as const,
  },
  appointments: {
    all: (businessId: string) => ["appointments", businessId] as const,
    range: (businessId: string, from: string, to: string) =>
      ["appointments", businessId, "range", from, to] as const,
  },
  dashboard: {
    data: (businessId: string) => ["dashboard", businessId] as const,
  },
}
