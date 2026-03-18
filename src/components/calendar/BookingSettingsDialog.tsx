"use client"

import { useState, useEffect, useCallback } from "react"
import { createClient } from "@/lib/supabase/client"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Calendar,
  Copy,
  Check,
  Loader2,
  ExternalLink,
  Link as LinkIcon,
  Clock,
  ToggleLeft,
  ToggleRight,
  Save,
  Plus,
  ChevronRight,
  Pencil,
  Trash2,
  Kanban,
} from "lucide-react"

interface WorkingDay { start: string; end: string }
interface WorkingHours { [day: string]: WorkingDay | null }

interface BookingLink {
  id: string
  is_enabled: boolean
  slug: string
  display_name: string | null
  description: string | null
  appointment_duration: number
  buffer_time: number
  working_hours: WorkingHours
  pipeline_id: string | null
  stage_id: string | null
}

interface FormState {
  id?: string
  is_enabled: boolean
  slug: string
  display_name: string
  description: string
  appointment_duration: number
  buffer_time: number
  working_hours: WorkingHours
  pipeline_id: string
  stage_id: string
}

interface Pipeline { id: string; name: string }
interface Stage { id: string; name: string; pipeline_id: string; position: number }

const DEFAULT_WORKING_HOURS: WorkingHours = {
  "0": { start: "09:00", end: "17:00" },
  "1": { start: "09:00", end: "17:00" },
  "2": { start: "09:00", end: "17:00" },
  "3": { start: "09:00", end: "17:00" },
  "4": { start: "09:00", end: "14:00" },
  "5": null,
  "6": null,
}

const DAY_NAMES = ["ראשון", "שני", "שלישי", "רביעי", "חמישי", "שישי", "שבת"]
const DURATION_OPTIONS = [15, 20, 30, 45, 60, 90, 120]
const BUFFER_OPTIONS = [0, 5, 10, 15, 30]

const HOURS = Array.from({ length: 28 }, (_, i) => {
  const h = Math.floor(i / 2) + 7
  const m = i % 2 === 0 ? "00" : "30"
  return `${h.toString().padStart(2, "0")}:${m}`
}).filter(h => h <= "21:00")

const EMPTY_FORM: FormState = {
  is_enabled: true,
  slug: "",
  display_name: "",
  description: "",
  appointment_duration: 30,
  buffer_time: 0,
  working_hours: DEFAULT_WORKING_HOURS,
  pipeline_id: "",
  stage_id: "",
}

interface BookingSettingsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  businessId: string
}

