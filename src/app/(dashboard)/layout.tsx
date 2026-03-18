"use client"

import { Sidebar } from "@/components/layouts/Sidebar"
import { Header } from "@/components/layouts/Header"
import { BusinessGuard } from "@/components/layouts/BusinessGuard"
import { useSidebarStore } from "@/lib/store"
import { cn } from "@/lib/utils"

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { isCollapsed } = useSidebarStore()

  return (
    <div className="min-h-screen bg-background text-foreground flex">
      <Sidebar />

      <div
        className={cn(
          "flex-1 flex flex-col min-h-screen transition-all duration-500 ease-[cubic-bezier(0.4,0,0.2,1)] relative z-10 min-w-0",
          isCollapsed ? "lg:pr-20" : "lg:pr-64"
        )}
      >
        <Header />

        <main className="flex-1 flex flex-col min-h-0 overflow-hidden min-w-0">
          <div className="flex-1 flex flex-col min-h-0 w-full p-4 lg:p-8 animate-in fade-in slide-in-from-bottom-4 duration-500 min-w-0">
            <BusinessGuard>
              {children}
            </BusinessGuard>
          </div>
        </main>
      </div>
    </div>
  )
}
