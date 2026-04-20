"use client"

import Link from "next/link"
import { Fragment, useState, useEffect } from "react"
import { usePathname, useRouter } from "next/navigation"
import { cn } from "@/lib/utils"
import { useSidebarStore } from "@/lib/store"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { 
  LayoutDashboard, 
  Calendar,
  Kanban, 
  Target,
  Users,
  UserCheck,
  Package,
  Settings, 
  LogOut,
  PanelLeftClose,
  PanelLeftOpen,
  BookOpen,
  Zap,
  Mail,
  FileCode,
  ExternalLink,
  Loader2,
} from "lucide-react"
import { 
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { useTierFeatures } from "@/lib/hooks/useTierFeatures"
import type { TierFeatures } from "@/lib/tiers"

const menuItems: {
  name: string
  href: string
  icon: React.ElementType
  permission: string
  target?: string
  tierFeature?: keyof TierFeatures
}[] = [
  { name: "סקירה", href: "/dashboard", icon: LayoutDashboard, permission: "view_dashboard" },
  { name: "יומן פגישות", href: "/calendar", icon: Calendar, permission: "view_calendar", tierFeature: "booking" },
  { name: "לידים", href: "/leads", icon: Target, permission: "view_leads" },
  { name: "פייפליינים", href: "/pipelines", icon: Kanban, permission: "view_leads" },
  { name: "אוטומציות", href: "/automations", icon: Zap, permission: "view_automations", tierFeature: "automations" },
  { name: "מערכת דיוור", href: "/mailing", icon: Mail, target: "_blank", permission: "view_mailing", tierFeature: "mailing" },
  { name: "לקוחות", href: "/customers", icon: UserCheck, permission: "view_contacts" },
  { name: "אנשי קשר", href: "/contacts", icon: Users, permission: "view_contacts" },
  { name: "מוצרים", href: "/products", icon: Package, permission: "view_settings" },
  { name: "API", href: "/api", icon: FileCode, permission: "view_settings", tierFeature: "api_access" },
  { name: "הגדרות", href: "/settings", icon: Settings, permission: "view_settings" },
]

export function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()
  const { isCollapsed, toggleSidebar, mobileNavOpen, setMobileNavOpen } = useSidebarStore()
  const { features, loading: featuresLoading } = useTierFeatures()
  const [allowedPages, setAllowedPages] = useState<Set<string>>(new Set())
  const [isAdmin, setIsAdmin] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadPermissions() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: bizUser } = await supabase
        .from("business_users")
        .select("role, business_id")
        .eq("user_id", user.id)
        .single()

      if (!bizUser) return
      
      if (bizUser.role === 'admin') {
        setIsAdmin(true)
        setLoading(false)
        return
      }

      const { data: perms } = await supabase
        .from("business_permissions")
        .select("action")
        .eq("business_id", bizUser.business_id)
        .eq("role", bizUser.role)
        .eq("resource", "pages")
        .eq("is_allowed", true)

      if (perms) {
        setAllowedPages(new Set(perms.map(p => p.action)))
      }
      setLoading(false)
    }

    loadPermissions()
  }, [supabase])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push("/login")
    router.refresh()
  }

  const filteredMenuItems = menuItems.filter(item => {
    if (!isAdmin && !allowedPages.has(item.permission)) return false
    if (item.tierFeature && features[item.tierFeature] === false) return false
    return true
  })

  return (
    <Fragment>
    <aside
      className={cn(
        "fixed inset-y-0 right-0 z-50 sidebar-bg transition-all duration-300 ease-in-out overflow-x-hidden",
        isCollapsed ? "w-20" : "w-64",
        "hidden lg:block shadow-2xl"
      )}
    >
      <div className="flex h-full flex-col py-6 px-4">
        {/* Logo */}
        <div
          className={cn(
            "flex h-16 items-center transition-all duration-300 mb-10 overflow-hidden",
            isCollapsed ? "justify-center" : "px-4"
          )}
        >
          <Link href="/dashboard" className="flex items-center gap-3 shrink-0">
            <div className="text-cyan-400 shrink-0 transition-transform hover:scale-110">
              <BookOpen className="h-8 w-8" />
            </div>
            <span className={cn(
              "font-bold text-2xl tracking-tight text-white transition-all duration-300 origin-right overflow-hidden",
              isCollapsed ? "opacity-0 max-w-0 scale-0 invisible" : "opacity-100 max-w-64 scale-100 visible"
            )}>
              Skale
            </span>
          </Link>
        </div>

        {/* Navigation */}
        <TooltipProvider delayDuration={100}>
          <nav className="flex-1 space-y-1">
            {!loading && !featuresLoading && filteredMenuItems.map((item) => {
              const isActive = pathname === item.href || pathname.startsWith(item.href + "/")
              return (
                <Tooltip key={item.href}>
                  <TooltipTrigger asChild>
                    <Link
                      href={item.href}
                      target={item.target}
                      rel={item.target === "_blank" ? "noopener noreferrer" : undefined}
                      className={cn(
                        "flex items-center px-4 py-3 text-sm font-medium transition-all duration-300 group relative",
                        isActive
                          ? "active-nav-item"
                          : "text-slate-400 hover:text-white hover:bg-white/5",
                        isCollapsed ? "justify-center px-0 h-12 w-12 mx-auto rounded-lg gap-0" : "gap-4"
                      )}
                    >
                      {isActive && !isCollapsed && (
                        <div className="active-nav-indicator" />
                      )}
                      <item.icon
                        className={cn(
                          "h-5 w-5 shrink-0 transition-colors duration-200",
                          isActive ? "text-primary" : "text-slate-400 group-hover:text-white"
                        )}
                      />
                      <span className={cn(
                        "truncate transition-all duration-300 flex items-center gap-2 overflow-hidden",
                        isCollapsed ? "opacity-0 max-w-0 invisible" : "opacity-100 max-w-64 visible"
                      )}>
                        {item.name}
                        {item.target === "_blank" && (
                          <ExternalLink className="h-3 w-3 opacity-60 group-hover:opacity-100 transition-all shrink-0" />
                        )}
                      </span>
                    </Link>
                  </TooltipTrigger>
                  {isCollapsed && (
                    <TooltipContent side="left" className="bg-slate-900 border-slate-800 text-white font-medium px-3 py-2 text-sm">
                      {item.name}
                    </TooltipContent>
                  )}
                </Tooltip>
              )
            })}
            {(loading || featuresLoading) && (
              <div className="flex justify-center py-4">
                <Loader2 className="h-5 w-5 animate-spin text-slate-500" />
              </div>
            )}
          </nav>
        </TooltipProvider>

        {/* Footer */}
        <div className="border-t border-white/10 pt-4 space-y-1">
          <Button
            variant="ghost"
            className={cn(
              "w-full justify-start text-slate-400 hover:text-white hover:bg-white/5 rounded-lg h-12 transition-all duration-300",
              isCollapsed ? "justify-center px-0 gap-0" : "px-4 gap-4"
            )}
            onClick={toggleSidebar}
          >
            {isCollapsed ? <PanelLeftOpen className="h-5 w-5" /> : <PanelLeftClose className="h-5 w-5" />}
            <span className={cn(
              "text-sm truncate transition-all duration-300 overflow-hidden",
              isCollapsed ? "opacity-0 max-w-0 invisible" : "opacity-100 max-w-64 visible"
            )}>
              צמצם תפריט
            </span>
          </Button>

          <Button
            variant="ghost"
            className={cn(
              "w-full justify-start text-slate-400 hover:text-rose-400 hover:bg-rose-500/5 rounded-lg h-12 group transition-all duration-300",
              isCollapsed ? "justify-center px-0 gap-0" : "px-4 gap-4"
            )}
            onClick={handleLogout}
          >
            <LogOut className="h-5 w-5 shrink-0 transition-transform group-hover:translate-x-1" />
            <span className={cn(
              "text-sm truncate transition-all duration-300 overflow-hidden",
              isCollapsed ? "opacity-0 max-w-0 invisible" : "opacity-100 max-w-64 visible"
            )}>
              התנתקות
            </span>
          </Button>
        </div>
      </div>
    </aside>

    <Sheet open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
      <SheetContent
        side="right"
        className="w-[min(100vw-2rem,20rem)] sidebar-bg border-white/10 p-0 flex flex-col lg:hidden"
        dir="rtl"
      >
        <SheetHeader className="p-6 border-b border-white/10 space-y-1">
          <SheetTitle className="text-white text-right font-bold text-xl flex items-center gap-3 justify-end">
            <BookOpen className="h-8 w-8 text-cyan-400 shrink-0" />
            Skale
          </SheetTitle>
        </SheetHeader>
        <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
          {!loading && !featuresLoading && filteredMenuItems.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + "/")
            return (
              <Link
                key={item.href}
                href={item.href}
                target={item.target}
                rel={item.target === "_blank" ? "noopener noreferrer" : undefined}
                onClick={() => setMobileNavOpen(false)}
                className={cn(
                  "flex items-center gap-4 px-4 py-3 text-sm font-medium rounded-lg transition-all",
                  isActive
                    ? "active-nav-item text-white"
                    : "text-slate-400 hover:text-white hover:bg-white/5"
                )}
              >
                <item.icon
                  className={cn(
                    "h-5 w-5 shrink-0",
                    isActive ? "text-primary" : "text-slate-400"
                  )}
                />
                <span className="truncate flex items-center gap-2">
                  {item.name}
                  {item.target === "_blank" && (
                    <ExternalLink className="h-3 w-3 opacity-60 shrink-0" />
                  )}
                </span>
              </Link>
            )
          })}
          {(loading || featuresLoading) && (
            <div className="flex justify-center py-6">
              <Loader2 className="h-6 w-6 animate-spin text-slate-500" />
            </div>
          )}
        </nav>
        <div className="border-t border-white/10 p-4 space-y-2">
          <Button
            variant="ghost"
            className="w-full justify-start text-slate-400 hover:text-rose-400 hover:bg-rose-500/5 rounded-lg h-12 gap-4 px-4"
            onClick={async () => {
              setMobileNavOpen(false)
              await supabase.auth.signOut()
              router.push("/login")
              router.refresh()
            }}
          >
            <LogOut className="h-5 w-5 shrink-0" />
            <span className="text-sm font-medium">התנתקות</span>
          </Button>
        </div>
      </SheetContent>
    </Sheet>
    </Fragment>
  )
}
