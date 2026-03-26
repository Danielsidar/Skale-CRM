"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { LayoutDashboard, Building2, Layers, LogOut, ShieldCheck } from "lucide-react"
import { cn } from "@/lib/utils"

const navItems = [
  { href: "/super-admin", label: "דשבורד", icon: LayoutDashboard, exact: true },
  { href: "/super-admin/organizations", label: "ארגונים", icon: Building2, exact: false },
  { href: "/super-admin/tiers", label: "מסלולים", icon: Layers, exact: false },
]

export function SuperAdminSidebar() {
  const pathname = usePathname()

  return (
    <aside className="w-64 bg-slate-900 border-l border-slate-800 flex flex-col fixed right-0 top-0 bottom-0 z-40">
      {/* Logo */}
      <div className="p-6 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-lg shadow-primary/20">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div>
            <p className="font-bold text-white leading-none">Super Admin</p>
            <p className="text-xs text-slate-400 mt-0.5">Skale CRM</p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 p-4 space-y-1">
        {navItems.map((item) => {
          const isActive = item.exact ? pathname === item.href : pathname.startsWith(item.href)
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-150 group",
                isActive
                  ? "bg-primary/10 text-primary border border-primary/20"
                  : "text-slate-400 hover:text-white hover:bg-slate-800 border border-transparent"
              )}
            >
              <item.icon className={cn(
                "h-4 w-4 shrink-0 transition-colors",
                isActive ? "text-primary" : "group-hover:text-primary"
              )} />
              <span className="text-sm font-medium">{item.label}</span>
            </Link>
          )
        })}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-slate-800">
        <Link
          href="/leads"
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-all duration-150 text-sm font-medium border border-transparent"
        >
          <LogOut className="h-4 w-4" />
          חזור למערכת
        </Link>
      </div>
    </aside>
  )
}
