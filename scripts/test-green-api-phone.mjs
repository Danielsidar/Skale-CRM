#!/usr/bin/env node
/**
 * בדיקות לוגיות לנרמול מספר ל־Green API — שמור סנכרון עם
 * normalizeDigitsForGreenApiChatId ב־supabase/functions/automation-engine/index.ts
 */
function normalizeDigitsForGreenApiChatId(phone) {
  let d = phone.replace(/\D/g, "")
  if (d.startsWith("00")) d = d.slice(2)
  if (!d) return ""

  if (d.startsWith("972")) return d
  if (d.startsWith("1") && d.length === 11) return d

  if (d.startsWith("0") && d.length === 10) {
    return `972${d.slice(1)}`
  }
  if (d.length === 9 && d.startsWith("5")) {
    return `972${d}`
  }
  if (d.length === 10 && d[0] !== "0") {
    return `1${d}`
  }

  return d
}

function assert(cond, msg) {
  if (!cond) {
    console.error("FAIL:", msg)
    process.exit(1)
  }
}

const tests = [
  ["050-123-4567", "972501234567"],
  ["+972 50-123-4567", "972501234567"],
  ["00972501234567", "972501234567"],
  ["501234567", "972501234567"],
  ["2125551234", "12125551234"],
  ["+1 (212) 555-1234", "12125551234"],
]

for (const [input, expected] of tests) {
  const out = normalizeDigitsForGreenApiChatId(input)
  assert(out === expected, `${JSON.stringify(input)} -> ${out}, expected ${expected}`)
}

console.log("ok:", tests.length, "green-api phone cases")
