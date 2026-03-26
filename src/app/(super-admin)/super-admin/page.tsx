import { getSystemStats, getBusinessesWithTiers, getAllUsers } from "@/lib/super-admin"
import { getAllTiers } from "@/lib/tiers"
import { Users, Building2, TrendingUp, Target, Layers, ArrowUpRight } from "lucide-react"
import Link from "next/link"
import { formatDistanceToNow } from "date-fns"
import { he } from "date-fns/locale"

export default async function SuperAdminPage() {
  const [stats, businesses, users, tiers] = await Promise.all([
    getSystemStats(),
    getBusinessesWithTiers(),
    getAllUsers(),
    getAllTiers(),
  ])

  const recentBusinesses = businesses.slice(0, 5)
  const recentUsers = users.slice(0, 5)

  const statCards = [
    {
      label: 'סה"כ משתמשים',
      value: stats.totalUsers,
      sub: `+${stats.newUsersLast7Days} ב-7 ימים אחרונים`,
      icon: Users,
      color: "text-blue-400",
      bg: "bg-blue-400/10",
    },
    {
      label: 'סה"כ ארגונים',
      value: stats.totalBusinesses,
      sub: `+${stats.newBusinessesLast30Days} ב-30 ימים אחרונים`,
      icon: Building2,
      color: "text-violet-400",
      bg: "bg-violet-400/10",
    },
    {
      label: 'סה"כ עסקאות',
      value: stats.totalDeals,
      sub: "בכל הארגונים",
      icon: Target,
      color: "text-emerald-400",
      bg: "bg-emerald-400/10",
    },
    {
      label: 'סה"כ אנשי קשר',
      value: stats.totalContacts,
      sub: "בכל הארגונים",
      icon: TrendingUp,
      color: "text-orange-400",
      bg: "bg-orange-400/10",
    },
  ]

  return (
    <div className="space-y-8" dir="rtl">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">דשבורד מנהל על</h1>
        <p className="text-slate-400 mt-1 text-sm">סקירה כללית של מערכת Skale CRM</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((card) => (
          <div
            key={card.label}
            className="bg-slate-900 border border-slate-800 rounded-xl p-5 flex items-start gap-4"
          >
            <div className={`${card.bg} ${card.color} p-2.5 rounded-lg shrink-0`}>
              <card.icon className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <p className="text-slate-400 text-xs font-medium">{card.label}</p>
              <p className="text-2xl font-bold text-white mt-0.5">{card.value.toLocaleString()}</p>
              <p className="text-slate-500 text-xs mt-1">{card.sub}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Tiers Overview */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Layers className="h-4 w-4 text-slate-400" />
            <h2 className="font-semibold text-white text-sm">מסלולים פעילים</h2>
          </div>
          <Link
            href="/super-admin/tiers"
            className="text-xs text-primary hover:text-primary/80 flex items-center gap-1 transition-colors"
          >
            נהל מסלולים
            <ArrowUpRight className="h-3 w-3" />
          </Link>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {tiers.filter((t) => t.is_active).map((tier) => {
            const count = businesses.filter((b) => b.tier_id === tier.id).length
            return (
              <div key={tier.id} className="bg-slate-800/60 border border-slate-700/50 rounded-lg p-3 text-center">
                <p className="text-white font-semibold text-sm">{tier.name}</p>
                <p className="text-2xl font-bold text-primary mt-1">{count}</p>
                <p className="text-slate-500 text-xs mt-0.5">ארגונים</p>
                {tier.price !== null ? (
                  <p className="text-slate-400 text-xs mt-1">₪{tier.price}/חודש</p>
                ) : (
                  <p className="text-slate-400 text-xs mt-1">מחיר מותאם</p>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Two columns: recent businesses + recent users */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Businesses */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Building2 className="h-4 w-4 text-slate-400" />
              <h2 className="font-semibold text-white text-sm">ארגונים אחרונים</h2>
            </div>
            <Link
              href="/super-admin/organizations"
              className="text-xs text-primary hover:text-primary/80 flex items-center gap-1 transition-colors"
            >
              כל הארגונים
              <ArrowUpRight className="h-3 w-3" />
            </Link>
          </div>
          <div className="space-y-2">
            {recentBusinesses.map((biz) => (
              <div key={biz.id} className="flex items-center justify-between py-2 border-b border-slate-800/60 last:border-0">
                <div className="min-w-0">
                  <p className="text-sm text-white font-medium truncate">{biz.name}</p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {biz.user_count} משתמשים ·{" "}
                    {biz.created_at
                      ? formatDistanceToNow(new Date(biz.created_at), { addSuffix: true, locale: he })
                      : ""}
                  </p>
                </div>
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full border shrink-0 mr-2 ${
                  biz.tier_name === "Free"
                    ? "text-slate-400 bg-slate-800 border-slate-700"
                    : biz.tier_name === "Pro"
                    ? "text-blue-400 bg-blue-400/10 border-blue-400/20"
                    : biz.tier_name === "Business"
                    ? "text-violet-400 bg-violet-400/10 border-violet-400/20"
                    : "text-amber-400 bg-amber-400/10 border-amber-400/20"
                }`}>
                  {biz.tier_name ?? "ללא מסלול"}
                </span>
              </div>
            ))}
            {recentBusinesses.length === 0 && (
              <p className="text-slate-500 text-sm text-center py-4">אין ארגונים עדיין</p>
            )}
          </div>
        </div>

        {/* Recent Users */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-slate-400" />
              <h2 className="font-semibold text-white text-sm">משתמשים אחרונים</h2>
            </div>
          </div>
          <div className="space-y-2">
            {recentUsers.map((user) => (
              <div key={user.id} className="flex items-center justify-between py-2 border-b border-slate-800/60 last:border-0">
                <div className="min-w-0">
                  <p className="text-sm text-white font-medium truncate">{user.full_name || user.email}</p>
                  <p className="text-xs text-slate-500 mt-0.5 truncate">{user.email}</p>
                </div>
                <div className="text-xs text-slate-400 shrink-0 mr-2 text-left">
                  <p>{user.business_count} ארגונים</p>
                  <p className="text-slate-600 mt-0.5">
                    {user.created_at
                      ? formatDistanceToNow(new Date(user.created_at), { addSuffix: true, locale: he })
                      : ""}
                  </p>
                </div>
              </div>
            ))}
            {recentUsers.length === 0 && (
              <p className="text-slate-500 text-sm text-center py-4">אין משתמשים עדיין</p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
