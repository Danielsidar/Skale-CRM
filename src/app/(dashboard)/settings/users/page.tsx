"use client"

import { useEffect, useState, useCallback } from "react"
import { createClient } from "@/lib/supabase/client"
import { useBusiness } from "@/lib/hooks/useBusiness"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  ArrowRight, User, Plus, Loader2, Shield, Settings2, Eye,
  Target, LayoutGrid, Mail, Zap, Kanban,
  Download, Pencil, Trash2, UserCheck, CalendarDays,
  Package, Users as UsersIcon, Key, BarChart3, ChevronLeft,
  Phone, EyeOff, DollarSign, MapPin, RotateCcw, X
} from "lucide-react"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
  DialogTrigger, DialogFooter,
} from "@/components/ui/dialog"
import {
  Sheet, SheetContent, SheetHeader, SheetTitle,
} from "@/components/ui/sheet"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface BusinessUserRow {
  id: string; user_id: string; role: string; email?: string; full_name?: string
}

interface PermissionRow {
  id: string; role: string; resource: string; action: string; is_allowed: boolean
}

interface OverrideRow {
  id: string; business_id: string; user_id: string; resource: string; action: string; is_allowed: boolean
}

interface PermItem {
  resource: string; action: string; label: string; desc?: string; icon?: React.ElementType
}

interface PermSection {
  key: string; title: string; description?: string
  icon: React.ElementType; iconBg: string; iconColor: string
  highlight?: boolean; grid?: boolean
  items: PermItem[]
}

// ---------------------------------------------------------------------------
// Toggle Switch
// ---------------------------------------------------------------------------

function Toggle({ checked, onChange, disabled, variant = "default" }: {
  checked: boolean; onChange: () => void; disabled?: boolean
  variant?: "default" | "override"
}) {
  return (
    <button
      type="button"
      role="switch"
      dir="ltr"
      aria-checked={checked}
      disabled={disabled}
      onClick={(e) => { e.stopPropagation(); onChange() }}
      className={cn(
        "relative inline-flex h-[26px] w-[48px] shrink-0 cursor-pointer items-center rounded-full transition-colors duration-200",
        variant === "override"
          ? (checked ? "bg-amber-500" : "bg-amber-300")
          : (checked ? "bg-emerald-500" : "bg-slate-200 dark:bg-slate-700"),
        disabled && "opacity-50 cursor-not-allowed",
      )}
    >
      <span
        className="pointer-events-none block h-[20px] w-[20px] rounded-full bg-white shadow-md transition-all duration-200"
        style={{ transform: checked ? "translateX(22px)" : "translateX(3px)" }}
      />
    </button>
  )
}

// ---------------------------------------------------------------------------
// Permission sections config
// ---------------------------------------------------------------------------

