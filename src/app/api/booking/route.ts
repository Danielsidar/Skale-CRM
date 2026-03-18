import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import {
  getBookingSettingsBySlug,
  getAvailableSlots,
  createBooking,
} from "@/lib/services/booking"

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl
  const slug = searchParams.get("slug")
  const date = searchParams.get("date")

  if (!slug || !date) {
    return NextResponse.json({ error: "slug and date are required" }, { status: 400 })
  }

  const supabase = createAdminClient()

  const settings = await getBookingSettingsBySlug(supabase, slug)
  if (!settings) {
    return NextResponse.json({ error: "Booking page not found" }, { status: 404 })
  }

  const slots = await getAvailableSlots(supabase, settings, date)

  return NextResponse.json({
    slots,
    duration: settings.appointment_duration,
    display_name: settings.display_name,
    description: settings.description,
    working_hours: settings.working_hours,
  })
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { slug, date, time, name, email, phone, notes } = body

    if (!slug || !date || !time || !name || !email) {
      return NextResponse.json(
        { error: "slug, date, time, name, and email are required" },
        { status: 400 }
      )
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json({ error: "Invalid email" }, { status: 400 })
    }

    const supabase = createAdminClient()

    const settings = await getBookingSettingsBySlug(supabase, slug)
    if (!settings) {
      return NextResponse.json({ error: "Booking page not found" }, { status: 404 })
    }

    const result = await createBooking(supabase, {
      settings,
      date,
      time,
      name,
      email,
      phone,
      notes,
    })

    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 409 })
    }

    return NextResponse.json({ ok: true, appointmentId: result.appointmentId })
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
