"use client"

import Link from "next/link"
import { Card, CardHeader, CardTitle } from "@/components/ui/card"
import { Settings, Kanban, Users, Zap, Share2, Lock } from "lucide-react"
import { usePermissions } from "@/lib/hooks/usePermissions"

const items = [
  { name: "שלבי לידים", href: "/settings/pipelines", icon: Kanban, permission: "view_pipelines" },
  { name: "אוטומציות", href: "/settings/automations", icon: Zap, permission: "view_automations" },
  { name: "אינטגרציות", href: "/settings/integrations", icon: Share2, permission: "view_integrations" },
  { name: "משתמשים ותפקידים", href: "/settings/users", icon: Users, permission: "view_users" },
]

export default function SettingsPage() {
  const { can, role } = usePermissions()

  const visibleItems = items.filter(item => role === "admin" || can("settings", item.permission))

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <Settings className="h-6 w-6" />
          הגדרות
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          ניהול שלבי לידים, אוטומציות ומשתמשי העסק
        </p>
      </div>

      {visibleItems.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="h-16 w-16 rounded-2xl bg-muted flex items-center justify-center mb-4">
            <Lock className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="font-bold text-lg">אין גישה להגדרות</h3>
          <p className="text-muted-foreground text-sm mt-1">פנה למנהל המערכת לקבלת הרשאות</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {visibleItems.map((item) => (
            <Link key={item.href} href={item.href}>
              <Card className="hover:border-primary/30 transition-colors cursor-pointer">
                <CardHeader className="flex flex-row items-center gap-2">
                  <item.icon className="h-5 w-5 text-muted-foreground" />
                  <CardTitle className="text-base">{item.name}</CardTitle>
                </CardHeader>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
