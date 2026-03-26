#!/usr/bin/env node
/**
 * קורא ל־automation-engine עם מפתח ה-service role (כמו בשרת).
 * שימוש: לבדיקה ידנית / CI בסטייג'ינג בלבד — לא לשתף את המפתח.
 *
 * שימוש:
 *   node scripts/smoke-automation-engine.mjs <business_id> <entity_id> [trigger_subtype] [entity_type]
 *
 * דוגמה:
 *   node scripts/smoke-automation-engine.mjs <uuid> <deal-uuid> lead.stage_entered deal
 *
 * טוען משתנים מ־.env.local אם קיים (NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY).
 */
import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.join(__dirname, "..")
const envPath = path.join(root, ".env.local")

function loadEnvLocal() {
  if (!fs.existsSync(envPath)) return
  const text = fs.readFileSync(envPath, "utf8")
  for (const line of text.split(/\r?\n/)) {
    const t = line.trim()
    if (!t || t.startsWith("#")) continue
    const i = t.indexOf("=")
    if (i === -1) continue
    const key = t.slice(0, i).trim()
    let val = t.slice(i + 1).trim()
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1)
    }
    if (!(key in process.env)) process.env[key] = val
  }
}

loadEnvLocal()

const baseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const [, , businessId, entityId, triggerSubtype = "lead.stage_entered", entityType = "deal"] =
  process.argv

async function main() {
  if (!baseUrl || !serviceKey) {
    console.error(
      "חסרים NEXT_PUBLIC_SUPABASE_URL או SUPABASE_SERVICE_ROLE_KEY (למשל ב־.env.local)"
    )
    process.exit(1)
  }
  if (!businessId || !entityId) {
    console.error(
      "שימוש: node scripts/smoke-automation-engine.mjs <business_id> <entity_id> [trigger_subtype] [entity_type]"
    )
    process.exit(1)
  }

  const url = `${baseUrl.replace(/\/$/, "")}/functions/v1/automation-engine`
  const body = {
    business_id: businessId,
    trigger_subtype: triggerSubtype,
    entity_type: entityType,
    entity_id: entityId,
    payload: {},
  }

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${serviceKey}`,
    },
    body: JSON.stringify(body),
  })

  const text = await res.text()
  console.log(res.status, text)
  if (!res.ok) process.exit(1)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
