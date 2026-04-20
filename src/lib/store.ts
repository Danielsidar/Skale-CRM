import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface SidebarState {
  isCollapsed: boolean
  toggleSidebar: () => void
  setCollapsed: (collapsed: boolean) => void
  mobileNavOpen: boolean
  setMobileNavOpen: (open: boolean) => void
}

export const useSidebarStore = create<SidebarState>((set) => ({
  isCollapsed: false,
  toggleSidebar: () => set((state) => ({ isCollapsed: !state.isCollapsed })),
  setCollapsed: (collapsed) => set({ isCollapsed: collapsed }),
  mobileNavOpen: false,
  setMobileNavOpen: (open) => set({ mobileNavOpen: open }),
}))

const BUSINESS_STORAGE_KEY = 'skale-active-business-id'

export interface Business {
  id: string
  name: string
  role?: string
}

interface BusinessState {
  activeBusinessId: string | null
  setActiveBusinessId: (id: string | null) => void
  businesses: Business[]
  setBusinesses: (businesses: Business[]) => void
  clearBusiness: () => void
}

export const useBusinessStore = create<BusinessState>()(
  persist(
    (set) => ({
      activeBusinessId: null,
      setActiveBusinessId: (id) => set({ activeBusinessId: id }),
      businesses: [],
      setBusinesses: (businesses) => set({ businesses }),
      clearBusiness: () => set({ activeBusinessId: null }),
    }),
    { name: BUSINESS_STORAGE_KEY, partialize: (s) => ({ activeBusinessId: s.activeBusinessId }) }
  )
)
