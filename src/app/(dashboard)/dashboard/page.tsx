"use client"

import { useEffect, useState, useMemo, useCallback } from "react"
import { createClient } from "@/lib/supabase/client"
import { useBusiness } from "@/lib/hooks/useBusiness"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Target,
  TrendingUp,
  TrendingDown,
  Users,
  DollarSign,
  Trophy,
  CalendarDays,
  Clock,
  CheckCircle2,
  Phone,
  Mail,
  MessageSquare,
  ArrowUpRight,
  Zap,
  BarChart3,
  Activity,
  UserCheck,
  PlusCircle,
  Calendar,
  CircleDot,
  ArrowRightLeft,
  ListTodo,
} from "lucide-react"
import { formatDistanceToNow, format, subDays, startOfDay, endOfDay, isToday, startOfMonth } from "date-fns"
import { he } from "date-fns/locale"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
} from "recharts"
import { cn } from "@/lib/utils"
import Link from "next/link"

type DealRow = {
  id: string
  title: string
  value: number | null
  stage_id: string
  pipeline_id: string
  owner_user_id: string | null
  contact_id: string | null
  created_at: string | null
  stage: { id: string; name: string; is_won: boolean; is_lost: boolean; color: string | null } | null
  pipeline: { id: string; name: string } | null
  contact: { id: string; full_name: string; phone: string | null; email: string | null } | null
}

type ActivityRow = {
  id: string
  type: string
  content: string | null
  created_at: string | null
  created_by_user_id: string
  contact_id: string | null
  deal_id: string | null
  task_status: string | null
  due_date: string | null
  assignee_user_id: string | null
  contact?: { full_name: string } | null
  deal?: { title: string } | null
}

type AppointmentRow = {
  id: string
  title: string
  description: string | null
  start_time: string
  end_time: string
  status: string
  location: string | null
  meeting_link: string | null
  assigned_to_user_id: string | null
  created_by_user_id: string | null
  contact: { full_name: string; phone: string | null } | null
}

type BusinessUser = {
  id: string
  name: string
}

