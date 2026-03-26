import Papa from "papaparse"
import * as z from "zod"

/** UTF-8 BOM so Excel opens Hebrew correctly */
const BOM = "\uFEFF"

export const LEADS_CSV_HEADERS = [
  "title",
  "full_name",
  "email",
  "phone",
  "value",
  "source",
  "tags",
  "stage",
  "owner_email",
  "entry_date",
  "timeline_note",
] as const

export const LEADS_CSV_TEMPLATE =
  BOM +
  [
    LEADS_CSV_HEADERS.join(","),
    `"חברת דוגמה","יוסי כהן",yossi@example.com,050-1234567,5000,ייבוא CSV,"לקוח פוטנציאלי, B2B","פגישה ראשונה",sales@example.com,${new Date().toISOString().split('T')[0]},"פנו מהאתר — מעוניינים בדמו"`,
  ].join("\n") +
  "\n"

export function downloadLeadsCsvTemplate(): void {
  const blob = new Blob([LEADS_CSV_TEMPLATE], { type: "text/csv;charset=utf-8;" })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = "leads-import-template.csv"
  a.click()
  URL.revokeObjectURL(url)
}

function normalizeHeaderKey(h: string): string {
  return h
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_")
    .replace(/["']/g, "")
}

const HEADER_TO_FIELD: Record<string, keyof CsvLeadRowInput> = {
  title: "title",
  deal_title: "title",
  שם_הליד: "title",
  full_name: "full_name",
  contact_name: "full_name",
  שם_מלא: "full_name",
  איש_קשר: "full_name",
  email: "email",
  אימייל: "email",
  phone: "phone",
  טלפון: "phone",
  mobile: "phone",
  value: "value",
  amount: "value",
  ערך: "value",
  source: "source",
  מקור: "source",
  tags: "tags",
  תגיות: "tags",
  stage: "stage",
  שלב: "stage",
  phase: "stage",
  owner_email: "owner_email",
  נציג: "owner_email",
  agent_email: "owner_email",
  owner: "owner_email",
  entry_date: "entry_date",
  created_at: "entry_date",
  תאריך_כניסה: "entry_date",
  תאריך_ליד: "entry_date",
  תאריך: "entry_date",
  date: "entry_date",
  timeline_note: "timeline_note",
  הערת_טיימליין: "timeline_note",
  הודעה_ראשונה: "timeline_note",
  first_note: "timeline_note",
  initial_note: "timeline_note",
}

export type CsvLeadRowInput = {
  title: string
  full_name: string
  email: string
  phone: string
  value: string
  source: string
  tags: string
  stage: string
  owner_email: string
  entry_date: string
  timeline_note: string
}

export type CsvLeadRowValidated = {
  /** שורה בקובץ (כולל כותרת) לדיווח שגיאות */
  line: number
  title: string
  full_name: string
  email: string | null
  phone: string | null
  value: number
  source: string | null
  tags: string[]
  /** שם השלב בפייפליין; ריק = להשתמש בשלב ברירת המחדל מהממשק */
  stage_name: string | null
  /** מייל נציג בעסק; ריק = המשתמש המייבא */
  owner_email: string | null
  /** תאריך כניסה (ISO string); ריק = עכשיו */
  entry_date: string | null
  /** הערת פתיחה בטיימליין (פעילות מסוג הערה); ריק = בלי */
  timeline_note: string | null
}

const rowContentSchema = z.object({
  title: z.string().min(2, "שם הליד חייב לפחות 2 תווים"),
  full_name: z.string().min(2, "שם איש הקשר חייב לפחות 2 תווים"),
  email: z
    .string()
    .refine((s) => !s.trim() || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s.trim()), "אימייל לא תקין"),
  phone: z.string(),
  source: z.string(),
  tags: z.string(),
  stage: z.string(),
  owner_email: z
    .string()
    .refine(
      (s) => !s.trim() || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s.trim()),
      "מייל הנציג לא תקין"
    ),
  entry_date: z.string().optional(),
  timeline_note: z
    .string()
    .max(8000, "הערת טיימליין ארוכה מדי (מקסימום 8000 תווים)"),
})

