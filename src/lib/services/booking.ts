import type { SupabaseClient } from "@supabase/supabase-js"
import { addMinutes, format, parse, isBefore, isEqual, startOfDay, endOfDay } from "date-fns"

export interface WorkingHours {
  [day: string]: { start: string; end: string } | null
}

export interface BookingSettings {
  id: string
  business_id: string
  user_id: string
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

export async function getBookingSettingsBySlug(
  supabase: SupabaseClient,
  slug: string
): Promise<BookingSettings | null> {
  const { data } = await supabase
    .from("booking_settings")
    .select("*")
    .eq("slug", slug)
    .eq("is_enabled", true)
    .maybeSingle()

  return data as BookingSettings | null
}

export async function getAvailableSlots(
  supabase: SupabaseClient,
  settings: BookingSettings,
  dateStr: string
): Promise<string[]> {
  const date = parse(dateStr, "yyyy-MM-dd", new Date())
  const dayOfWeek = date.getDay().toString()
  const hours = settings.working_hours[dayOfWeek]

  if (!hours) return []

  const { data: existingAppointments } = await supabase
    .from("appointments")
    .select("start_time, end_time")
    .eq("assigned_to_user_id", settings.user_id)
    .eq("business_id", settings.business_id)
    .neq("status", "cancelled")
    .gte("start_time", startOfDay(date).toISOString())
    .lte("start_time", endOfDay(date).toISOString())

  const appointments = (existingAppointments || []).map((a) => ({
    start: new Date(a.start_time),
    end: new Date(a.end_time),
  }))

  const slots: string[] = []
  const dayStart = parse(hours.start, "HH:mm", date)
  const dayEnd = parse(hours.end, "HH:mm", date)
  const duration = settings.appointment_duration
  const buffer = settings.buffer_time
  const now = new Date()

  let current = dayStart
  while (true) {
    const slotEnd = addMinutes(current, duration)
    if (isBefore(dayEnd, slotEnd) || isEqual(dayEnd, current)) break

    if (isBefore(current, now)) {
      current = addMinutes(current, duration + buffer)
      continue
    }

    const hasConflict = appointments.some((appt) => {
      const bufferedStart = addMinutes(appt.start, -buffer)
      const bufferedEnd = addMinutes(appt.end, buffer)
      return isBefore(current, bufferedEnd) && isBefore(bufferedStart, slotEnd)
    })

    if (!hasConflict) {
      slots.push(format(current, "HH:mm"))
    }

    current = addMinutes(current, duration + buffer)
  }

  return slots
}

export async function createBooking(
  supabase: SupabaseClient,
  params: {
    settings: BookingSettings
    date: string
    time: string
    name: string
    email: string
    phone?: string
    notes?: string
  }
): Promise<{ ok: boolean; appointmentId?: string; error?: string }> {
  const { settings, date, time, name, email, phone, notes } = params

  const startTime = parse(`${date} ${time}`, "yyyy-MM-dd HH:mm", new Date())
  const endTime = addMinutes(startTime, settings.appointment_duration)

  const slots = await getAvailableSlots(supabase, settings, date)
  if (!slots.includes(time)) {
    return { ok: false, error: "השעה שנבחרה אינה פנויה יותר" }
  }

  let contactId: string

  const { data: existingContact } = await supabase
    .from("contacts")
    .select("id")
    .eq("business_id", settings.business_id)
    .ilike("email", email.trim())
    .maybeSingle()

  if (existingContact) {
    contactId = existingContact.id
  } else {
    const { data: newContact, error: contactErr } = await supabase
      .from("contacts")
      .insert({
        business_id: settings.business_id,
        full_name: name,
        email: email.trim(),
        phone: phone?.trim() || null,
        source: "booking_link",
        owner_user_id: settings.user_id,
      })
      .select("id")
      .single()

    if (contactErr || !newContact) {
      return { ok: false, error: "שגיאה ביצירת איש קשר" }
    }
    contactId = (newContact as { id: string }).id
  }

  const { data: appointment, error: apptErr } = await supabase
    .from("appointments")
    .insert({
      business_id: settings.business_id,
      contact_id: contactId,
      assigned_to_user_id: settings.user_id,
      created_by_user_id: null,
      title: `פגישה עם ${name}`,
      description: notes || null,
      start_time: startTime.toISOString(),
      end_time: endTime.toISOString(),
      status: "scheduled",
    })
    .select("id")
    .single()

  if (apptErr || !appointment) {
    return { ok: false, error: "שגיאה ביצירת הפגישה" }
  }

  if (settings.pipeline_id && settings.stage_id) {
    await handleDealForBooking(supabase, {
      businessId: settings.business_id,
      contactId,
      pipelineId: settings.pipeline_id,
      stageId: settings.stage_id,
      ownerUserId: settings.user_id,
      contactName: name,
    })
  }

  return { ok: true, appointmentId: (appointment as { id: string }).id }
}

async function handleDealForBooking(
  supabase: SupabaseClient,
  params: {
    businessId: string
    contactId: string
    pipelineId: string
    stageId: string
    ownerUserId: string
    contactName: string
  }
) {
  try {
    const { data: existingDeal } = await supabase
      .from("deals")
      .select("id")
      .eq("business_id", params.businessId)
      .eq("pipeline_id", params.pipelineId)
      .eq("contact_id", params.contactId)
      .maybeSingle()

    if (existingDeal) {
      await supabase
        .from("deals")
        .update({ stage_id: params.stageId, updated_at: new Date().toISOString() })
        .eq("id", existingDeal.id)
    } else {
      await supabase
        .from("deals")
        .insert({
          business_id: params.businessId,
          pipeline_id: params.pipelineId,
          stage_id: params.stageId,
          contact_id: params.contactId,
          owner_user_id: params.ownerUserId,
          title: `${params.contactName} - פגישה`,
          value: 0,
          currency: "ILS",
        })
    }
  } catch (err) {
    console.error("Error handling deal for booking:", err)
  }
}
