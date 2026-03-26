"use client"

import { useState, useMemo, useRef, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { useBusiness } from "@/lib/hooks/useBusiness"
import { createContact, createDeal, logActivity } from "@/lib/services/crm"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { toast } from "sonner"
import { Download, FileSpreadsheet, Loader2, Upload } from "lucide-react"
import type { Database } from "@/types/database.types"
import {
  downloadLeadsCsvTemplate,
  parseLeadsCsv,
  type CsvLeadRowValidated,
} from "@/lib/leadsCsv"
import { cn } from "@/lib/utils"

type Pipeline = Database["public"]["Tables"]["pipelines"]["Row"]
type Stage = Database["public"]["Tables"]["stages"]["Row"]
type Product = Database["public"]["Tables"]["products"]["Row"]

type LeadCsvImportDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  pipelines: Pipeline[]
  allStages: Stage[]
  defaultPipelineId: string
  defaultStageId: string
  defaultProductId?: string | null
  currentUserId: string | null
  maxDeals: number | null
  currentDealCount: number
  onSuccess: () => void
}

export function LeadCsvImportDialog({
  open,
  onOpenChange,
  pipelines,
  allStages,
  defaultPipelineId,
  defaultStageId,
  defaultProductId,
  currentUserId,
  maxDeals,
  currentDealCount,
  onSuccess,
}: LeadCsvImportDialogProps) {
  const supabase = createClient()
  const { businessId } = useBusiness()
  const fileRef = useRef<HTMLInputElement>(null)
  const wasOpenRef = useRef(false)

  const [pipelineId, setPipelineId] = useState(defaultPipelineId)
  const [stageId, setStageId] = useState(defaultStageId)
  const [productId, setProductId] = useState<string>("none")
  const [products, setProducts] = useState<Product[]>([])
  const [parsedRows, setParsedRows] = useState<CsvLeadRowValidated[]>([])
  const [parseIssues, setParseIssues] = useState<{ line: number; message: string }[]>([])
  const [emailToUserId, setEmailToUserId] = useState<Map<string, string>>(() => new Map())
  const [fileName, setFileName] = useState<string>("")
  const [importing, setImporting] = useState(false)

  const stagesForPipeline = useMemo(() => {
    return allStages
      .filter((s) => s.pipeline_id === pipelineId)
      .sort((a, b) => a.position - b.position)
  }, [allStages, pipelineId])

  const activeStages = useMemo(
    () => stagesForPipeline.filter((s) => !s.is_won && !s.is_lost),
    [stagesForPipeline]
  )

  const resolutionIssues = useMemo(() => {
    if (!pipelineId || parsedRows.length === 0) return []
    const stagesInPipe = allStages.filter((s) => s.pipeline_id === pipelineId)
    const issues: { line: number; message: string }[] = []
    for (const row of parsedRows) {
      if (row.stage_name) {
        const found = stagesInPipe.some(
          (s) =>
            s.name.trim().toLowerCase() === row.stage_name!.trim().toLowerCase()
        )
        if (!found) {
          issues.push({
            line: row.line,
            message: `שלב "${row.stage_name}" לא נמצא בפייפליין הנבחר`,
          })
        }
      }
      if (row.owner_email && !emailToUserId.has(row.owner_email)) {
        issues.push({
          line: row.line,
          message: `נציג עם המייל ${row.owner_email} לא נמצא בעסק`,
        })
      }
    }
    return issues
  }, [parsedRows, pipelineId, allStages, emailToUserId])

  useEffect(() => {
    if (!open || !businessId) return
    supabase
      .from("products")
      .select("*")
      .eq("business_id", businessId)
      .order("name")
      .then((res) => setProducts(res.data || []))
  }, [open, businessId, supabase])

  useEffect(() => {
    if (!open || !businessId) {
      setEmailToUserId(new Map())
      return
    }
    let cancelled = false
    ;(async () => {
      const { data, error } = await supabase
        .from("business_users")
        .select(
          `user_id,
          profiles:user_id ( email )`
        )
        .eq("business_id", businessId)
      if (cancelled || error || !data) return
      const m = new Map<string, string>()
      for (const bu of data as {
        user_id: string
        profiles: { email: string | null } | { email: string | null }[] | null
      }[]) {
        const profile = Array.isArray(bu.profiles) ? bu.profiles[0] : bu.profiles
        const em = profile?.email?.trim().toLowerCase()
        if (em) m.set(em, bu.user_id)
      }
      setEmailToUserId(m)
    })()
    return () => {
      cancelled = true
    }
  }, [open, businessId, supabase])

  useEffect(() => {
    if (open && !wasOpenRef.current) {
      setPipelineId(defaultPipelineId)
      setStageId(defaultStageId)
      if (defaultProductId) setProductId(defaultProductId)
      else setProductId("none")
    }
    wasOpenRef.current = open
  }, [open, defaultPipelineId, defaultStageId, defaultProductId])

  const resetState = () => {
    setParsedRows([])
    setParseIssues([])
    setFileName("")
    setProductId("none")
    if (fileRef.current) fileRef.current.value = ""
  }

  const handleOpenChange = (next: boolean) => {
    if (!next) resetState()
    onOpenChange(next)
  }

  const handlePipelineChange = (pid: string) => {
    setPipelineId(pid)
    const stages = allStages
      .filter((s) => s.pipeline_id === pid)
      .sort((a, b) => a.position - b.position)
    const first =
      stages.find((s) => !s.is_won && !s.is_lost)?.id || stages[0]?.id || ""
    setStageId(first)
    const p = pipelines.find((x) => x.id === pid)
    if (p?.product_id) {
      setProductId(p.product_id)
    } else {
      setProductId("none")
    }
  }

  const handleFile = async (file: File | null) => {
    if (!file) return
    setFileName(file.name)
    const text = await file.text()
    const { rows, issues } = parseLeadsCsv(text)
    setParsedRows(rows)
    setParseIssues(issues)
    if (issues.length > 0 && rows.length === 0) {
      toast.error("לא ניתן לקרוא את הקובץ")
    } else if (issues.length > 0) {
      toast.message(`${rows.length} שורות תקינות, ${issues.length} שגיאות`)
    } else if (rows.length > 0) {
      toast.success(`${rows.length} שורות מוכנות לייבוא`)
    } else {
      toast.error("לא נמצאו שורות נתונים בקובץ")
    }
  }

  const slotsLeft =
    maxDeals === null ? Infinity : Math.max(0, maxDeals - currentDealCount)
  const canImportCount = Math.min(parsedRows.length, slotsLeft)
  const blockedByLimit =
    maxDeals !== null && parsedRows.length > 0 && slotsLeft === 0

  async function runImport() {
    if (!businessId || !currentUserId || !pipelineId || !stageId) {
      toast.error("חסרים נתונים לייבוא")
      return
    }
    if (parsedRows.length === 0) return
    if (blockedByLimit) {
      toast.error("הגעת למגבלת הלידים במסלול שלך")
      return
    }

    const toImport = parsedRows.slice(0, canImportCount)
    if (toImport.length < parsedRows.length) {
      toast.message(
        `מייבא ${toImport.length} מתוך ${parsedRows.length} (מגבלת מסלול: נותרו ${slotsLeft} מקומות)`
      )
    }

    setImporting(true)
    let ok = 0
    let fail = 0
    try {
      for (const row of toImport) {
        const ownerId = row.owner_email
          ? emailToUserId.get(row.owner_email) ?? null
          : currentUserId
        if (row.owner_email && !ownerId) {
          fail++
          continue
        }
        let rowStageId = stageId
        if (row.stage_name) {
          const st = allStages.find(
            (s) =>
              s.pipeline_id === pipelineId &&
              s.name.trim().toLowerCase() === row.stage_name!.trim().toLowerCase()
          )
          if (!st) {
            fail++
            continue
          }
          rowStageId = st.id
        }

        const contactRes = await createContact(supabase, {
          business_id: businessId,
          full_name: row.full_name,
          email: row.email,
          phone: row.phone,
          source: row.source,
          tags: row.tags,
          owner_user_id: ownerId,
          created_at: row.entry_date,
        })
        if (contactRes.error) {
          fail++
          continue
        }
        const dealRes = await createDeal(supabase, {
          business_id: businessId,
          pipeline_id: pipelineId,
          stage_id: rowStageId,
          title: row.title,
          contact_id: contactRes.data!.id,
          owner_user_id: ownerId,
          value: row.value,
          source: row.source,
          tags: row.tags,
          product_id: productId === "none" ? null : productId,
          created_at: row.entry_date,
        })
        if (dealRes.error) {
          fail++
          continue
        }
        ok++
        if (row.timeline_note?.trim() && dealRes.data?.id && ownerId) {
          const logRes = await logActivity(supabase, {
            business_id: businessId,
            type: "note",
            contact_id: contactRes.data.id,
            deal_id: dealRes.data.id,
            created_by_user_id: ownerId,
            content: row.timeline_note.trim(),
            created_at: row.entry_date,
          })
          if (logRes.error) {
            console.warn("CSV import: timeline note failed", logRes.error)
          }
        }
      }
      if (ok > 0) {
        toast.success(`${ok} לידים יובאו בהצלחה`)
        onSuccess()
        handleOpenChange(false)
      }
      if (fail > 0) {
        toast.error(`${fail} שורות נכשלו (בדוק הרשאות או נתונים)`)
      }
    } finally {
      setImporting(false)
    }
  }

  if (!pipelines.length) {
    return (
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="sm:max-w-md" dir="rtl">
          <DialogHeader>
            <DialogTitle>ייבוא לידים מ-CSV</DialogTitle>
            <DialogDescription>
              יש ליצור פייפליין לפני ייבוא לידים.
            </DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto" dir="rtl">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center">
              <FileSpreadsheet className="h-4 w-4 text-primary" />
            </div>
            <div>
              <DialogTitle className="text-lg font-black">ייבוא לידים מ-CSV</DialogTitle>
              <DialogDescription className="text-xs font-medium text-slate-500">
                עמודות אופציונליות: <span className="font-bold">stage</span> — שם השלב בפייפליין
                (ריק = השלב מהבחירה למטה), <span className="font-bold">owner_email</span> — מייל נציג
                בעסק (ריק = אתה), <span className="font-bold">entry_date</span> — תאריך כניסת הליד
                (ריק = עכשיו), <span className="font-bold">timeline_note</span> — הערה ראשונה שתופיע
                בטיימליין של הליד (ריק = בלי).
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="gap-2 font-bold text-xs"
              onClick={() => {
                downloadLeadsCsvTemplate()
                toast.success("הטמפלט הורד")
              }}
            >
              <Download className="h-3.5 w-3.5" />
              הורד טמפלט CSV
            </Button>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold">פייפליין</Label>
              <Select value={pipelineId} onValueChange={handlePipelineChange}>
                <SelectTrigger className="h-9 text-xs font-medium">
                  <SelectValue placeholder="בחר פייפליין" />
                </SelectTrigger>
                <SelectContent>
                  {pipelines.map((p) => (
                    <SelectItem key={p.id} value={p.id} className="text-xs">
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-bold">שלב ברירת מחדל</Label>
              <Select
                value={stageId}
                onValueChange={setStageId}
                disabled={!activeStages.length}
              >
                <SelectTrigger className="h-9 text-xs font-medium">
                  <SelectValue placeholder="בחר שלב" />
                </SelectTrigger>
                <SelectContent>
                  {activeStages.map((s) => (
                    <SelectItem key={s.id} value={s.id} className="text-xs">
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-[10px] text-slate-500 font-medium leading-snug">
                לשורות ללא עמודת stage בקובץ
              </p>
            </div>
          </div>

          {products.length > 0 && (
            <div className="space-y-1.5">
              <Label className="text-xs font-bold">מוצר (אופציונלי)</Label>
              <Select value={productId} onValueChange={setProductId}>
                <SelectTrigger className="h-9 text-xs font-medium">
                  <SelectValue placeholder="ללא מוצר" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none" className="text-xs">
                    ללא מוצר
                  </SelectItem>
                  {products.map((pr) => (
                    <SelectItem key={pr.id} value={pr.id} className="text-xs">
                      {pr.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-1.5">
            <Label className="text-xs font-bold">קובץ CSV</Label>
            <input
              ref={fileRef}
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              onChange={(e) => handleFile(e.target.files?.[0] ?? null)}
            />
            <Button
              type="button"
              variant="outline"
              className={cn(
                "w-full h-10 gap-2 font-bold text-xs border-dashed",
                fileName && "border-primary/40 bg-primary/5"
              )}
              onClick={() => fileRef.current?.click()}
            >
              <Upload className="h-3.5 w-3.5" />
              {fileName ? fileName : "בחר קובץ…"}
            </Button>
          </div>

          {maxDeals !== null && (
            <p className="text-[11px] text-slate-500 font-medium">
              מגבלת מסלול: {currentDealCount} / {maxDeals} לידים
              {parsedRows.length > 0 && slotsLeft < parsedRows.length && (
                <span className="text-amber-600 font-bold mr-1">
                  — יובאו עד {canImportCount} שורות
                </span>
              )}
            </p>
          )}

          {parsedRows.length > 0 && (
            <p className="text-xs font-bold text-primary">
              {parsedRows.length} שורות תקינות
            </p>
          )}

          {(parseIssues.length > 0 || resolutionIssues.length > 0) && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 max-h-40 overflow-y-auto">
              <p className="text-[10px] font-black text-amber-900 mb-1">שגיאות ואזהרות</p>
              <ul className="text-[10px] text-amber-800 space-y-0.5 font-medium">
                {resolutionIssues.slice(0, 15).map((issue, i) => (
                  <li key={`r-${i}`}>
                    שורה {issue.line}: {issue.message}
                  </li>
                ))}
                {parseIssues.slice(0, 20).map((issue, i) => (
                  <li key={`p-${i}`}>
                    שורה {issue.line}: {issue.message}
                  </li>
                ))}
                {parseIssues.length + resolutionIssues.length > 20 && (
                  <li>…הצגת חלק מההודעות</li>
                )}
              </ul>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0 flex-col sm:flex-row">
          <Button
            type="button"
            variant="ghost"
            className="font-bold text-xs"
            onClick={() => handleOpenChange(false)}
            disabled={importing}
          >
            ביטול
          </Button>
          <Button
            type="button"
            className="font-black text-xs gap-2"
            disabled={
              importing ||
              parsedRows.length === 0 ||
              canImportCount === 0 ||
              !stageId ||
              blockedByLimit ||
              !currentUserId ||
              resolutionIssues.length > 0
            }
            onClick={() => runImport()}
          >
            {importing ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                מייבא…
              </>
            ) : (
              `ייבא ${canImportCount} לידים`
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