const CHART_COLORS = [
  "hsl(var(--primary))",
  "#10b981",
  "#f59e0b",
  "#ef4444",
  "#8b5cf6",
  "#06b6d4",
  "#ec4899",
  "#14b8a6",
]
const PIE_COLORS = ["#6366f1", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#06b6d4", "#ec4899", "#14b8a6"]

export default function DashboardPage() {
  const supabase = createClient()
  const { businessId, businesses } = useBusiness()
  const role = businesses.find((b) => b.id === businessId)?.role || "agent"
  const isAdmin = role === "admin" || role === "manager"

  const [loading, setLoading] = useState(true)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [deals, setDeals] = useState<DealRow[]>([])
  const [activities, setActivities] = useState<ActivityRow[]>([])
  const [businessUsers, setBusinessUsers] = useState<BusinessUser[]>([])
  const [appointments, setAppointments] = useState<AppointmentRow[]>([])
  const [contactsCount, setContactsCount] = useState(0)
  const [customersCount, setCustomersCount] = useState(0)
  const [monthlyPurchasesTotal, setMonthlyPurchasesTotal] = useState(0)

  const loadDashboardData = useCallback(async () => {
    if (!businessId) return
    setLoading(true)

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) return
      setCurrentUserId(user.id)

      const now = new Date()
      const monthStart = startOfMonth(now).toISOString()

      const [
        { data: dealsData },
        { data: activitiesData },
        { data: usersData },
        { count: contactsTotal },
        { count: customersTotal },
        { data: purchasesData },
        { data: appointmentsData },
      ] = await Promise.all([
        supabase
          .from("deals")
          .select("id, title, value, stage_id, pipeline_id, owner_user_id, contact_id, created_at, stage:stages(*), pipeline:pipelines(id,name), contact:contacts(id,full_name,phone,email)")
          .eq("business_id", businessId)
          .order("created_at", { ascending: false }),
        supabase
          .from("activities")
          .select("id, type, content, created_at, created_by_user_id, contact_id, deal_id, task_status, due_date, assignee_user_id, contact:contacts(full_name), deal:deals(title)")
          .eq("business_id", businessId)
          .order("created_at", { ascending: false })
          .limit(50),
        supabase
          .from("business_users")
          .select("user_id, profiles:user_id(id, full_name, email)")
          .eq("business_id", businessId),
        supabase
          .from("contacts")
          .select("id", { count: "exact", head: true })
          .eq("business_id", businessId),
        supabase
          .from("customers")
          .select("id", { count: "exact", head: true })
          .eq("business_id", businessId),
        supabase
          .from("customer_purchases")
          .select("price")
          .eq("business_id", businessId)
          .gte("created_at", monthStart),
        supabase
          .from("appointments")
          .select("id, title, description, start_time, end_time, status, location, meeting_link, assigned_to_user_id, created_by_user_id, contact:contacts(full_name, phone)")
          .eq("business_id", businessId)
          .in("status", ["scheduled"])
          .gte("start_time", new Date().toISOString())
          .order("start_time", { ascending: true })
          .limit(20),
      ])

      setDeals((dealsData as unknown as DealRow[]) || [])
      setActivities((activitiesData as unknown as ActivityRow[]) || [])
      setAppointments((appointmentsData as unknown as AppointmentRow[]) || [])
      setContactsCount(contactsTotal || 0)
      setCustomersCount(customersTotal || 0)
      setMonthlyPurchasesTotal(
        (purchasesData || []).reduce((sum, p) => sum + (p.price || 0), 0)
      )

      if (usersData) {
        const users = usersData.map((bu: any) => {
          const profile = Array.isArray(bu.profiles) ? bu.profiles[0] : bu.profiles
          return {
            id: bu.user_id,
            name: profile?.full_name || profile?.email || "נציג",
          }
        })
        setBusinessUsers(users)
      }
    } catch (err) {
      console.error("Dashboard load error:", err)
    } finally {
      setLoading(false)
    }
  }, [businessId, supabase])

  useEffect(() => {
    loadDashboardData()
  }, [loadDashboardData])

  const myDeals = useMemo(
    () => (currentUserId ? deals.filter((d) => d.owner_user_id === currentUserId) : []),
    [deals, currentUserId]
  )

  const relevantDeals = isAdmin ? deals : myDeals

  const stats = useMemo(() => {
    const now = new Date()
    const todayStart = startOfDay(now)
    const monthStart = startOfMonth(now)

    const active = relevantDeals.filter((d) => d.stage && !d.stage.is_won && !d.stage.is_lost)
    const won = relevantDeals.filter((d) => d.stage?.is_won)
    const lost = relevantDeals.filter((d) => d.stage?.is_lost)
    const todayDeals = relevantDeals.filter((d) => d.created_at && new Date(d.created_at) >= todayStart)
    const monthWon = won.filter((d) => d.created_at && new Date(d.created_at) >= monthStart)
    const monthLost = lost.filter((d) => d.created_at && new Date(d.created_at) >= monthStart)

    const totalActiveValue = active.reduce((sum, d) => sum + (d.value || 0), 0)
    const wonValue = monthWon.reduce((sum, d) => sum + (d.value || 0), 0)

    const closedThisMonth = monthWon.length + monthLost.length
    const conversionRate = closedThisMonth > 0 ? Math.round((monthWon.length / closedThisMonth) * 100) : 0

    return {
      activeCount: active.length,
      todayCount: todayDeals.length,
      totalActiveValue,
      wonCount: monthWon.length,
      wonValue,
      lostCount: monthLost.length,
      conversionRate,
      totalDeals: relevantDeals.length,
    }
  }, [relevantDeals])

  const last7DaysChart = useMemo(() => {
    const days = []
    for (let i = 6; i >= 0; i--) {
      const date = subDays(new Date(), i)
      const dayStart = startOfDay(date)
      const dayEnd = endOfDay(date)
      const count = relevantDeals.filter(
        (d) => d.created_at && new Date(d.created_at) >= dayStart && new Date(d.created_at) <= dayEnd
      ).length
      days.push({
        name: format(date, "EEE", { locale: he }),
        date: format(date, "dd/MM"),
        count,
      })
    }
    return days
  }, [relevantDeals])

  const pipelineDistribution = useMemo(() => {
    const map = new Map<string, { name: string; count: number; value: number }>()
    const active = relevantDeals.filter((d) => d.stage && !d.stage.is_won && !d.stage.is_lost)
    for (const deal of active) {
      const pName = deal.pipeline?.name || "ללא פייפליין"
      const existing = map.get(pName) || { name: pName, count: 0, value: 0 }
      existing.count++
      existing.value += deal.value || 0
      map.set(pName, existing)
    }
    return Array.from(map.values()).sort((a, b) => b.count - a.count)
  }, [relevantDeals])

  const stageDistribution = useMemo(() => {
    const map = new Map<string, { name: string; count: number; color: string }>()
    const active = relevantDeals.filter((d) => d.stage && !d.stage.is_won && !d.stage.is_lost)
    for (const deal of active) {
      const sName = deal.stage?.name || "ללא שלב"
      const existing = map.get(sName) || { name: sName, count: 0, color: deal.stage?.color || "#94a3b8" }
      existing.count++
      map.set(sName, existing)
    }
    return Array.from(map.values()).sort((a, b) => b.count - a.count).slice(0, 8)
  }, [relevantDeals])

  const repLeaderboard = useMemo(() => {
    if (!isAdmin) return []
    const map = new Map<string, { name: string; activeDeals: number; wonDeals: number; totalValue: number }>()
    for (const deal of deals) {
      if (!deal.owner_user_id) continue
      const userName = businessUsers.find((u) => u.id === deal.owner_user_id)?.name || "נציג"
      const existing = map.get(deal.owner_user_id) || { name: userName, activeDeals: 0, wonDeals: 0, totalValue: 0 }
      if (deal.stage && !deal.stage.is_won && !deal.stage.is_lost) {
        existing.activeDeals++
        existing.totalValue += deal.value || 0
      }
      if (deal.stage?.is_won) existing.wonDeals++
      map.set(deal.owner_user_id, existing)
    }
    return Array.from(map.values()).sort((a, b) => b.wonDeals - a.wonDeals || b.totalValue - a.totalValue)
  }, [deals, businessUsers, isAdmin])

  const relevantActivities = useMemo(() => {
    if (isAdmin) return activities.slice(0, 15)
    return activities.filter(
      (a) => a.created_by_user_id === currentUserId || a.assignee_user_id === currentUserId
    ).slice(0, 15)
  }, [activities, isAdmin, currentUserId])

  const openTasks = useMemo(() => {
    const tasks = activities.filter((a) => a.type === "task" && a.task_status === "open")
    if (!isAdmin) {
      return tasks.filter((t) => t.assignee_user_id === currentUserId || t.created_by_user_id === currentUserId)
    }
    return tasks
  }, [activities, isAdmin, currentUserId])

  const todaysTasks = useMemo(() => {
    return openTasks.filter((t) => t.due_date && isToday(new Date(t.due_date)))
  }, [openTasks])

  const overdueTasks = useMemo(() => {
    return openTasks.filter((t) => t.due_date && new Date(t.due_date) < startOfDay(new Date()))
  }, [openTasks])

  const recentNewDeals = useMemo(() => {
    const todayStart = startOfDay(new Date())
    return relevantDeals
      .filter((d) => d.created_at && new Date(d.created_at) >= todayStart)
      .slice(0, 5)
  }, [relevantDeals])

  const upcomingAppointments = useMemo(() => {
    if (isAdmin) return appointments
    return appointments.filter(
      (a) => a.assigned_to_user_id === currentUserId || a.created_by_user_id === currentUserId
    )
  }, [appointments, isAdmin, currentUserId])

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("he-IL", { style: "currency", currency: "ILS", maximumFractionDigits: 0 }).format(value)
  }

  if (loading) {
    return <DashboardSkeleton />
  }

  return (
    <div className="space-y-6 pb-10" dir="rtl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900">סקירה כללית</h1>
          <p className="text-slate-500 text-sm font-medium mt-0.5">
            {isAdmin ? "תצוגת ניהול — כל העסק" : "הנתונים שלי"}
            {" · "}
            {format(new Date(), "EEEE, d בMMMM yyyy", { locale: he })}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-xs font-bold px-3 py-1 rounded-full bg-white border-slate-200">
            <CircleDot className="h-3 w-3 ml-1.5 text-emerald-500" />
            נתונים בזמן אמת
          </Badge>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiCard
          title="עסקאות פעילות"
          value={stats.activeCount}
          subtitle={`${stats.todayCount} חדשות היום`}
          icon={<Target className="h-5 w-5" />}
          trend={stats.todayCount > 0 ? "up" : undefined}
          color="primary"
        />
        <KpiCard
          title="ערך צבר פעיל"
          value={formatCurrency(stats.totalActiveValue)}
          subtitle={`${formatCurrency(stats.wonValue)} נסגרו החודש`}
          icon={<DollarSign className="h-5 w-5" />}
          color="emerald"
        />
        <KpiCard
          title="עסקאות שנסגרו"
          value={stats.wonCount}
          subtitle={`${stats.lostCount} אבודות · ${stats.conversionRate}% המרה`}
          icon={<Trophy className="h-5 w-5" />}
          trend={stats.conversionRate >= 50 ? "up" : stats.conversionRate > 0 ? "down" : undefined}
          color="amber"
        />
        <KpiCard
          title={isAdmin ? "אנשי קשר" : "משימות פתוחות"}
          value={isAdmin ? contactsCount : openTasks.length}
          subtitle={isAdmin ? `${customersCount} לקוחות` : `${todaysTasks.length} להיום · ${overdueTasks.length} באיחור`}
          icon={isAdmin ? <Users className="h-5 w-5" /> : <ListTodo className="h-5 w-5" />}
          color="violet"
          trend={overdueTasks.length > 0 && !isAdmin ? "down" : undefined}
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Deals Over Last 7 Days */}
        <Card className="border-slate-200 shadow-sm">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-black text-slate-700 flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-primary" />
                עסקאות חדשות — 7 ימים אחרונים
              </CardTitle>
              <span className="text-xs text-slate-400 font-medium">
                סה״כ {last7DaysChart.reduce((s, d) => s + d.count, 0)}
              </span>
            </div>
          </CardHeader>
          <CardContent>
            <div className="h-[220px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={last7DaysChart} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorDeals" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{ borderRadius: 12, border: "1px solid #e2e8f0", fontSize: 12, direction: "rtl" }}
                    formatter={(value: any) => [`${value} עסקאות`, ""]}
                    labelFormatter={(label) => label}
                  />
                  <Area
                    type="monotone"
                    dataKey="count"
                    stroke="hsl(var(--primary))"
                    strokeWidth={2.5}
                    fillOpacity={1}
                    fill="url(#colorDeals)"
                    dot={{ r: 4, fill: "hsl(var(--primary))", strokeWidth: 2, stroke: "#fff" }}
                    activeDot={{ r: 6 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Stage Distribution */}
        <Card className="border-slate-200 shadow-sm">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-black text-slate-700 flex items-center gap-2">
                <Activity className="h-4 w-4 text-violet-500" />
                התפלגות לפי שלב
              </CardTitle>
              <span className="text-xs text-slate-400 font-medium">
                עסקאות פעילות
              </span>
            </div>
          </CardHeader>
          <CardContent>
            <div className="h-[220px] flex items-center gap-4">
              <div className="w-[140px] h-[140px] flex-shrink-0">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={stageDistribution}
                      cx="50%"
                      cy="50%"
                      innerRadius={40}
                      outerRadius={65}
                      paddingAngle={2}
                      dataKey="count"
                      stroke="none"
                    >
                      {stageDistribution.map((entry, index) => (
                        <Cell key={entry.name} fill={entry.color || PIE_COLORS[index % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{ borderRadius: 12, border: "1px solid #e2e8f0", fontSize: 12, direction: "rtl" }}
                      formatter={(value: any, name: any) => [`${value}`, name]}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex-1 space-y-2 overflow-y-auto max-h-[200px]">
                {stageDistribution.map((stage, i) => (
                  <div key={stage.name} className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <div
                        className="h-2.5 w-2.5 rounded-full flex-shrink-0"
                        style={{ backgroundColor: stage.color || PIE_COLORS[i % PIE_COLORS.length] }}
                      />
                      <span className="text-xs font-bold text-slate-600 truncate">{stage.name}</span>
                    </div>
                    <span className="text-xs font-black text-slate-800 flex-shrink-0">{stage.count}</span>
                  </div>
                ))}
                {stageDistribution.length === 0 && (
                  <p className="text-xs text-slate-400 text-center py-8">אין עסקאות פעילות</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Pipeline Distribution + Revenue (Admin) OR Tasks (Agent) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Pipeline Breakdown */}
        <Card className="border-slate-200 shadow-sm lg:col-span-1">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-black text-slate-700 flex items-center gap-2">
              <Zap className="h-4 w-4 text-amber-500" />
              פייפליינים
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {pipelineDistribution.length === 0 && (
                <p className="text-xs text-slate-400 text-center py-6">אין פייפליינים פעילים</p>
              )}
              {pipelineDistribution.map((p, i) => {
                const maxCount = pipelineDistribution[0]?.count || 1
                const pct = Math.round((p.count / maxCount) * 100)
                return (
                  <div key={p.name} className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-600">{p.name}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-slate-400">{formatCurrency(p.value)}</span>
                        <Badge variant="secondary" className="text-[10px] font-black px-1.5 py-0 h-5 rounded-md">
                          {p.count}
                        </Badge>
                      </div>
                    </div>
                    <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${pct}%`,
                          backgroundColor: CHART_COLORS[i % CHART_COLORS.length],
                        }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>

        {/* Tasks & Overdue */}
        <Card className="border-slate-200 shadow-sm lg:col-span-1">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-black text-slate-700 flex items-center gap-2">
                <ListTodo className="h-4 w-4 text-rose-500" />
                משימות פתוחות
              </CardTitle>
              <Badge variant={overdueTasks.length > 0 ? "destructive" : "secondary"} className="text-[10px] font-black rounded-full">
                {overdueTasks.length > 0 ? `${overdueTasks.length} באיחור` : `${openTasks.length} פתוחות`}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-[260px] overflow-y-auto">
              {openTasks.length === 0 && (
                <div className="text-center py-8">
                  <CheckCircle2 className="h-8 w-8 text-emerald-300 mx-auto mb-2" />
                  <p className="text-xs text-slate-400 font-medium">אין משימות פתוחות</p>
                </div>
              )}
              {openTasks.slice(0, 8).map((task) => {
                const isOverdue = task.due_date && new Date(task.due_date) < startOfDay(new Date())
                const isDueToday = task.due_date && isToday(new Date(task.due_date))
                return (
                  <div
                    key={task.id}
                    className={cn(
                      "p-2.5 rounded-lg border transition-colors",
                      isOverdue
                        ? "bg-rose-50/50 border-rose-200"
                        : isDueToday
                          ? "bg-amber-50/50 border-amber-200"
                          : "bg-slate-50/50 border-slate-100 hover:border-slate-200"
                    )}
                  >
                    <div className="flex items-start gap-2">
                      <div
                        className={cn(
                          "mt-0.5 h-4 w-4 rounded-full border-2 flex-shrink-0",
                          isOverdue ? "border-rose-400" : isDueToday ? "border-amber-400" : "border-slate-300"
                        )}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-slate-700 truncate">{task.content || "משימה ללא כותרת"}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          {task.due_date && (
                            <span
                              className={cn(
                                "text-[10px] font-bold",
                                isOverdue ? "text-rose-500" : isDueToday ? "text-amber-600" : "text-slate-400"
                              )}
                            >
                              {isOverdue ? "באיחור · " : isDueToday ? "היום · " : ""}
                              {format(new Date(task.due_date), "dd/MM")}
                            </span>
                          )}
                          {task.contact?.full_name && (
                            <span className="text-[10px] text-slate-400">{task.contact.full_name}</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>

        {/* Today's New Deals */}
        <Card className="border-slate-200 shadow-sm lg:col-span-1">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-black text-slate-700 flex items-center gap-2">
                <PlusCircle className="h-4 w-4 text-emerald-500" />
                עסקאות חדשות היום
              </CardTitle>
              <Badge variant="secondary" className="text-[10px] font-black rounded-full">
                {recentNewDeals.length}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-[260px] overflow-y-auto">
              {recentNewDeals.length === 0 && (
                <div className="text-center py-8">
                  <CalendarDays className="h-8 w-8 text-slate-200 mx-auto mb-2" />
                  <p className="text-xs text-slate-400 font-medium">אין עסקאות חדשות היום</p>
                </div>
              )}
              {recentNewDeals.map((deal) => (
                <Link href="/leads" key={deal.id}>
                  <div className="p-2.5 rounded-lg border border-slate-100 bg-slate-50/50 hover:border-primary/30 hover:bg-primary/5 transition-colors cursor-pointer group">
                    <div className="flex items-center justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-bold text-slate-700 truncate group-hover:text-primary transition-colors">
                          {deal.title}
                        </p>
                        <div className="flex items-center gap-2 mt-0.5">
                          {deal.contact?.full_name && (
                            <span className="text-[10px] text-slate-400">{deal.contact.full_name}</span>
                          )}
                          {deal.pipeline?.name && (
                            <span className="text-[10px] text-slate-300">· {deal.pipeline.name}</span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {deal.value ? (
                          <span className="text-xs font-black text-emerald-600">{formatCurrency(deal.value)}</span>
                        ) : null}
                        <ArrowUpRight className="h-3.5 w-3.5 text-slate-300 group-hover:text-primary opacity-0 group-hover:opacity-100 transition-all" />
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Upcoming Appointments */}
      {upcomingAppointments.length > 0 && (
        <Card className="border-slate-200 shadow-sm">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-black text-slate-700 flex items-center gap-2">
                <Calendar className="h-4 w-4 text-blue-500" />
                פגישות קרובות
              </CardTitle>
              <Link href="/calendar">
                <Badge variant="outline" className="text-[10px] font-bold rounded-full cursor-pointer hover:bg-slate-50 transition-colors">
                  צפה בלוח שנה
                  <ArrowUpRight className="h-3 w-3 mr-1" />
                </Badge>
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
              {upcomingAppointments.slice(0, 8).map((apt) => {
                const startDate = new Date(apt.start_time)
                const endDate = new Date(apt.end_time)
                const isDueToday = isToday(startDate)
                const assignedName = apt.assigned_to_user_id
                  ? businessUsers.find((u) => u.id === apt.assigned_to_user_id)?.name
                  : null

                return (
                  <div
                    key={apt.id}
                    className={cn(
                      "p-3 rounded-xl border transition-all hover:shadow-md group",
                      isDueToday
                        ? "bg-blue-50/60 border-blue-200 hover:border-blue-300"
                        : "bg-white border-slate-200 hover:border-slate-300"
                    )}
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className={cn(
                          "flex flex-col items-center justify-center h-12 w-12 rounded-xl flex-shrink-0 text-center",
                          isDueToday ? "bg-blue-100 text-blue-700" : "bg-slate-100 text-slate-600"
                        )}
                      >
                        <span className="text-[10px] font-bold leading-none">{format(startDate, "EEE", { locale: he })}</span>
                        <span className="text-lg font-black leading-none mt-0.5">{format(startDate, "d")}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-slate-800 truncate">{apt.title}</p>
                        <div className="flex items-center gap-1.5 mt-1">
                          <Clock className="h-3 w-3 text-slate-400 flex-shrink-0" />
                          <span className="text-[10px] font-bold text-slate-500">
                            {format(startDate, "HH:mm")} – {format(endDate, "HH:mm")}
                          </span>
                        </div>
                        {apt.contact?.full_name && (
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <Users className="h-3 w-3 text-slate-400 flex-shrink-0" />
                            <span className="text-[10px] text-slate-500 truncate">{apt.contact.full_name}</span>
                          </div>
                        )}
                        {apt.location && (
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <CircleDot className="h-3 w-3 text-slate-400 flex-shrink-0" />
                            <span className="text-[10px] text-slate-400 truncate">{apt.location}</span>
                          </div>
                        )}
                        {isAdmin && assignedName && (
                          <div className="mt-1">
                            <Badge variant="secondary" className="text-[9px] font-bold px-1.5 py-0 h-4 rounded-md">
                              {assignedName}
                            </Badge>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Bottom Row: Activity Feed + Rep Leaderboard (Admin) */}
      <div className={cn("grid grid-cols-1 gap-4", isAdmin ? "lg:grid-cols-5" : "lg:grid-cols-1")}>
        {/* Recent Activity */}
        <Card className={cn("border-slate-200 shadow-sm", isAdmin ? "lg:col-span-3" : "lg:col-span-1")}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-black text-slate-700 flex items-center gap-2">
              <Activity className="h-4 w-4 text-blue-500" />
              פעילות אחרונה
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1 max-h-[340px] overflow-y-auto">
              {relevantActivities.length === 0 && (
                <p className="text-xs text-slate-400 text-center py-8">אין פעילות לאחרונה</p>
              )}
              {relevantActivities.map((act) => (
                <div
                  key={act.id}
                  className="flex items-start gap-3 p-2.5 rounded-lg hover:bg-slate-50 transition-colors group"
                >
                  <div className="h-8 w-8 rounded-lg bg-slate-100 flex items-center justify-center flex-shrink-0 group-hover:bg-primary/10 transition-colors">
                    <ActivityIcon type={act.type} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-slate-700 truncate">
                      {act.content || activityTypeLabel(act.type)}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5">
                      {act.contact?.full_name && (
                        <span className="text-[10px] text-slate-400">{act.contact.full_name}</span>
                      )}
                      {act.deal?.title && (
                        <span className="text-[10px] text-slate-300">· {act.deal.title}</span>
                      )}
                    </div>
                  </div>
                  <span className="text-[10px] text-slate-400 flex-shrink-0 mt-0.5">
                    {act.created_at
                      ? formatDistanceToNow(new Date(act.created_at), { addSuffix: true, locale: he })
                      : ""}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Rep Leaderboard (Admin Only) */}
        {isAdmin && (
          <Card className="border-slate-200 shadow-sm lg:col-span-2">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-black text-slate-700 flex items-center gap-2">
                <UserCheck className="h-4 w-4 text-indigo-500" />
                ביצועי נציגים
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 max-h-[340px] overflow-y-auto">
                {repLeaderboard.length === 0 && (
                  <p className="text-xs text-slate-400 text-center py-8">אין נתונים</p>
                )}
                {repLeaderboard.map((rep, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-3 p-2.5 rounded-lg bg-slate-50/50 border border-slate-100"
                  >
                    <div
                      className={cn(
                        "h-8 w-8 rounded-full flex items-center justify-center text-xs font-black flex-shrink-0",
                        i === 0
                          ? "bg-amber-100 text-amber-700"
                          : i === 1
                            ? "bg-slate-200 text-slate-600"
                            : i === 2
                              ? "bg-orange-100 text-orange-600"
                              : "bg-slate-100 text-slate-500"
                      )}
                    >
                      {i + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-slate-700 truncate">{rep.name}</p>
                      <p className="text-[10px] text-slate-400">
                        {rep.activeDeals} פעילות · {formatCurrency(rep.totalValue)}
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <Trophy className="h-3 w-3 text-amber-500" />
                      <span className="text-xs font-black text-slate-700">{rep.wonDeals}</span>
                      <span className="text-[10px] text-slate-400">נסגרו</span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Monthly Summary (Admin) */}
      {isAdmin && monthlyPurchasesTotal > 0 && (
        <Card className="border-slate-200 shadow-sm bg-gradient-to-l from-emerald-50/50 to-white">
          <CardContent className="py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-emerald-100 flex items-center justify-center">
                  <DollarSign className="h-5 w-5 text-emerald-600" />
                </div>
                <div>
                  <p className="text-sm font-black text-slate-800">הכנסות מרכישות החודש</p>
                  <p className="text-xs text-slate-400">סה״כ רכישות שנרשמו החודש</p>
                </div>
              </div>
              <span className="text-2xl font-black text-emerald-600">{formatCurrency(monthlyPurchasesTotal)}</span>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

function KpiCard({
  title,
  value,
  subtitle,
  icon,
  trend,
  color,
}: {
  title: string
  value: string | number
  subtitle: string
  icon: React.ReactNode
  trend?: "up" | "down"
  color: "primary" | "emerald" | "amber" | "violet"
}) {
  const colorMap = {
    primary: { bg: "bg-primary/10", text: "text-primary", ring: "ring-primary/5" },
    emerald: { bg: "bg-emerald-50", text: "text-emerald-600", ring: "ring-emerald-100" },
    amber: { bg: "bg-amber-50", text: "text-amber-600", ring: "ring-amber-100" },
    violet: { bg: "bg-violet-50", text: "text-violet-600", ring: "ring-violet-100" },
  }
  const c = colorMap[color]

  return (
    <Card className="border-slate-200 shadow-sm hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className={cn("h-9 w-9 rounded-xl flex items-center justify-center ring-2", c.bg, c.text, c.ring)}>
            {icon}
          </div>
          {trend === "up" && <TrendingUp className="h-4 w-4 text-emerald-500" />}
          {trend === "down" && <TrendingDown className="h-4 w-4 text-rose-500" />}
        </div>
        <p className="text-2xl font-black text-slate-900 tracking-tight">{value}</p>
        <p className="text-xs font-bold text-slate-800 mt-0.5">{title}</p>
        <p className="text-[10px] text-slate-400 mt-0.5 font-medium">{subtitle}</p>
      </CardContent>
    </Card>
  )
}

function ActivityIcon({ type }: { type: string }) {
  const cls = "h-3.5 w-3.5 text-slate-400 group-hover:text-primary transition-colors"
  switch (type) {
    case "note":
      return <MessageSquare className={cls} />
    case "call":
      return <Phone className={cls} />
    case "email":
      return <Mail className={cls} />
    case "meeting":
      return <Calendar className={cls} />
    case "task":
      return <CheckCircle2 className={cls} />
    case "message":
      return <MessageSquare className={cls} />
    default:
      return <ArrowRightLeft className={cls} />
  }
}

function activityTypeLabel(type: string): string {
  switch (type) {
    case "note": return "הערה"
    case "call": return "שיחה"
    case "email": return "אימייל"
    case "meeting": return "פגישה"
    case "task": return "משימה"
    case "message": return "הודעה"
    default: return "פעילות"
  }
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6 pb-10" dir="rtl">
      <div>
        <Skeleton className="h-8 w-48 mb-2" />
        <Skeleton className="h-4 w-72" />
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[...Array(4)].map((_, i) => (
          <Card key={i} className="border-slate-200">
            <CardContent className="p-4 space-y-3">
              <Skeleton className="h-9 w-9 rounded-xl" />
              <Skeleton className="h-8 w-20" />
              <Skeleton className="h-3 w-28" />
              <Skeleton className="h-2.5 w-36" />
            </CardContent>
          </Card>
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="border-slate-200">
          <CardContent className="p-6">
            <Skeleton className="h-[220px] w-full rounded-lg" />
          </CardContent>
        </Card>
        <Card className="border-slate-200">
          <CardContent className="p-6">
            <Skeleton className="h-[220px] w-full rounded-lg" />
          </CardContent>
        </Card>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {[...Array(3)].map((_, i) => (
          <Card key={i} className="border-slate-200">
            <CardContent className="p-6 space-y-3">
              <Skeleton className="h-4 w-32" />
              {[...Array(4)].map((_, j) => (
                <Skeleton key={j} className="h-10 w-full rounded-lg" />
              ))}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
