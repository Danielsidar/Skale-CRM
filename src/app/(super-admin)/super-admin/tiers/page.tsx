"use client"

import { useEffect, useState, useCallback } from "react"
import {
  Layers, Plus, Pencil, Trash2, Loader2, Check, X, ToggleLeft, ToggleRight,
  ChevronUp, ChevronDown, Infinity
} from "lucide-react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import {
  BOOLEAN_FEATURES,
  FEATURE_LABELS,
  LIMIT_FEATURES,
  type Tier,
  type TierFeatures,
} from "@/lib/tiers"

const DEFAULT_FEATURES: TierFeatures = {
  mailing: false,
  automations: false,
  api_access: false,
  booking: true,
  whatsapp: false,
  max_users: 3,
  max_contacts: 500,
  max_deals: 100,
  max_pipelines: 1,
  max_automations: 0,
  max_mailing_lists: 0,
  max_api_keys: 0,
}

const TIER_COLORS: Record<string, string> = {
  Free: "text-slate-300 bg-slate-800 border-slate-600",
  Pro: "text-blue-400 bg-blue-400/10 border-blue-400/30",
  Business: "text-violet-400 bg-violet-400/10 border-violet-400/30",
  Enterprise: "text-amber-400 bg-amber-400/10 border-amber-400/30",
}

function getTierColor(name: string) {
  return TIER_COLORS[name] ?? "text-emerald-400 bg-emerald-400/10 border-emerald-400/30"
}

interface TierFormProps {
  initial?: Tier | null
  onSave: (data: Omit<Tier, "id" | "created_at" | "updated_at">) => Promise<void>
  onCancel: () => void
  saving: boolean
}

