"use client"

import { useEffect, useState, useCallback } from "react"
import { Building2, Loader2, Users, ChevronDown, Check, Search } from "lucide-react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import { formatDistanceToNow } from "date-fns"
import { he } from "date-fns/locale"
import type { Tier } from "@/lib/tiers"

interface OrgRow {
  id: string
  name: string
  created_at: string
  tier_id: string | null
  tier_name: string | null
  user_count: number
}

const TIER_COLORS: Record<string, string> = {
  Free: "text-slate-300",
  Pro: "text-blue-400",
  Business: "text-violet-400",
  Enterprise: "text-amber-400",
}

function getTierColor(name: string | null) {
  return name ? (TIER_COLORS[name] ?? "text-emerald-400") : "text-slate-500"
}

function TierSelect({
  orgId,
  currentTierId,
  tiers,
  onChanged,
}: {
  orgId: string
  currentTierId: string | null
  tiers: Tier[]
  onChanged: (tierId: string | null) => void
}) {
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const current = tiers.find((t) => t.id === currentTierId)

  const assign = async (tierId: string | null) => {
    setSaving(true)
    setOpen(false)
    try {
      const res = await fetch(`/api/super-admin/organizations/${orgId}/tier`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tier_id: tierId }),
      })
      if (!res.ok) { const e = await res.json(); throw new Error(e.error) }
      toast.success("המסלול עודכן")
      onChanged(tierId)
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        disabled={saving}
        className={cn(
          "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all",
          current
            ? `${getTierColor(current.name)} bg-slate-800/80 border-slate-700 hover:border-slate-600`
            : "text-slate-500 bg-slate-800/60 border-slate-700/50 hover:border-slate-600"
        )}
      >
        {saving ? (
          <Loader2 className="h-3 w-3 animate-spin" />
        ) : (
          <>
            {current?.name ?? "ללא מסלול"}
            <ChevronDown className="h-3 w-3 opacity-60" />
          </>
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute left-0 top-full mt-1 z-20 bg-slate-800 border border-slate-700 rounded-xl shadow-xl py-1 min-w-36">
            <button
              onClick={() => assign(null)}
              className="flex items-center gap-2 w-full px-3 py-2 text-xs text-slate-400 hover:bg-slate-700 transition-colors"
            >
              {!currentTierId && <Check className="h-3 w-3 text-primary" />}
              <span className={!currentTierId ? "mr-0" : "mr-4"}>ללא מסלול</span>
            </button>
            {tiers.map((tier) => (
              <button
                key={tier.id}
                onClick={() => assign(tier.id)}
                className="flex items-center gap-2 w-full px-3 py-2 text-xs hover:bg-slate-700 transition-colors"
              >
                {currentTierId === tier.id && <Check className="h-3 w-3 text-primary shrink-0" />}
                <span className={cn(
                  "font-medium",
                  currentTierId === tier.id ? "" : "mr-4",
                  getTierColor(tier.name)
                )}>
                  {tier.name}
                </span>
                {tier.price != null && (
                  <span className="text-slate-500 mr-auto">₪{tier.price}</span>
                )}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

export default function OrganizationsPage() {
  const [orgs, setOrgs] = useState<OrgRow[]>([])
  const [tiers, setTiers] = useState<Tier[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")

  const fetchData = useCallback(async () => {
    const [orgsRes, tiersRes] = await Promise.all([
      fetch("/api/super-admin/organizations"),
      fetch("/api/super-admin/tiers"),
    ])
    const [orgsData, tiersData] = await Promise.all([orgsRes.json(), tiersRes.json()])
    setOrgs(Array.isArray(orgsData) ? orgsData : [])
    setTiers(Array.isArray(tiersData) ? tiersData : [])
    setLoading(false)
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  const handleTierChanged = (orgId: string, tierId: string | null) => {
    const newTier = tiers.find((t) => t.id === tierId) ?? null
    setOrgs((prev) =>
      prev.map((o) =>
        o.id === orgId
          ? { ...o, tier_id: tierId, tier_name: newTier?.name ?? null }
          : o
      )
    )
  }

  const filtered = orgs.filter(
    (o) =>
      o.name.toLowerCase().includes(search.toLowerCase())
  )

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
      </div>
    )
  }

  return (
    <div className="space-y-6" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Building2 className="h-6 w-6 text-primary" />
            ארגונים
          </h1>
          <p className="text-slate-400 mt-1 text-sm">{orgs.length} ארגונים במערכת</p>
        </div>
        {/* Search */}
        <div className="relative">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="חפש ארגון..."
            className="bg-slate-800 border border-slate-700 rounded-lg pr-9 pl-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-primary w-56"
          />
        </div>
      </div>

      {/* Tier filter pills */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs text-slate-500 ml-1">סנן לפי מסלול:</span>
        {tiers.map((t) => {
          const count = orgs.filter((o) => o.tier_id === t.id).length
          return (
            <button
              key={t.id}
              onClick={() => setSearch("")}
              className={cn(
                "text-xs px-2.5 py-1 rounded-full border transition-all",
                getTierColor(t.name),
                "bg-slate-800/60 border-slate-700/50 hover:border-slate-600"
              )}
            >
              {t.name} ({count})
            </button>
          )
        })}
        <span className="text-xs text-slate-600 px-2.5 py-1 rounded-full bg-slate-800/40 border border-slate-700/30">
          ללא מסלול ({orgs.filter((o) => !o.tier_id).length})
        </span>
      </div>

      {/* Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-800 text-right">
                <th className="px-5 py-3 text-xs font-medium text-slate-500 text-right">ארגון</th>
                <th className="px-5 py-3 text-xs font-medium text-slate-500 text-right">משתמשים</th>
                <th className="px-5 py-3 text-xs font-medium text-slate-500 text-right">נוצר</th>
                <th className="px-5 py-3 text-xs font-medium text-slate-500 text-right">מסלול</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filtered.map((org) => (
                <tr key={org.id} className="hover:bg-slate-800/30 transition-colors">
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-3">
                      <div className="h-7 w-7 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
                        <Building2 className="h-3.5 w-3.5 text-primary" />
                      </div>
                      <span className="text-white font-medium">{org.name}</span>
                    </div>
                  </td>
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-1.5 text-slate-400">
                      <Users className="h-3.5 w-3.5" />
                      {org.user_count}
                    </div>
                  </td>
                  <td className="px-5 py-3.5 text-slate-500 text-xs">
                    {org.created_at
                      ? formatDistanceToNow(new Date(org.created_at), { addSuffix: true, locale: he })
                      : "—"}
                  </td>
                  <td className="px-5 py-3.5">
                    <TierSelect
                      orgId={org.id}
                      currentTierId={org.tier_id}
                      tiers={tiers}
                      onChanged={(tierId) => handleTierChanged(org.id, tierId)}
                    />
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={4} className="text-center py-12 text-slate-600 text-sm">
                    לא נמצאו ארגונים
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
