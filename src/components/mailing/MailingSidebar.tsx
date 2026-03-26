"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { cn } from "@/lib/utils"
import { useSidebarStore } from "@/lib/store"
import { 
  LayoutDashboard, 
  Mail, 
  Send, 
  Users, 
  Contact,
  Settings, 
  LogOut,
  PanelLeftClose,
  PanelLeftOpen,
  ArrowRight,
  Sparkles,
  History,
  Layout
} from "lucide-react"
import { 
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"

const mailingMenuItems = [
  { name: "סקירת דיוור", href: "/mailing", icon: LayoutDashboard },
  { name: "שליחת קמפיין", href: "/mailing/send", icon: Send },
  { name: "קמפיינים", href: "/mailing/campaigns", icon: History },
  { name: "רשימות תפוצה", href: "/mailing/lists", icon: Users },
  { name: "אנשי קשר", href: "/mailing/contacts", icon: Contact },
  { name: "תבניות מייל", href: "/mailing/templates", icon: Layout },
  { name: "הגדרות", href: "/mailing/settings", icon: Settings },
]

export function MailingSidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()
  const { isCollapsed, toggleSidebar } = useSidebarStore()

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push("/login")
    router.refresh()
  }

  return (
    <aside
      className={cn(
        "fixed inset-y-0 right-0 z-50 bg-[#0f172a] text-slate-300 transition-all duration-300 ease-in-out overflow-x-hidden",
        isCollapsed ? "w-20" : "w-64",
        "hidden lg:block shadow-2xl border-l border-white/5"
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
          <Link href="/mailing" className="flex items-center gap-3 shrink-0">
            <div className="text-indigo-400 shrink-0 transition-transform hover:scale-110">
              <Mail className="h-8 w-8" />
            </div>
            <div className={cn(
              "flex flex-col transition-all duration-300 origin-right",
              isCollapsed ? "opacity-0 w-0 scale-0" : "opacity-100 w-auto scale-100"
            )}>
              <span className="font-bold text-xl tracking-tight text-white">Skale Mailing</span>
              <span className="text-[10px] text-indigo-400 font-bold uppercase tracking-wider">מערכת דיוור</span>
            </div>
          </Link>
        </div>

        {/* Navigation */}
        <TooltipProvider delayDuration={100}>
          <nav className="flex-1 space-y-1">
            {mailingMenuItems.map((item) => {
              const isActive = pathname === item.href || (item.href !== "/mailing" && pathname.startsWith(item.href))
              return (
                <Tooltip key={item.href}>
                  <TooltipTrigger asChild>
                    <Link
                      href={item.href}
                      className={cn(
                        "flex items-center px-4 py-3 text-sm font-medium transition-all duration-300 group relative",
                        isActive
                          ? "text-white bg-indigo-500/10"
                          : "text-slate-400 hover:text-white hover:bg-white/5",
                        isCollapsed ? "justify-center px-0 h-12 w-12 mx-auto rounded-lg gap-0" : "gap-4"
                      )}
                    >
                      {isActive && !isCollapsed && (
                        <div className="absolute right-0 top-1/2 -translate-y-1/2 w-1.5 h-8 bg-indigo-500 rounded-l-full" />
                      )}
                      <item.icon
                        className={cn(
                          "h-5 w-5 shrink-0 transition-colors duration-200",
                          isActive ? "text-indigo-400" : "text-slate-400 group-hover:text-white"
                        )}
                      />
                      <span className={cn(
                        "truncate transition-all duration-300",
                        isCollapsed ? "opacity-0 w-0 invisible" : "opacity-100 w-auto visible"
                      )}>
                        {item.name}
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
          </nav>
        </TooltipProvider>

        {/* Footer */}
        <div className="border-t border-white/10 pt-4 space-y-1">
          <Link href="/dashboard" className="w-full block">
            <Button
              variant="ghost"
              className={cn(
                "w-full justify-start text-indigo-400 hover:text-white hover:bg-indigo-500/10 rounded-lg h-12 transition-all duration-300 mb-2",
                isCollapsed ? "justify-center px-0 gap-0" : "px-4 gap-4"
              )}
            >
              <ArrowRight className="h-5 w-5 rotate-180" />
              <span className={cn(
                "text-sm truncate transition-all duration-300 font-bold",
                isCollapsed ? "opacity-0 w-0 invisible" : "opacity-100 w-auto visible"
              )}>
                חזרה ל-CRM
              </span>
            </Button>
          </Link>

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
              "text-sm truncate transition-all duration-300",
              isCollapsed ? "opacity-0 w-0 invisible" : "opacity-100 w-auto visible"
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
              "text-sm truncate transition-all duration-300",
              isCollapsed ? "opacity-0 w-0 invisible" : "opacity-100 w-auto visible"
            )}>
              התנתקות
            </span>
          </Button>
        </div>
      </div>
    </aside>
  )
}