function TierForm({ initial, onSave, onCancel, saving }: TierFormProps) {
  const [name, setName] = useState(initial?.name ?? "")
  const [description, setDescription] = useState(initial?.description ?? "")
  const [price, setPrice] = useState<string>(initial?.price != null ? String(initial.price) : "")
  const [isActive, setIsActive] = useState(initial?.is_active ?? true)
  const [sortOrder, setSortOrder] = useState(initial?.sort_order ?? 0)
  const [features, setFeatures] = useState<TierFeatures>(initial?.features ?? DEFAULT_FEATURES)

  const setBoolFeature = (key: keyof TierFeatures, val: boolean) =>
    setFeatures((f) => ({ ...f, [key]: val }))

  const setLimitFeature = (key: keyof TierFeatures, val: number | null) =>
    setFeatures((f) => ({ ...f, [key]: val }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) { toast.error("שם המסלול הוא שדה חובה"); return }
    await onSave({
      name: name.trim(),
      description: description.trim() || null,
      price: price !== "" ? parseFloat(price) : null,
      is_active: isActive,
      sort_order: sortOrder,
      features,
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6" dir="rtl">
      {/* Basic info */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-medium text-slate-400 mb-1.5">שם המסלול *</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-primary"
            placeholder="למשל: Pro"
            required
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-400 mb-1.5">מחיר חודשי (₪)</label>
          <input
            type="number"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-primary"
            placeholder="ריק = מחיר מותאם"
            min="0"
          />
        </div>
        <div className="sm:col-span-2">
          <label className="block text-xs font-medium text-slate-400 mb-1.5">תיאור</label>
          <input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-primary"
            placeholder="תיאור קצר של המסלול"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-400 mb-1.5">סדר תצוגה</label>
          <input
            type="number"
            value={sortOrder}
            onChange={(e) => setSortOrder(parseInt(e.target.value) || 0)}
            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-primary"
            min="0"
          />
        </div>
        <div className="flex items-end">
          <button
            type="button"
            onClick={() => setIsActive((v) => !v)}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border transition-all",
              isActive
                ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                : "bg-slate-800 border-slate-700 text-slate-400"
            )}
          >
            {isActive ? <ToggleRight className="h-4 w-4" /> : <ToggleLeft className="h-4 w-4" />}
            {isActive ? "מסלול פעיל" : "מסלול לא פעיל"}
          </button>
        </div>
      </div>

      {/* Boolean features */}
      <div>
        <p className="text-xs font-semibold text-slate-300 uppercase tracking-wider mb-3">פיצ׳רים</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {BOOLEAN_FEATURES.map((key) => {
            const enabled = features[key] as boolean
            return (
              <button
                key={key}
                type="button"
                onClick={() => setBoolFeature(key, !enabled)}
                className={cn(
                  "flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm border transition-all",
                  enabled
                    ? "bg-primary/10 border-primary/30 text-primary"
                    : "bg-slate-800/60 border-slate-700 text-slate-500 hover:border-slate-600"
                )}
              >
                <div className={cn(
                  "h-4 w-4 rounded flex items-center justify-center shrink-0",
                  enabled ? "bg-primary" : "bg-slate-700"
                )}>
                  {enabled && <Check className="h-2.5 w-2.5 text-white" />}
                </div>
                {FEATURE_LABELS[key]}
              </button>
            )
          })}
        </div>
      </div>

      {/* Limit features */}
      <div>
        <p className="text-xs font-semibold text-slate-300 uppercase tracking-wider mb-3">הגבלות</p>
        <div className="space-y-3">
          {LIMIT_FEATURES.map((key) => {
            const val = features[key] as number | null
            const isUnlimited = val === null
            return (
              <div key={key} className="flex items-center gap-3">
                <label className="text-sm text-slate-400 w-44 shrink-0">{FEATURE_LABELS[key]}</label>
                <button
                  type="button"
                  onClick={() => setLimitFeature(key, isUnlimited ? 0 : null)}
                  className={cn(
                    "flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs border transition-all shrink-0",
                    isUnlimited
                      ? "bg-amber-500/10 border-amber-500/30 text-amber-400"
                      : "bg-slate-800 border-slate-700 text-slate-500 hover:border-slate-600"
                  )}
                >
                  <Infinity className="h-3 w-3" />
                  {isUnlimited ? "ללא הגבלה" : "הגדר הגבלה"}
                </button>
                {!isUnlimited && (
                  <input
                    type="number"
                    value={val ?? 0}
                    onChange={(e) => setLimitFeature(key, parseInt(e.target.value) || 0)}
                    className="w-28 bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-primary"
                    min="0"
                  />
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-3 pt-2 border-t border-slate-800">
        <button
          type="submit"
          disabled={saving}
          className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors"
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
          {initial ? "עדכן מסלול" : "צור מסלול"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="flex items-center gap-2 bg-slate-800 border border-slate-700 text-slate-300 px-4 py-2 rounded-lg text-sm font-medium hover:bg-slate-700 transition-colors"
        >
          <X className="h-4 w-4" />
          ביטול
        </button>
      </div>
    </form>
  )
}

export default function TiersPage() {
  const [tiers, setTiers] = useState<Tier[]>([])
  const [loading, setLoading] = useState(true)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [showCreate, setShowCreate] = useState(false)
  const [saving, setSaving] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const fetchTiers = useCallback(async () => {
    const res = await fetch("/api/super-admin/tiers")
    const data = await res.json()
    setTiers(Array.isArray(data) ? data : [])
    setLoading(false)
  }, [])

  useEffect(() => { fetchTiers() }, [fetchTiers])

  const handleCreate = async (payload: Omit<Tier, "id" | "created_at" | "updated_at">) => {
    setSaving(true)
    try {
      const res = await fetch("/api/super-admin/tiers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      if (!res.ok) { const e = await res.json(); throw new Error(e.error) }
      toast.success("המסלול נוצר בהצלחה")
      setShowCreate(false)
      await fetchTiers()
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setSaving(false)
    }
  }

  const handleUpdate = async (id: string, payload: Omit<Tier, "id" | "created_at" | "updated_at">) => {
    setSaving(true)
    try {
      const res = await fetch(`/api/super-admin/tiers/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      if (!res.ok) { const e = await res.json(); throw new Error(e.error) }
      toast.success("המסלול עודכן בהצלחה")
      setEditingId(null)
      await fetchTiers()
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    setDeletingId(id)
    try {
      const res = await fetch(`/api/super-admin/tiers/${id}`, { method: "DELETE" })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      toast.success("המסלול נמחק")
      await fetchTiers()
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setDeletingId(null)
    }
  }

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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Layers className="h-6 w-6 text-primary" />
            ניהול מסלולים
          </h1>
          <p className="text-slate-400 mt-1 text-sm">{tiers.length} מסלולים במערכת</p>
        </div>
        {!showCreate && (
          <button
            onClick={() => { setShowCreate(true); setEditingId(null) }}
            className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
          >
            <Plus className="h-4 w-4" />
            מסלול חדש
          </button>
        )}
      </div>

      {/* Create form */}
      {showCreate && (
        <div className="bg-slate-900 border border-primary/30 rounded-xl p-6">
          <h2 className="text-base font-semibold text-white mb-5 flex items-center gap-2">
            <Plus className="h-4 w-4 text-primary" />
            יצירת מסלול חדש
          </h2>
          <TierForm
            onSave={handleCreate}
            onCancel={() => setShowCreate(false)}
            saving={saving}
          />
        </div>
      )}

      {/* Tiers list */}
      <div className="space-y-4">
        {tiers.map((tier) => (
          <div
            key={tier.id}
            className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden"
          >
            {editingId === tier.id ? (
              <div className="p-6">
                <h2 className="text-base font-semibold text-white mb-5">עריכת מסלול: {tier.name}</h2>
                <TierForm
                  initial={tier}
                  onSave={(payload) => handleUpdate(tier.id, payload)}
                  onCancel={() => setEditingId(null)}
                  saving={saving}
                />
              </div>
            ) : (
              <div className="p-5">
                {/* Tier header */}
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <span className={cn(
                      "text-xs font-semibold px-2.5 py-1 rounded-full border shrink-0",
                      getTierColor(tier.name)
                    )}>
                      {tier.name}
                    </span>
                    {!tier.is_active && (
                      <span className="text-xs text-slate-500 bg-slate-800 px-2 py-0.5 rounded-full border border-slate-700">
                        לא פעיל
                      </span>
                    )}
                    {tier.description && (
                      <p className="text-sm text-slate-400 truncate">{tier.description}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-sm font-medium text-slate-300">
                      {tier.price != null ? `₪${tier.price}/חודש` : "מחיר מותאם"}
                    </span>
                    <button
                      onClick={() => { setEditingId(tier.id); setShowCreate(false) }}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-all"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(tier.id)}
                      disabled={deletingId === tier.id}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-400/10 transition-all disabled:opacity-50"
                    >
                      {deletingId === tier.id
                        ? <Loader2 className="h-4 w-4 animate-spin" />
                        : <Trash2 className="h-4 w-4" />
                      }
                    </button>
                  </div>
                </div>

                {/* Features summary */}
                <div className="mt-4 pt-4 border-t border-slate-800 flex flex-wrap gap-3">
                  {BOOLEAN_FEATURES.map((key) => {
                    const enabled = tier.features[key] as boolean
                    return (
                      <span
                        key={key}
                        className={cn(
                          "text-xs px-2 py-1 rounded-md border",
                          enabled
                            ? "text-emerald-400 bg-emerald-400/10 border-emerald-400/20"
                            : "text-slate-600 bg-slate-800/40 border-slate-700/50 line-through"
                        )}
                      >
                        {FEATURE_LABELS[key]}
                      </span>
                    )
                  })}
                  <span className="text-slate-600 text-xs self-center">|</span>
                  {LIMIT_FEATURES.map((key) => {
                    const val = tier.features[key] as number | null
                    return (
                      <span key={key} className="text-xs text-slate-400 bg-slate-800/40 px-2 py-1 rounded-md border border-slate-700/50">
                        {FEATURE_LABELS[key]}: {val === null ? "∞" : val}
                      </span>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