const SECTIONS: PermSection[] = [
  {
    key: "visibility", title: "נראות נתונים",
    description: "האם רואה את כל הנתונים, או רק את המשוייכים אליו",
    icon: Eye, iconBg: "bg-blue-100", iconColor: "text-blue-600", highlight: true,
    items: [
      { resource: "deals", action: "manage_all", label: "לידים — צפייה בהכל", desc: "כשכבוי, רואה רק לידים שמשוייכים אליו", icon: Target },
      { resource: "contacts", action: "manage_all", label: "אנשי קשר — צפייה בהכל", desc: "כשכבוי, רואה רק אנשי קשר שבבעלותו", icon: User },
    ],
  },
  {
    key: "display", title: "תצוגת שדות",
    description: "אילו שדות המשתמש יכול לראות",
    icon: EyeOff, iconBg: "bg-rose-50", iconColor: "text-rose-600",
    items: [
      { resource: "deals", action: "view_value", label: "ערך העסקה", desc: "הצגת סכום העסקה בקנבן ובטבלה", icon: DollarSign },
      { resource: "deals", action: "view_source", label: "מקור הליד", desc: "מאיפה הגיע הליד", icon: MapPin },
      { resource: "deals", action: "view_reports", label: "דוחות ונתונים", desc: "סטטיסטיקות, סה\"כ ערך, אחוזי המרה", icon: BarChart3 },
      { resource: "contacts", action: "view_phone", label: "טלפון איש קשר", desc: "מספר הטלפון של לקוחות", icon: Phone },
      { resource: "contacts", action: "view_email", label: "אימייל איש קשר", desc: "כתובת מייל של לקוחות", icon: Mail },
      { resource: "contacts", action: "view_source", label: "מקור איש קשר", desc: "מאיפה הגיע איש הקשר", icon: MapPin },
    ],
  },
  {
    key: "deals", title: "לידים / עסקאות",
    icon: Target, iconBg: "bg-emerald-50", iconColor: "text-emerald-600",
    items: [
      { resource: "deals", action: "create", label: "יצירת ליד חדש", icon: Plus },
      { resource: "deals", action: "edit", label: "עריכת פרטי ליד", desc: "שם, ערך, תגיות", icon: Pencil },
      { resource: "deals", action: "delete", label: "מחיקת לידים", icon: Trash2 },
      { resource: "deals", action: "reassign", label: "שינוי שיוך (נציג אחראי)", desc: "העברת בעלות לנציג אחר", icon: UserCheck },
      { resource: "deals", action: "move_stage", label: "העברה בין שלבים", icon: Kanban },
      { resource: "deals", action: "export", label: "ייצוא לאקסל", icon: Download },
    ],
  },
  {
    key: "contacts", title: "אנשי קשר",
    icon: User, iconBg: "bg-violet-50", iconColor: "text-violet-600",
    items: [
      { resource: "contacts", action: "create", label: "יצירת איש קשר חדש", icon: Plus },
      { resource: "contacts", action: "edit", label: "עריכת פרטים", icon: Pencil },
      { resource: "contacts", action: "delete", label: "מחיקת אנשי קשר", icon: Trash2 },
      { resource: "contacts", action: "reassign", label: "שינוי שיוך", icon: UserCheck },
      { resource: "contacts", action: "export", label: "ייצוא לאקסל", icon: Download },
    ],
  },
  {
    key: "system", title: "ניהול מערכת",
    icon: Settings2, iconBg: "bg-amber-50", iconColor: "text-amber-600",
    items: [
      { resource: "pipelines", action: "edit", label: "עריכת פייפליינים ושלבים", icon: Kanban },
      { resource: "automations", action: "edit", label: "ניהול אוטומציות", icon: Zap },
      { resource: "mailing", action: "send", label: "שליחת קמפיינים", icon: Mail },
    ],
  },
  {
    key: "pages", title: "גישה לדפים",
    description: "אילו עמודים במערכת המשתמש יכול לראות",
    icon: LayoutGrid, iconBg: "bg-slate-100", iconColor: "text-slate-600", grid: true,
    items: [
      { resource: "pages", action: "view_dashboard", label: "דאשבורד", icon: BarChart3 },
      { resource: "pages", action: "view_leads", label: "לידים", icon: Target },
      { resource: "pages", action: "view_contacts", label: "אנשי קשר", icon: User },
      { resource: "pages", action: "view_calendar", label: "יומן", icon: CalendarDays },
      { resource: "pages", action: "view_products", label: "מוצרים", icon: Package },
      { resource: "pages", action: "view_customers", label: "לקוחות", icon: UsersIcon },
      { resource: "pages", action: "view_automations", label: "אוטומציות", icon: Zap },
      { resource: "pages", action: "view_mailing", label: "מיילינג", icon: Mail },
      { resource: "pages", action: "view_settings", label: "הגדרות", icon: Settings2 },
      { resource: "pages", action: "view_api", label: "API", icon: Key },
    ],
  },
  {
    key: "settings_sub", title: "תפריט הגדרות",
    description: "אילו חלקים בדף ההגדרות הנציג יכול לראות",
    icon: Settings2, iconBg: "bg-indigo-50", iconColor: "text-indigo-600", grid: true,
    items: [
      { resource: "settings", action: "view_pipelines", label: "שלבי לידים", icon: Kanban },
      { resource: "settings", action: "view_automations", label: "אוטומציות", icon: Zap },
      { resource: "settings", action: "view_integrations", label: "אינטגרציות", icon: Settings2 },
      { resource: "settings", action: "view_users", label: "משתמשים ותפקידים", icon: UsersIcon },
      { resource: "settings", action: "view_booking", label: "לינק קביעת פגישה", icon: CalendarDays },
    ],
  },
]

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export default function SettingsUsersPage() {
  const { businessId } = useBusiness()
  const supabase = createClient()

  const [members, setMembers] = useState<BusinessUserRow[]>([])
  const [permissions, setPermissions] = useState<PermissionRow[]>([])
  const [overrides, setOverrides] = useState<OverrideRow[]>([])
  const [currentUserRole, setCurrentUserRole] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  // Add-user dialog
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isAddingUser, setIsAddingUser] = useState(false)
  const [newUser, setNewUser] = useState({ email: "", fullName: "", role: "agent" as "admin" | "manager" | "agent" })

  // Permissions dialog
  const [permDialogOpen, setPermDialogOpen] = useState(false)

  // User detail slider
  const [selectedUser, setSelectedUser] = useState<BusinessUserRow | null>(null)
  const [userSliderOpen, setUserSliderOpen] = useState(false)
  const [editingProfile, setEditingProfile] = useState(false)
  const [editName, setEditName] = useState("")
  const [editRole, setEditRole] = useState("")
  const [isSavingProfile, setIsSavingProfile] = useState(false)

  // ---- Data loading ----
  const loadData = useCallback(async () => {
    if (!businessId) return
    setLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: businessUsers, error: buError } = await supabase
        .from("business_users").select("id, user_id, role").eq("business_id", businessId)
      if (buError) throw buError

      const me = businessUsers.find(bu => bu.user_id === user.id)
      setCurrentUserRole(me?.role || null)

      const userIds = businessUsers.map(bu => bu.user_id)
      const { data: profiles } = await supabase.from("profiles").select("id, email, full_name").in("id", userIds)
      const pMap = new Map((profiles || []).map(p => [p.id, p]))
      setMembers(businessUsers.map(bu => {
        const p = pMap.get(bu.user_id)
        return { ...bu, email: p?.email, full_name: p?.full_name }
      }))

      if (me?.role === "admin") {
        const { data: perms } = await supabase.from("business_permissions").select("*").eq("business_id", businessId)
        setPermissions(perms || [])

        const { data: ovr } = await supabase.from("user_permission_overrides").select("*").eq("business_id", businessId)
        setOverrides(ovr || [])
      }
    } catch (err: any) {
      toast.error("שגיאה בטעינת נתונים", { description: err.message })
    } finally {
      setLoading(false)
    }
  }, [businessId, supabase])

  useEffect(() => { loadData() }, [loadData])

  // ---- Permission helpers ----
  const getPerm = (role: string, resource: string, action: string) =>
    permissions.find(p => p.role === role && p.resource === resource && p.action === action)?.is_allowed ?? false

  const permCount = (role: string) => {
    const total = SECTIONS.flatMap(s => s.items).length
    const on = SECTIONS.flatMap(s => s.items).filter(i => getPerm(role, i.resource, i.action)).length
    return { on, total }
  }

  const handleToggle = async (role: string, resource: string, action: string) => {
    const existing = permissions.find(p => p.role === role && p.resource === resource && p.action === action)
    try {
      if (existing) {
        const next = !existing.is_allowed
        const { error } = await supabase.from("business_permissions").update({ is_allowed: next }).eq("id", existing.id)
        if (error) throw error
        setPermissions(prev => prev.map(p => p.id === existing.id ? { ...p, is_allowed: next } : p))
      } else {
        const { data, error } = await supabase
          .from("business_permissions")
          .insert({ business_id: businessId, role: role as any, resource, action, is_allowed: true })
          .select().single()
        if (error) throw error
        setPermissions(prev => [...prev, data as PermissionRow])
      }
      toast.success("עודכן")
    } catch (err: any) {
      toast.error("שגיאה", { description: err.message })
    }
  }

  // ---- User override helpers ----
  const getUserOverride = (userId: string, resource: string, action: string): OverrideRow | undefined =>
    overrides.find(o => o.user_id === userId && o.resource === resource && o.action === action)

  const getEffectivePerm = (userId: string, role: string, resource: string, action: string): { value: boolean; isOverride: boolean } => {
    const override = getUserOverride(userId, resource, action)
    if (override) return { value: override.is_allowed, isOverride: true }
    return { value: getPerm(role, resource, action), isOverride: false }
  }

  const handleUserOverrideToggle = async (userId: string, resource: string, action: string, currentRole: string) => {
    const existing = getUserOverride(userId, resource, action)
    try {
      if (existing) {
        const next = !existing.is_allowed
        const { error } = await supabase.from("user_permission_overrides").update({ is_allowed: next }).eq("id", existing.id)
        if (error) throw error
        setOverrides(prev => prev.map(o => o.id === existing.id ? { ...o, is_allowed: next } : o))
      } else {
        const roleDefault = getPerm(currentRole, resource, action)
        const { data, error } = await supabase
          .from("user_permission_overrides")
          .insert({ business_id: businessId, user_id: userId, resource, action, is_allowed: !roleDefault })
          .select().single()
        if (error) throw error
        setOverrides(prev => [...prev, data as OverrideRow])
      }
      toast.success("הרשאה אישית עודכנה")
    } catch (err: any) {
      toast.error("שגיאה", { description: err.message })
    }
  }

  const handleRemoveOverride = async (userId: string, resource: string, action: string) => {
    const existing = getUserOverride(userId, resource, action)
    if (!existing) return
    try {
      const { error } = await supabase.from("user_permission_overrides").delete().eq("id", existing.id)
      if (error) throw error
      setOverrides(prev => prev.filter(o => o.id !== existing.id))
      toast.success("חזר לברירת מחדל")
    } catch (err: any) {
      toast.error("שגיאה", { description: err.message })
    }
  }

  // ---- Add user ----
  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newUser.email || !newUser.fullName) { toast.error("נא למלא את כל השדות"); return }
    setIsAddingUser(true)
    try {
      const res = await fetch("/api/business/users/add", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...newUser, businessId }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "שגיאה")
      toast.success("המשתמש נוסף", { description: `סיסמה זמנית: ${data.tempPassword}` })
      setIsDialogOpen(false)
      setNewUser({ email: "", fullName: "", role: "agent" })
      loadData()
    } catch (err: any) {
      toast.error("שגיאה", { description: err.message })
    } finally {
      setIsAddingUser(false)
    }
  }

  // ---- Save profile ----
  const handleSaveProfile = async () => {
    if (!selectedUser) return
    setIsSavingProfile(true)
    try {
      if (editName !== (selectedUser.full_name || "")) {
        const { error } = await supabase.from("profiles").update({ full_name: editName }).eq("id", selectedUser.user_id)
        if (error) throw error
      }
      if (editRole !== selectedUser.role) {
        const { error } = await supabase.from("business_users").update({ role: editRole }).eq("id", selectedUser.id)
        if (error) throw error
      }
      toast.success("פרטי המשתמש עודכנו")
      setEditingProfile(false)
      loadData()
    } catch (err: any) {
      toast.error("שגיאה בעדכון", { description: err.message })
    } finally {
      setIsSavingProfile(false)
    }
  }

  const openUserSlider = (member: BusinessUserRow) => {
    setSelectedUser(member)
    setEditName(member.full_name || "")
    setEditRole(member.role)
    setEditingProfile(false)
    setUserSliderOpen(true)
  }

  if (!businessId) return null
  const isAdmin = currentUserRole === "admin"

  // ---- Render section for a given role (role-level dialog) ----
  const renderSection = (role: string, section: PermSection) => {
    const SectionIcon = section.icon
    return (
      <div key={section.key} className="space-y-2">
        <div className="flex items-center gap-2.5 pt-1">
          <div className={cn("h-7 w-7 rounded-lg flex items-center justify-center", section.iconBg)}>
            <SectionIcon className={cn("h-3.5 w-3.5", section.iconColor)} />
          </div>
          <div>
            <h3 className="font-black text-[13px] text-foreground">{section.title}</h3>
            {section.description && <p className="text-[10px] text-muted-foreground leading-tight">{section.description}</p>}
          </div>
        </div>

        <div className={cn(
          section.highlight && "bg-blue-50/70 border border-blue-100 rounded-xl p-1",
          section.grid && "grid grid-cols-2 gap-1",
          !section.highlight && !section.grid && "space-y-0",
        )}>
          {section.items.map(item => {
            const allowed = getPerm(role, item.resource, item.action)
            const Icon = item.icon

            if (section.grid) {
              return (
                <div
                  key={`${item.resource}-${item.action}`}
                  className={cn(
                    "flex items-center gap-2.5 px-3 py-2.5 rounded-lg cursor-pointer transition-all",
                    allowed ? "hover:bg-emerald-50/50" : "opacity-50 hover:opacity-70",
                  )}
                  onClick={() => handleToggle(role, item.resource, item.action)}
                >
                  <Toggle checked={allowed} onChange={() => handleToggle(role, item.resource, item.action)} />
                  {Icon && <Icon className={cn("h-3.5 w-3.5 shrink-0", allowed ? "text-foreground" : "text-muted-foreground")} />}
                  <span className={cn("text-xs font-bold", allowed ? "text-foreground" : "text-muted-foreground")}>{item.label}</span>
                </div>
              )
            }

            return (
              <div
                key={`${item.resource}-${item.action}`}
                className={cn(
                  "flex items-center justify-between px-3 py-3 rounded-xl cursor-pointer transition-all group",
                  allowed ? "hover:bg-muted/40" : "opacity-60 hover:opacity-80",
                )}
                onClick={() => handleToggle(role, item.resource, item.action)}
              >
                <div className="flex items-center gap-3 min-w-0">
                  {Icon && (
                    <div className={cn(
                      "h-7 w-7 rounded-lg flex items-center justify-center shrink-0 transition-colors",
                      allowed ? "bg-emerald-50 text-emerald-600" : "bg-slate-100 text-slate-400",
                    )}>
                      <Icon className="h-3.5 w-3.5" />
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="text-[13px] font-bold truncate">{item.label}</p>
                    {item.desc && <p className="text-[10px] text-muted-foreground truncate">{item.desc}</p>}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0 mr-2">
                  <span className={cn("text-[10px] font-bold", allowed ? "text-emerald-600" : "text-slate-400")}>
                    {allowed ? "מופעל" : "חסום"}
                  </span>
                  <Toggle checked={allowed} onChange={() => handleToggle(role, item.resource, item.action)} />
                </div>
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  // ---- Render user-level permission section ----
  const renderUserSection = (user: BusinessUserRow, section: PermSection) => {
    const SectionIcon = section.icon
    return (
      <div key={section.key} className="space-y-1.5">
        <div className="flex items-center gap-2 pt-1">
          <div className={cn("h-6 w-6 rounded-md flex items-center justify-center", section.iconBg)}>
            <SectionIcon className={cn("h-3 w-3", section.iconColor)} />
          </div>
          <h3 className="font-black text-[12px] text-foreground">{section.title}</h3>
        </div>

        <div className={cn(
          section.highlight && "bg-blue-50/70 border border-blue-100 rounded-lg p-1",
          section.grid && "grid grid-cols-2 gap-0.5",
          !section.highlight && !section.grid && "space-y-0",
        )}>
          {section.items.map(item => {
            const { value: allowed, isOverride } = getEffectivePerm(user.user_id, user.role, item.resource, item.action)
            const Icon = item.icon

            if (section.grid) {
              return (
                <div
                  key={`${item.resource}-${item.action}`}
                  className={cn(
                    "flex items-center gap-2 px-2 py-2 rounded-lg cursor-pointer transition-all",
                    allowed ? "hover:bg-emerald-50/50" : "opacity-50 hover:opacity-70",
                    isOverride && "ring-1 ring-amber-200 bg-amber-50/30",
                  )}
                  onClick={() => handleUserOverrideToggle(user.user_id, item.resource, item.action, user.role)}
                >
                  <Toggle
                    checked={allowed}
                    onChange={() => handleUserOverrideToggle(user.user_id, item.resource, item.action, user.role)}
                    variant={isOverride ? "override" : "default"}
                  />
                  {Icon && <Icon className={cn("h-3 w-3 shrink-0", allowed ? "text-foreground" : "text-muted-foreground")} />}
                  <span className={cn("text-[11px] font-bold", allowed ? "text-foreground" : "text-muted-foreground")}>{item.label}</span>
                  {isOverride && (
                    <button
                      onClick={(e) => { e.stopPropagation(); handleRemoveOverride(user.user_id, item.resource, item.action) }}
                      className="mr-auto text-amber-500 hover:text-amber-700 transition-colors"
                    >
                      <RotateCcw className="h-3 w-3" />
                    </button>
                  )}
                </div>
              )
            }

            return (
              <div
                key={`${item.resource}-${item.action}`}
                className={cn(
                  "flex items-center justify-between px-2.5 py-2.5 rounded-lg cursor-pointer transition-all group",
                  allowed ? "hover:bg-muted/40" : "opacity-60 hover:opacity-80",
                  isOverride && "ring-1 ring-amber-200 bg-amber-50/30",
                )}
                onClick={() => handleUserOverrideToggle(user.user_id, item.resource, item.action, user.role)}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  {Icon && (
                    <div className={cn(
                      "h-6 w-6 rounded-md flex items-center justify-center shrink-0 transition-colors",
                      isOverride ? "bg-amber-100 text-amber-600" : (allowed ? "bg-emerald-50 text-emerald-600" : "bg-slate-100 text-slate-400"),
                    )}>
                      <Icon className="h-3 w-3" />
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="text-[12px] font-bold truncate">{item.label}</p>
                    {item.desc && <p className="text-[10px] text-muted-foreground truncate">{item.desc}</p>}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0 mr-1">
                  {isOverride ? (
                    <div className="flex items-center gap-1.5">
                      <span className="text-[9px] font-black text-amber-600 bg-amber-100 px-1.5 py-0.5 rounded-md">דריסה</span>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleRemoveOverride(user.user_id, item.resource, item.action) }}
                        className="text-amber-500 hover:text-amber-700 transition-colors p-0.5"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ) : (
                    <span className={cn("text-[9px] font-bold", allowed ? "text-emerald-500" : "text-slate-400")}>
                      {allowed ? "מופעל" : "חסום"}
                    </span>
                  )}
                  <Toggle
                    checked={allowed}
                    onChange={() => handleUserOverrideToggle(user.user_id, item.resource, item.action, user.role)}
                    variant={isOverride ? "override" : "default"}
                  />
                </div>
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  const agentStats = permCount("agent")
  const managerStats = permCount("manager")

  const userOverrideCount = (userId: string) => overrides.filter(o => o.user_id === userId).length

  return (
    <div className="space-y-8 pb-12" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" className="h-9 w-9 rounded-lg" asChild>
            <Link href="/settings"><ArrowRight className="h-4 w-4" /></Link>
          </Button>
          <div>
            <h1 className="text-2xl font-black tracking-tight">משתמשים והרשאות</h1>
            <p className="text-muted-foreground text-sm">ניהול חברי הצוות, תפקידים והרשאות גישה</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {isAdmin && (
            <Button variant="outline" className="gap-2 rounded-xl font-bold" onClick={() => setPermDialogOpen(true)}>
              <Shield className="h-4 w-4" />
              ניהול הרשאות
            </Button>
          )}
          {isAdmin && (
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button className="gap-2 rounded-xl shadow-lg shadow-primary/20 font-bold">
                  <Plus className="h-4 w-4" />
                  הוסף איש צוות
                </Button>
              </DialogTrigger>
              <DialogContent dir="rtl">
                <DialogHeader>
                  <DialogTitle>הוספת איש צוות חדש</DialogTitle>
                  <DialogDescription>המשתמש ייווסף לארגון שלך. לאחר מכן תוכל למסור לו את פרטי ההתחברות.</DialogDescription>
                </DialogHeader>
                <form onSubmit={handleAddUser} className="space-y-4 py-4 text-right">
                  <div className="space-y-2">
                    <Label htmlFor="fullName">שם מלא</Label>
                    <Input id="fullName" placeholder="ישראל ישראלי" value={newUser.fullName} onChange={(e) => setNewUser({ ...newUser, fullName: e.target.value })} required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">אימייל</Label>
                    <Input id="email" type="email" placeholder="name@example.com" value={newUser.email} onChange={(e) => setNewUser({ ...newUser, email: e.target.value })} required className="text-left" />
                  </div>
                  <div className="space-y-2">
                    <Label>תפקיד</Label>
                    <Select value={newUser.role} onValueChange={(v: any) => setNewUser({ ...newUser, role: v })}>
                      <SelectTrigger className="text-right"><SelectValue /></SelectTrigger>
                      <SelectContent position="popper">
                        <SelectItem value="agent">סוכן</SelectItem>
                        <SelectItem value="manager">מנהל</SelectItem>
                        <SelectItem value="admin">אדמין</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <DialogFooter className="pt-4 flex-row-reverse gap-2">
                    <Button type="submit" disabled={isAddingUser} className="flex-1">
                      {isAddingUser ? <Loader2 className="h-4 w-4 animate-spin" /> : "צור משתמש"}
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>

      {/* Users Table */}
      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base"><User className="h-5 w-5" />חברי צוות</CardTitle>
          <CardDescription>{isAdmin ? "לחץ על משתמש לצפייה בפרטים ולניהול הרשאות אישיות" : "רשימת המשתמשים בארגון שלך."}</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-right">משתמש</TableHead>
                <TableHead className="text-right">אימייל</TableHead>
                <TableHead className="text-right">תפקיד</TableHead>
                {isAdmin && <TableHead className="text-right">הרשאות אישיות</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={isAdmin ? 4 : 3} className="text-center py-8"><Loader2 className="h-8 w-8 animate-spin mx-auto text-muted-foreground" /></TableCell></TableRow>
              ) : members.map((m) => (
                <TableRow
                  key={m.id}
                  className={cn(isAdmin && "cursor-pointer hover:bg-muted/50")}
                  onClick={() => isAdmin && openUserSlider(m)}
                >
                  <TableCell className="font-bold">
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-xs text-primary font-black">
                        {(m.full_name || "?").charAt(0)}
                      </div>
                      {m.full_name || "ללא שם"}
                    </div>
                  </TableCell>
                  <TableCell className="text-left text-muted-foreground">{m.email || m.user_id.slice(0, 8) + "…"}</TableCell>
                  <TableCell>
                    <Badge variant={m.role === "admin" ? "default" : m.role === "manager" ? "secondary" : "outline"}>
                      {m.role === "admin" ? "אדמין" : m.role === "manager" ? "מנהל" : "סוכן"}
                    </Badge>
                  </TableCell>
                  {isAdmin && (
                    <TableCell>
                      {m.role === "admin" ? (
                        <span className="text-[10px] text-muted-foreground">הרשאות מלאות</span>
                      ) : userOverrideCount(m.user_id) > 0 ? (
                        <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 text-[10px] font-bold">
                          {userOverrideCount(m.user_id)} דריסות
                        </Badge>
                      ) : (
                        <span className="text-[10px] text-muted-foreground">ברירת מחדל</span>
                      )}
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Permissions summary cards */}
      {isAdmin && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Card
            className="cursor-pointer hover:border-primary/30 hover:shadow-md transition-all group"
            onClick={() => setPermDialogOpen(true)}
          >
            <CardContent className="p-5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-blue-50 flex items-center justify-center">
                  <Shield className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="font-black text-sm">הרשאות סוכן</p>
                  <p className="text-xs text-muted-foreground">{agentStats.on} מתוך {agentStats.total} הרשאות פעילות</p>
                </div>
              </div>
              <ChevronLeft className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
            </CardContent>
          </Card>
          <Card
            className="cursor-pointer hover:border-primary/30 hover:shadow-md transition-all group"
            onClick={() => setPermDialogOpen(true)}
          >
            <CardContent className="p-5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-emerald-50 flex items-center justify-center">
                  <Shield className="h-5 w-5 text-emerald-600" />
                </div>
                <div>
                  <p className="font-black text-sm">הרשאות מנהל</p>
                  <p className="text-xs text-muted-foreground">{managerStats.on} מתוך {managerStats.total} הרשאות פעילות</p>
                </div>
              </div>
              <ChevronLeft className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
            </CardContent>
          </Card>
        </div>
      )}

      {/* ====== Role-Level Permissions Dialog ====== */}
      <Dialog open={permDialogOpen} onOpenChange={setPermDialogOpen}>
        <DialogContent className="sm:max-w-[560px] max-h-[85vh] p-0 overflow-hidden flex flex-col gap-0 border-none shadow-2xl" dir="rtl">
          <div className="relative h-20 bg-gradient-to-br from-primary via-primary/90 to-blue-600 overflow-hidden shrink-0">
            <div className="absolute inset-0 opacity-10">
              <div className="absolute top-0 right-0 w-40 h-40 bg-white rounded-full -translate-y-1/2 translate-x-1/2" />
            </div>
            <div className="relative h-full flex items-end p-5 text-white">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center">
                  <Shield className="h-5 w-5" />
                </div>
                <div>
                  <DialogTitle className="text-lg font-black text-white mb-0">ניהול הרשאות</DialogTitle>
                  <DialogDescription className="text-white/70 text-xs font-medium">הגדר מה כל תפקיד יכול לעשות במערכת</DialogDescription>
                </div>
              </div>
            </div>
          </div>

          <Tabs defaultValue="agent" dir="rtl" className="flex flex-col flex-1 min-h-0">
            <div className="px-5 pt-4 pb-2 shrink-0">
              <TabsList className="grid w-full grid-cols-2 bg-muted/60 p-1 rounded-xl h-11">
                <TabsTrigger value="agent" className="gap-2 data-[state=active]:bg-white data-[state=active]:shadow-sm rounded-lg font-bold text-xs">
                  <User className="h-3.5 w-3.5" />
                  סוכן (Agent)
                </TabsTrigger>
                <TabsTrigger value="manager" className="gap-2 data-[state=active]:bg-white data-[state=active]:shadow-sm rounded-lg font-bold text-xs">
                  <UsersIcon className="h-3.5 w-3.5" />
                  מנהל (Manager)
                </TabsTrigger>
              </TabsList>
            </div>

            {(["agent", "manager"] as const).map(role => (
              <TabsContent key={role} value={role} className="flex-1 overflow-y-auto px-5 pb-5 mt-0 space-y-5">
                {SECTIONS.map(section => renderSection(role, section))}
              </TabsContent>
            ))}
          </Tabs>

          <div className="px-5 py-3 bg-muted/40 border-t text-[11px] text-muted-foreground flex gap-2 items-center shrink-0">
            <Shield className="h-3.5 w-3.5 shrink-0" />
            <span>אדמינים תמיד בעלי הרשאות מלאות. שינויים חלים מיידית.</span>
          </div>
        </DialogContent>
      </Dialog>

      {/* ====== User Detail Slider ====== */}
      <Sheet open={userSliderOpen} onOpenChange={setUserSliderOpen}>
        <SheetContent className="w-full sm:max-w-[520px] p-0 flex flex-col h-full bg-background border-r" side="right">
          {selectedUser && (
            <>
              {/* User Header */}
              <div className="p-6 border-b bg-gradient-to-bl from-muted/50 to-background">
                <div className="flex items-start justify-between mb-5">
                  <div className="flex items-center gap-4">
                    <div className="h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center text-primary text-xl font-black">
                      {(selectedUser.full_name || "?").charAt(0)}
                    </div>
                    <div>
                      {editingProfile ? (
                        <Input
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          className="h-8 text-lg font-black mb-1 w-48"
                          autoFocus
                        />
                      ) : (
                        <h2 className="text-xl font-black leading-none mb-1">{selectedUser.full_name || "ללא שם"}</h2>
                      )}
                      <div className="flex items-center gap-2">
                        {editingProfile ? (
                          <Select value={editRole} onValueChange={setEditRole}>
                            <SelectTrigger className="h-6 text-[10px] w-24 border-primary/30">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="agent">סוכן</SelectItem>
                              <SelectItem value="manager">מנהל</SelectItem>
                              <SelectItem value="admin">אדמין</SelectItem>
                            </SelectContent>
                          </Select>
                        ) : (
                          <Badge variant={selectedUser.role === "admin" ? "default" : selectedUser.role === "manager" ? "secondary" : "outline"}>
                            {selectedUser.role === "admin" ? "אדמין" : selectedUser.role === "manager" ? "מנהל" : "סוכן"}
                          </Badge>
                        )}
                        {userOverrideCount(selectedUser.user_id) > 0 && !editingProfile && (
                          <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 text-[10px]">
                            {userOverrideCount(selectedUser.user_id)} דריסות
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    {editingProfile ? (
                      <>
                        <Button size="sm" variant="outline" className="h-8 text-xs" onClick={() => setEditingProfile(false)}>
                          ביטול
                        </Button>
                        <Button size="sm" className="h-8 text-xs" onClick={handleSaveProfile} disabled={isSavingProfile}>
                          {isSavingProfile ? <Loader2 className="h-3 w-3 animate-spin" /> : "שמור"}
                        </Button>
                      </>
                    ) : (
                      <Button size="sm" variant="ghost" className="h-8 text-xs gap-1" onClick={() => setEditingProfile(true)}>
                        <Pencil className="h-3 w-3" />
                        עריכה
                      </Button>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-2">
                  <div className="flex items-center gap-2.5 text-sm text-muted-foreground">
                    <Mail className="h-3.5 w-3.5" />
                    <span className="text-left">{selectedUser.email || "—"}</span>
                  </div>
                </div>
              </div>

              {/* Permissions Section */}
              {selectedUser.role === "admin" ? (
                <div className="flex-1 flex items-center justify-center p-8">
                  <div className="text-center space-y-3">
                    <div className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto">
                      <Shield className="h-8 w-8 text-primary" />
                    </div>
                    <h3 className="font-black text-lg">הרשאות מלאות</h3>
                    <p className="text-sm text-muted-foreground max-w-xs">
                      אדמינים תמיד בעלי גישה מלאה לכל הפעולות והנתונים במערכת.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="flex-1 overflow-y-auto">
                  <div className="px-5 py-4 border-b bg-amber-50/50">
                    <div className="flex items-center gap-2">
                      <Shield className="h-4 w-4 text-amber-600" />
                      <h3 className="font-black text-sm text-amber-900">הרשאות אישיות</h3>
                    </div>
                    <p className="text-[11px] text-amber-700/70 mt-1">
                      לחיצה על מתג יוצרת דריסה אישית. ניתן להחזיר לברירת המחדל של התפקיד בלחיצה על <span className="inline-flex items-center"><X className="h-2.5 w-2.5 mx-0.5" /></span>
                    </p>
                  </div>
                  <div className="px-5 py-4 space-y-4">
                    {SECTIONS.map(section => renderUserSection(selectedUser, section))}
                  </div>
                </div>
              )}
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  )
}