function parseValueField(raw: string): { value: number; error?: string } {
  const t = raw.replace(/,/g, "").trim()
  if (!t) return { value: 0 }
  const n = Number(t)
  if (!Number.isFinite(n) || n < 0) {
    return { value: 0, error: "ערך מספרי לא תקין" }
  }
  return { value: n }
}

function mapRecordToInput(record: Record<string, unknown>): CsvLeadRowInput {
  const out: CsvLeadRowInput = {
    title: "",
    full_name: "",
    email: "",
    phone: "",
    value: "",
    source: "",
    tags: "",
    stage: "",
    owner_email: "",
    entry_date: "",
    timeline_note: "",
  }
  for (const [key, val] of Object.entries(record)) {
    const field = HEADER_TO_FIELD[normalizeHeaderKey(key)]
    if (!field) continue
    out[field] = String(val ?? "").trim()
  }
  return out
}

function isRowEmpty(input: CsvLeadRowInput): boolean {
  return !input.title && !input.full_name && !input.email && !input.phone
}

export type CsvParseIssue = { line: number; message: string }

export function parseLeadsCsv(content: string): {
  rows: CsvLeadRowValidated[]
  issues: CsvParseIssue[]
} {
  const issues: CsvParseIssue[] = []
  const rows: CsvLeadRowValidated[] = []

  const parsed = Papa.parse<Record<string, unknown>>(content, {
    header: true,
    skipEmptyLines: "greedy",
    transformHeader: (h) => h.trim(),
  })

  if (parsed.errors.length > 0) {
    const first = parsed.errors[0]
    issues.push({
      line: first.row != null ? first.row + 1 : 1,
      message: first.message || "שגיאת פורמט CSV",
    })
    if (parsed.data.length === 0) {
      return { rows: [], issues }
    }
  }

  const fieldNames = (parsed.meta.fields ?? []).map(normalizeHeaderKey)
  const hasTitle = fieldNames.some((f) => HEADER_TO_FIELD[f] === "title")
  const hasContact = fieldNames.some(
    (f) => HEADER_TO_FIELD[f] === "full_name"
  )
  if (!hasTitle || !hasContact) {
    issues.push({
      line: 1,
      message:
        "חסרות עמודות חובה בכותרת: title (שם הליד) ו-full_name (שם איש הקשר). הורידו את הטמפלט לדוגמה.",
    })
    return { rows: [], issues }
  }

  parsed.data.forEach((record, index) => {
    const line = index + 2
    const input = mapRecordToInput(record)
    if (isRowEmpty(input)) return

    const contentResult = rowContentSchema.safeParse({
      title: input.title,
      full_name: input.full_name,
      email: input.email,
      phone: input.phone,
      source: input.source,
      tags: input.tags,
      stage: input.stage,
      owner_email: input.owner_email,
      entry_date: input.entry_date,
      timeline_note: input.timeline_note,
    })
    if (!contentResult.success) {
      const msg = contentResult.error.issues[0]?.message ?? "שורה לא תקינה"
      issues.push({ line, message: msg })
      return
    }
    const c = contentResult.data
    const { value, error: valueError } = parseValueField(input.value)
    if (valueError) {
      issues.push({ line, message: valueError })
      return
    }

    const emailTrim = c.email.trim()
    const phoneTrim = c.phone.trim()
    const stageTrim = c.stage.trim()
    const ownerTrim = c.owner_email.trim().toLowerCase()
    const entryDateRaw = input.entry_date.trim()
    let entryDate: string | null = null
    if (entryDateRaw) {
      const d = new Date(entryDateRaw)
      if (!isNaN(d.getTime())) {
        entryDate = d.toISOString()
      } else {
        issues.push({ line, message: `תאריך "${entryDateRaw}" לא תקין` })
        return
      }
    }
    const noteTrim = c.timeline_note.trim()
    rows.push({
      line,
      title: c.title.trim(),
      full_name: c.full_name.trim(),
      email: emailTrim ? emailTrim : null,
      phone: phoneTrim ? phoneTrim : null,
      value,
      source: c.source.trim() ? c.source.trim() : null,
      tags: c.tags
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean),
      stage_name: stageTrim ? stageTrim : null,
      owner_email: ownerTrim ? ownerTrim : null,
      entry_date: entryDate,
      timeline_note: noteTrim ? noteTrim : null,
    })
  })

  return { rows, issues }
}
