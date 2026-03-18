"use client"

import { useState, useEffect, useCallback } from "react"
import { format, addDays, startOfDay, isBefore, getDay } from "date-fns"
import { he } from "date-fns/locale"
import { Calendar, Clock, CheckCircle2, ChevronRight, ChevronLeft, Loader2, User, Mail, Phone, FileText } from "lucide-react"

interface WorkingHours {
  [day: string]: { start: string; end: string } | null
}

interface BookingInfo {
  display_name: string | null
  description: string | null
  duration: number
  working_hours: WorkingHours
  slots: string[]
}

const DAY_NAMES_HE = ["ראשון", "שני", "שלישי", "רביעי", "חמישי", "שישי", "שבת"]

export default function BookingPage({ params }: { params: { slug: string } }) {
  const { slug } = params
  const [step, setStep] = useState<"date" | "time" | "form" | "done">("date")
  const [bookingInfo, setBookingInfo] = useState<BookingInfo | null>(null)
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [selectedTime, setSelectedTime] = useState<string | null>(null)
  const [slots, setSlots] = useState<string[]>([])
  const [loadingSlots, setLoadingSlots] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notFound, setNotFound] = useState(false)

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    notes: "",
  })

  useEffect(() => {
    async function loadInfo() {
      const today = format(new Date(), "yyyy-MM-dd")
      const res = await fetch(`/api/booking?slug=${slug}&date=${today}`)
      if (!res.ok) {
        setNotFound(true)
        return
      }
      const data = await res.json()
      setBookingInfo(data)
    }
    loadInfo()
  }, [slug])

  const loadSlots = useCallback(async (date: Date) => {
    setLoadingSlots(true)
    const dateStr = format(date, "yyyy-MM-dd")
    const res = await fetch(`/api/booking?slug=${slug}&date=${dateStr}`)
    if (res.ok) {
      const data = await res.json()
      setSlots(data.slots)
    }
    setLoadingSlots(false)
  }, [slug])

  const handleDateSelect = (date: Date) => {
    setSelectedDate(date)
    setSelectedTime(null)
    loadSlots(date)
    setStep("time")
  }

  const handleTimeSelect = (time: string) => {
    setSelectedTime(time)
    setStep("form")
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedDate || !selectedTime) return

    setSubmitting(true)
    setError(null)

    try {
      const res = await fetch("/api/booking", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slug,
          date: format(selectedDate, "yyyy-MM-dd"),
          time: selectedTime,
          ...formData,
        }),
      })

      const data = await res.json()
      if (!res.ok) {
        setError(data.error || "שגיאה בקביעת הפגישה")
        return
      }

      setStep("done")
    } catch {
      setError("שגיאה בשליחת הבקשה")
    } finally {
      setSubmitting(false)
    }
  }

  if (notFound) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-blue-50 p-4" dir="rtl">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mx-auto">
            <Calendar className="h-8 w-8 text-slate-400" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900">דף לא נמצא</h1>
          <p className="text-slate-500">הלינק לקביעת פגישה אינו תקין או שהוא כבוי</p>
        </div>
      </div>
    )
  }

  if (!bookingInfo) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-blue-50" dir="rtl">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center p-4" dir="rtl">
      <div className="w-full max-w-lg">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-blue-600 flex items-center justify-center mx-auto mb-4 shadow-lg shadow-blue-600/20">
            <Calendar className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900">
            {bookingInfo.display_name || "קביעת פגישה"}
          </h1>
          {bookingInfo.description && (
            <p className="text-slate-500 mt-2 text-sm">{bookingInfo.description}</p>
          )}
          <div className="flex items-center justify-center gap-2 mt-3 text-sm text-slate-500">
            <Clock className="h-4 w-4" />
            <span>{bookingInfo.duration} דקות</span>
          </div>
        </div>

        {/* Steps indicator */}
        {step !== "done" && (
          <div className="flex items-center justify-center gap-2 mb-6">
            {(["date", "time", "form"] as const).map((s, i) => (
              <div key={s} className="flex items-center gap-2">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors ${
                  step === s ? "bg-blue-600 text-white" :
                  (["date", "time", "form"].indexOf(step) > i) ? "bg-blue-100 text-blue-600" :
                  "bg-slate-100 text-slate-400"
                }`}>
                  {i + 1}
                </div>
                {i < 2 && <div className={`w-8 h-px ${
                  (["date", "time", "form"].indexOf(step) > i) ? "bg-blue-300" : "bg-slate-200"
                }`} />}
              </div>
            ))}
          </div>
        )}

        <div className="bg-white rounded-2xl shadow-xl shadow-slate-200/50 border border-slate-100 overflow-hidden">
          {/* Date selection */}
          {step === "date" && (
            <DatePicker
              workingHours={bookingInfo.working_hours}
              onSelect={handleDateSelect}
            />
          )}

          {/* Time selection */}
          {step === "time" && selectedDate && (
            <div className="p-6">
              <button onClick={() => setStep("date")} className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700 mb-4 font-medium">
                <ChevronRight className="h-4 w-4" />
                חזרה לבחירת תאריך
              </button>
              <h2 className="text-lg font-semibold text-slate-900 mb-1">
                בחרו שעה
              </h2>
              <p className="text-sm text-slate-500 mb-5">
                {format(selectedDate, "EEEE, d בMMMM yyyy", { locale: he })}
              </p>

              {loadingSlots ? (
                <div className="flex justify-center py-12">
                  <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
                </div>
              ) : slots.length === 0 ? (
                <div className="text-center py-12">
                  <Clock className="h-10 w-10 text-slate-300 mx-auto mb-3" />
                  <p className="text-slate-500 font-medium">אין שעות פנויות ביום זה</p>
                  <button onClick={() => setStep("date")} className="text-blue-600 text-sm mt-2 hover:underline">
                    בחרו תאריך אחר
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-2 max-h-72 overflow-y-auto custom-scrollbar">
                  {slots.map((time) => (
                    <button
                      key={time}
                      onClick={() => handleTimeSelect(time)}
                      className="px-4 py-3 rounded-xl border border-slate-200 text-sm font-medium text-slate-700 hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700 transition-all"
                    >
                      {time}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Contact form */}
          {step === "form" && selectedDate && selectedTime && (
            <div className="p-6">
              <button onClick={() => setStep("time")} className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700 mb-4 font-medium">
                <ChevronRight className="h-4 w-4" />
                חזרה לבחירת שעה
              </button>

              <div className="bg-blue-50 rounded-xl p-3 mb-6 flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center shrink-0">
                  <Calendar className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-blue-900">
                    {format(selectedDate, "EEEE, d בMMMM", { locale: he })}
                  </p>
                  <p className="text-sm text-blue-700">
                    {selectedTime} · {bookingInfo.duration} דקות
                  </p>
                </div>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">
                    שם מלא *
                  </label>
                  <div className="relative">
                    <User className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <input
                      type="text"
                      required
                      value={formData.name}
                      onChange={(e) => setFormData((p) => ({ ...p, name: e.target.value }))}
                      className="w-full pr-10 pl-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                      placeholder="הכניסו את שמכם"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">
                    אימייל *
                  </label>
                  <div className="relative">
                    <Mail className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <input
                      type="email"
                      required
                      dir="ltr"
                      value={formData.email}
                      onChange={(e) => setFormData((p) => ({ ...p, email: e.target.value }))}
                      className="w-full pr-10 pl-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-left"
                      placeholder="email@example.com"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">
                    טלפון
                  </label>
                  <div className="relative">
                    <Phone className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <input
                      type="tel"
                      dir="ltr"
                      value={formData.phone}
                      onChange={(e) => setFormData((p) => ({ ...p, phone: e.target.value }))}
                      className="w-full pr-10 pl-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-left"
                      placeholder="050-1234567"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">
                    הערות
                  </label>
                  <div className="relative">
                    <FileText className="absolute right-3 top-3 h-4 w-4 text-slate-400" />
                    <textarea
                      value={formData.notes}
                      onChange={(e) => setFormData((p) => ({ ...p, notes: e.target.value }))}
                      className="w-full pr-10 pl-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 resize-none"
                      rows={3}
                      placeholder="הוסיפו הערות (אופציונלי)"
                    />
                  </div>
                </div>

                {error && (
                  <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-700">
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full py-3 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {submitting ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <>
                      <Calendar className="h-5 w-5" />
                      אישור קביעת פגישה
                    </>
                  )}
                </button>
              </form>
            </div>
          )}

          {/* Confirmation */}
          {step === "done" && selectedDate && selectedTime && (
            <div className="p-8 text-center">
              <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-5">
                <CheckCircle2 className="h-8 w-8 text-green-600" />
              </div>
              <h2 className="text-xl font-bold text-slate-900 mb-2">
                הפגישה נקבעה בהצלחה!
              </h2>
              <p className="text-slate-500 mb-6">
                נשלח אליכם אישור עם פרטי הפגישה
              </p>
              <div className="bg-slate-50 rounded-xl p-4 text-right space-y-2">
                <div className="flex items-center gap-3">
                  <Calendar className="h-5 w-5 text-slate-400 shrink-0" />
                  <span className="text-sm text-slate-700">
                    {format(selectedDate, "EEEE, d בMMMM yyyy", { locale: he })}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <Clock className="h-5 w-5 text-slate-400 shrink-0" />
                  <span className="text-sm text-slate-700">
                    {selectedTime} · {bookingInfo.duration} דקות
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        <p className="text-center text-xs text-slate-400 mt-6">
          Powered by <span className="font-semibold">Skale CRM</span>
        </p>
      </div>
    </div>
  )
}

function DatePicker({
  workingHours,
  onSelect,
}: {
  workingHours: WorkingHours
  onSelect: (date: Date) => void
}) {
  const [weekOffset, setWeekOffset] = useState(0)
  const today = startOfDay(new Date())
  const startDate = addDays(today, weekOffset * 7)

  const days = Array.from({ length: 14 }, (_, i) => {
    const date = addDays(startDate, i)
    const dayOfWeek = getDay(date).toString()
    const isWorkDay = workingHours[dayOfWeek] !== null && workingHours[dayOfWeek] !== undefined
    const isPast = isBefore(date, today)
    return { date, dayOfWeek, isWorkDay, isPast }
  })

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-lg font-semibold text-slate-900">בחרו תאריך</h2>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setWeekOffset((w) => Math.max(0, w - 1))}
            disabled={weekOffset === 0}
            className="p-1.5 rounded-lg hover:bg-slate-100 disabled:opacity-30 transition-colors"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
          <button
            onClick={() => setWeekOffset((w) => w + 1)}
            disabled={weekOffset >= 4}
            className="p-1.5 rounded-lg hover:bg-slate-100 disabled:opacity-30 transition-colors"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-1.5">
        {DAY_NAMES_HE.map((name) => (
          <div key={name} className="text-center text-xs font-medium text-slate-400 py-1">
            {name}
          </div>
        ))}

        {/* Offset for first row alignment */}
        {Array.from({ length: getDay(startDate) }, (_, i) => (
          <div key={`empty-${i}`} />
        ))}

        {days.map(({ date, isWorkDay, isPast }) => {
          const disabled = !isWorkDay || isPast
          return (
            <button
              key={date.toISOString()}
              onClick={() => !disabled && onSelect(date)}
              disabled={disabled}
              className={`
                aspect-square rounded-xl flex flex-col items-center justify-center text-sm transition-all
                ${disabled
                  ? "text-slate-300 cursor-not-allowed"
                  : "text-slate-700 hover:bg-blue-50 hover:text-blue-700 hover:border-blue-200 border border-transparent cursor-pointer"
                }
                ${format(date, "yyyy-MM-dd") === format(new Date(), "yyyy-MM-dd") && !disabled
                  ? "ring-2 ring-blue-200 font-semibold"
                  : ""
                }
              `}
            >
              <span className="text-base font-medium">{format(date, "d")}</span>
              <span className="text-[10px] text-slate-400 mt-0.5 leading-none">
                {format(date, "MMM", { locale: he })}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