export function BookingSettingsDialog({ open, onOpenChange, businessId }: BookingSettingsDialogProps) {
  const supabase = createClient()
  const [view, setView] = useState<"list" | "edit">("list")
  const [links, setLinks] = useState<BookingLink[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [slugError, setSlugError] = useState<string | null>(null)
  const [form, setForm] = useState<FormState>(EMPTY_FORM)

  const [pipelines, setPipelines] = useState<Pipeline[]>([])
  const [stages, setStages] = useState<Stage[]>([])

  const loadLinks = useCallback(async () => {
    if (!businessId) return
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data } = await supabase
      .from("booking_settings")
      .select("*")
      .eq("business_id", businessId)
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })

    setLinks((data || []) as BookingLink[])
    setLoading(false)
  }, [businessId, supabase])

  const loadPipelines = useCallback(async () => {
    if (!businessId) return
    const { data: pData } = await supabase
      .from("pipelines")
      .select("id, name")
      .eq("business_id", businessId)
      .order("created_at")

    setPipelines((pData || []) as Pipeline[])

    const { data: sData } = await supabase
      .from("stages")
      .select("id, name, pipeline_id, position")
      .in("pipeline_id", (pData || []).map(p => p.id))
      .order("position")

    setStages((sData || []) as Stage[])
  }, [businessId, supabase])

  useEffect(() => {
    if (open) {
      loadLinks()
      loadPipelines()
      setView("list")
    }
  }, [open, loadLinks, loadPipelines])

  const openNewForm = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name")
      .eq("id", user.id)
      .maybeSingle()

    const name = profile?.full_name || ""
    const suffix = links.length > 0 ? `-${links.length + 1}` : ""
    const autoSlug = (name
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 36) || user.id.slice(0, 8)) + suffix

    setForm({
      ...EMPTY_FORM,
      slug: autoSlug,
      display_name: name ? `פגישה עם ${name}` : "",
    })
    setSlugError(null)
    setView("edit")
  }

  const openEditForm = (link: BookingLink) => {
    setForm({
      id: link.id,
      is_enabled: link.is_enabled,
      slug: link.slug,
      display_name: link.display_name || "",
      description: link.description || "",
      appointment_duration: link.appointment_duration,
      buffer_time: link.buffer_time,
      working_hours: link.working_hours,
      pipeline_id: link.pipeline_id || "",
      stage_id: link.stage_id || "",
    })
    setSlugError(null)
    setView("edit")
  }

  const checkSlug = async (slug: string) => {
    if (!slug || slug.length < 3) {
      setSlugError("הלינק חייב להכיל לפחות 3 תווים")
      return
    }
    if (!/^[a-z0-9-]+$/.test(slug)) {
      setSlugError("הלינק יכול להכיל רק אותיות באנגלית קטנות, מספרים ומקפים")
      return
    }
    const { data: existing } = await supabase
      .from("booking_settings")
      .select("id")
      .eq("slug", slug)
      .maybeSingle()

    if (existing && existing.id !== form.id) {
      setSlugError("הלינק הזה כבר תפוס")
      return
    }
    setSlugError(null)
  }

  const handleSave = async () => {
    if (!businessId) return
    const slug = form.slug.trim()
    if (!slug || slug.length < 3) {
      setSlugError("הלינק חייב להכיל לפחות 3 תווים")
      return
    }
    if (!/^[a-z0-9-]+$/.test(slug)) {
      setSlugError("הלינק יכול להכיל רק אותיות באנגלית קטנות, מספרים ומקפים")
      return
    }
    if (slugError) return

    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setSaving(false); return }

    const pipelineId = form.pipeline_id && form.pipeline_id !== "none" ? form.pipeline_id : null
    const stageId = pipelineId && form.stage_id ? form.stage_id : null

    const payload = {
      business_id: businessId,
      user_id: user.id,
      is_enabled: form.is_enabled,
      slug,
      display_name: form.display_name || null,
      description: form.description || null,
      appointment_duration: form.appointment_duration,
      buffer_time: form.buffer_time,
      working_hours: form.working_hours,
      pipeline_id: pipelineId,
      stage_id: stageId,
      updated_at: new Date().toISOString(),
    }

    let error
    if (form.id) {
      ({ error } = await supabase.from("booking_settings").update(payload).eq("id", form.id))
    } else {
      ({ error } = await supabase.from("booking_settings").insert(payload))
    }

    if (error) {
      if (error.message?.includes("duplicate") || error.message?.includes("unique")) {
        toast.error("כתובת הלינק כבר תפוסה")
        setSlugError("הלינק הזה כבר תפוס")
      } else {
        toast.error(`שגיאה בשמירה: ${error.message}`)
      }
    } else {
      toast.success(form.id ? "הלינק עודכן בהצלחה" : "הלינק נוצר בהצלחה")
      await loadLinks()
      setView("list")
    }
    setSaving(false)
  }

  const handleDelete = async () => {
    if (!form.id) return
    setDeleting(true)
    const { error } = await supabase.from("booking_settings").delete().eq("id", form.id)
    if (error) {
      toast.error("שגיאה במחיקת הלינק")
    } else {
      toast.success("הלינק נמחק")
      await loadLinks()
      setView("list")
    }
    setDeleting(false)
  }

  const toggleDay = (day: string) => {
    setForm((s) => ({
      ...s,
      working_hours: {
        ...s.working_hours,
        [day]: s.working_hours[day] ? null : { start: "09:00", end: "17:00" },
      },
    }))
  }

  const updateDayHours = (day: string, field: "start" | "end", value: string) => {
    setForm((s) => ({
      ...s,
      working_hours: {
        ...s.working_hours,
        [day]: { ...(s.working_hours[day] || { start: "09:00", end: "17:00" }), [field]: value },
      },
    }))
  }

  const copyLink = (slug: string, id: string) => {
    const url = `${window.location.origin}/book/${slug}`
    navigator.clipboard.writeText(url)
    setCopiedId(id)
    toast.success("הלינק הועתק!")
    setTimeout(() => setCopiedId(null), 2000)
  }

  const filteredStages = stages.filter(s => s.pipeline_id === form.pipeline_id)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg">
            <LinkIcon className="h-5 w-5" />
            {view === "list" ? "לינקים לקביעת פגישה" : (form.id ? "עריכת לינק" : "לינק חדש")}
          </DialogTitle>
        </DialogHeader>

        {view === "list" && (
          <ListView
            links={links}
            loading={loading}
            copiedId={copiedId}
            onNew={openNewForm}
            onEdit={openEditForm}
            onCopy={copyLink}
          />
        )}

        {view === "edit" && (
          <EditView
            form={form}
            setForm={setForm}
            slugError={slugError}
            saving={saving}
            deleting={deleting}
            pipelines={pipelines}
            filteredStages={filteredStages}
            onCheckSlug={checkSlug}
            onSave={handleSave}
            onDelete={handleDelete}
            onBack={() => setView("list")}
            toggleDay={toggleDay}
            updateDayHours={updateDayHours}
          />
        )}
      </DialogContent>
    </Dialog>
  )
}

function ListView({
  links,
  loading,
  copiedId,
  onNew,
  onEdit,
  onCopy,
}: {
  links: BookingLink[]
  loading: boolean
  copiedId: string | null
  onNew: () => void
  onEdit: (link: BookingLink) => void
  onCopy: (slug: string, id: string) => void
}) {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {links.length === 0 ? (
        <div className="text-center py-12">
          <div className="w-14 h-14 rounded-2xl bg-blue-50 flex items-center justify-center mx-auto mb-4">
            <LinkIcon className="h-7 w-7 text-blue-400" />
          </div>
          <p className="font-medium text-slate-700">אין לינקים עדיין</p>
          <p className="text-sm text-muted-foreground mt-1">צרו לינק חדש כדי לאפשר קביעת פגישות</p>
        </div>
      ) : (
        <div className="space-y-2">
          {links.map((link) => (
            <div
              key={link.id}
              className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 hover:border-blue-200 hover:bg-blue-50/30 transition-colors group"
            >
              <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${link.is_enabled ? "bg-green-500" : "bg-slate-300"}`} />

              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm text-slate-800 truncate">
                  {link.display_name || link.slug}
                </p>
                <p className="text-xs text-muted-foreground font-mono truncate" dir="ltr">
                  /book/{link.slug}
                </p>
              </div>

              <div className="flex items-center gap-1 shrink-0">
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8"
                  onClick={(e) => { e.stopPropagation(); onCopy(link.slug, link.id) }}
                >
                  {copiedId === link.id ? (
                    <Check className="h-3.5 w-3.5 text-green-600" />
                  ) : (
                    <Copy className="h-3.5 w-3.5" />
                  )}
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8"
                  asChild
                >
                  <a href={`/book/${link.slug}`} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()}>
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8"
                  onClick={() => onEdit(link)}
                >
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Button onClick={onNew} className="w-full gap-2">
        <Plus className="h-4 w-4" />
        לינק חדש
      </Button>
    </div>
  )
}

function EditView({
  form,
  setForm,
  slugError,
  saving,
  deleting,
  pipelines,
  filteredStages,
  onCheckSlug,
  onSave,
  onDelete,
  onBack,
  toggleDay,
  updateDayHours,
}: {
  form: FormState
  setForm: React.Dispatch<React.SetStateAction<FormState>>
  slugError: string | null
  saving: boolean
  deleting: boolean
  pipelines: Pipeline[]
  filteredStages: Stage[]
  onCheckSlug: (slug: string) => void
  onSave: () => void
  onDelete: () => void
  onBack: () => void
  toggleDay: (day: string) => void
  updateDayHours: (day: string, field: "start" | "end", value: string) => void
}) {
  const bookingUrl = typeof window !== "undefined"
    ? `${window.location.origin}/book/${form.slug}`
    : `/book/${form.slug}`

  return (
    <div className="space-y-5">
      <button onClick={onBack} className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700 font-medium">
        <ChevronRight className="h-4 w-4" />
        חזרה לרשימה
      </button>

      {/* Enable + Slug */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label className="text-sm font-medium">הפעלת הלינק</Label>
          <button onClick={() => setForm((s) => ({ ...s, is_enabled: !s.is_enabled }))}>
            {form.is_enabled ? (
              <ToggleRight className="h-8 w-8 text-blue-600" />
            ) : (
              <ToggleLeft className="h-8 w-8 text-slate-300" />
            )}
          </button>
        </div>

        <div>
          <Label className="text-sm">כתובת הלינק (באנגלית)</Label>
          <div className="flex-1 relative mt-1.5">
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground select-none" dir="ltr">
              /book/
            </span>
            <Input
              dir="ltr"
              value={form.slug}
              onChange={(e) => {
                const v = e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "")
                setForm((s) => ({ ...s, slug: v }))
                onCheckSlug(v)
              }}
              className="pr-16 text-left"
              placeholder="your-name"
            />
          </div>
          {slugError && <p className="text-sm text-destructive mt-1">{slugError}</p>}
        </div>

        {form.is_enabled && form.slug && !slugError && (
          <div className="flex items-center gap-2 bg-blue-50 border border-blue-100 rounded-lg p-2.5 text-sm text-blue-700 font-mono truncate" dir="ltr">
            {bookingUrl}
          </div>
        )}

        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <Label className="text-sm">שם תצוגה</Label>
            <Input
              value={form.display_name}
              onChange={(e) => setForm((s) => ({ ...s, display_name: e.target.value }))}
              className="mt-1.5"
              placeholder="פגישה עם דניאל"
            />
          </div>
          <div>
            <Label className="text-sm">תיאור</Label>
            <Input
              value={form.description}
              onChange={(e) => setForm((s) => ({ ...s, description: e.target.value }))}
              className="mt-1.5"
              placeholder="שיחת היכרות"
            />
          </div>
        </div>
      </div>

      {/* Duration + Buffer */}
      <div>
        <h3 className="text-sm font-medium flex items-center gap-2 mb-3">
          <Clock className="h-4 w-4" />
          זמני פגישה
        </h3>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <Label className="text-sm">משך פגישה</Label>
            <Select
              value={form.appointment_duration.toString()}
              onValueChange={(v) => setForm((s) => ({ ...s, appointment_duration: parseInt(v) }))}
            >
              <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
              <SelectContent>
                {DURATION_OPTIONS.map((d) => (
                  <SelectItem key={d} value={d.toString()}>{d} דקות</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-sm">הפסקה בין פגישות</Label>
            <Select
              value={form.buffer_time.toString()}
              onValueChange={(v) => setForm((s) => ({ ...s, buffer_time: parseInt(v) }))}
            >
              <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
              <SelectContent>
                {BUFFER_OPTIONS.map((b) => (
                  <SelectItem key={b} value={b.toString()}>{b === 0 ? "ללא" : `${b} דקות`}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Pipeline + Stage */}
      <div>
        <h3 className="text-sm font-medium flex items-center gap-2 mb-3">
          <Kanban className="h-4 w-4" />
          שיוך לפייפליין (אופציונלי)
        </h3>
        <p className="text-xs text-muted-foreground mb-3">
          אם נבחר פייפליין, כשמישהו קובע פגישה הוא ייכנס אוטומטית לשלב שנבחר (או יעבור אליו אם הוא כבר בפייפליין)
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <Label className="text-sm">פייפליין</Label>
            <Select
              value={form.pipeline_id}
              onValueChange={(v) => setForm((s) => ({ ...s, pipeline_id: v, stage_id: "" }))}
            >
              <SelectTrigger className="mt-1.5"><SelectValue placeholder="ללא" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">ללא</SelectItem>
                {pipelines.map((p) => (
                  <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-sm">שלב</Label>
            <Select
              value={form.stage_id}
              onValueChange={(v) => setForm((s) => ({ ...s, stage_id: v }))}
              disabled={!form.pipeline_id || form.pipeline_id === "none"}
            >
              <SelectTrigger className="mt-1.5"><SelectValue placeholder="בחרו שלב" /></SelectTrigger>
              <SelectContent>
                {filteredStages.map((s) => (
                  <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Working Hours */}
      <div>
        <h3 className="text-sm font-medium flex items-center gap-2 mb-3">
          <Calendar className="h-4 w-4" />
          שעות עבודה
        </h3>
        <div className="space-y-2">
          {DAY_NAMES.map((name, idx) => {
            const day = idx.toString()
            const hours = form.working_hours[day]
            const isActive = hours !== null && hours !== undefined

            return (
              <div key={day} className="flex items-center gap-2.5">
                <button
                  onClick={() => toggleDay(day)}
                  className={`w-14 text-sm font-medium text-right shrink-0 ${isActive ? "text-foreground" : "text-muted-foreground line-through"}`}
                >
                  {name}
                </button>
                <button onClick={() => toggleDay(day)} className="shrink-0">
                  {isActive ? <ToggleRight className="h-5 w-5 text-blue-600" /> : <ToggleLeft className="h-5 w-5 text-slate-300" />}
                </button>
                {isActive && hours ? (
                  <div className="flex items-center gap-1.5 flex-1">
                    <Select value={hours.start} onValueChange={(v) => updateDayHours(day, "start", v)}>
                      <SelectTrigger className="w-22 h-8 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {HOURS.map((h) => <SelectItem key={h} value={h}>{h}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <span className="text-muted-foreground text-xs">–</span>
                    <Select value={hours.end} onValueChange={(v) => updateDayHours(day, "end", v)}>
                      <SelectTrigger className="w-22 h-8 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {HOURS.map((h) => <SelectItem key={h} value={h}>{h}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                ) : (
                  <span className="text-xs text-muted-foreground">יום חופש</span>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between border-t pt-4">
        {form.id ? (
          <Button variant="destructive" size="sm" onClick={onDelete} disabled={deleting} className="gap-2">
            {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
            מחיקה
          </Button>
        ) : (
          <div />
        )}
        <Button onClick={onSave} disabled={saving || !!slugError} className="gap-2">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          {form.id ? "שמירת שינויים" : "יצירת לינק"}
        </Button>
      </div>
    </div>
  )
}
