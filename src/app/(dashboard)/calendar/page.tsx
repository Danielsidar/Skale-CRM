"use client"

import { useState, useEffect, useMemo } from "react"
import { 
  format, 
  addMonths, 
  subMonths, 
  startOfMonth, 
  endOfMonth, 
  startOfWeek, 
  endOfWeek, 
  isSameMonth, 
  isSameDay, 
  addDays, 
  eachDayOfInterval,
  isToday,
  parseISO,
  addWeeks,
  subWeeks,
  subDays,
  startOfDay,
  endOfDay,
  eachHourOfInterval,
  isWithinInterval,
  setHours,
  setMinutes
} from "date-fns"
import { he } from "date-fns/locale"
import { 
  ChevronLeft, 
  ChevronRight, 
  Plus, 
  Clock, 
  MapPin, 
  Video,
  Filter,
  Users,
  User as UserIcon,
  Calendar as CalendarIcon,
  LayoutGrid,
  Columns,
  Square,
  Link as LinkIcon,
} from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { useBusiness } from "@/lib/hooks/useBusiness"
import { useTierFeatures } from "@/lib/hooks/useTierFeatures"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { EditAppointmentDialog } from "@/components/contacts/EditAppointmentDialog"
import { BookingSettingsDialog } from "@/components/calendar/BookingSettingsDialog"

type ViewType = "month" | "week" | "day"

export default function CalendarPage() {
  const { businessId } = useBusiness()
  const { features, loading: featuresLoading } = useTierFeatures()
  const router = useRouter()
  const [currentDate, setCurrentDate] = useState(new Date())
  const [appointments, setAppointments] = useState<any[]>([])
  const [filter, setFilter] = useState<"my" | "all">("my")
  const [view, setView] = useState<ViewType>("month")
  const [loading, setLoading] = useState(true)
  const [selectedAppt, setSelectedAppt] = useState<any>(null)
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [isBookingSettingsOpen, setIsBookingSettingsOpen] = useState(false)
  const supabase = createClient()

  const loadAppointments = async () => {
    if (!businessId) return
    setLoading(true)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      let query = supabase
        .from("appointments")
        .select(`
          *,
          contacts (full_name)
        `)
        .eq("business_id", businessId)

      if (filter === "my") {
        query = query.or(`assigned_to_user_id.eq.${user.id},created_by_user_id.eq.${user.id}`)
      }

      const { data, error } = await query
      if (error) throw error
      setAppointments(data || [])
    } catch (error) {
      console.error("Error loading appointments:", error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadAppointments()
  }, [businessId, filter])

  useEffect(() => {
    if (!featuresLoading && !features.booking) {
      router.replace("/dashboard")
    }
  }, [features.booking, featuresLoading, router])

  if (!featuresLoading && !features.booking) return null

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto w-full p-4 lg:p-0 pb-12 space-y-6" dir="rtl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div className="h-9 w-48 bg-muted rounded animate-pulse" />
          <div className="flex gap-2">
            <div className="h-10 w-24 bg-muted rounded-xl animate-pulse" />
            <div className="h-10 w-8 bg-muted rounded-xl animate-pulse" />
            <div className="h-10 w-8 bg-muted rounded-xl animate-pulse" />
          </div>
        </div>
        <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm">
          <div className="grid grid-cols-7 border-b border-slate-200">
            {Array.from({ length: 7 }).map((_, i) => (
              <div key={i} className="p-4 text-center">
                <div className="h-4 w-8 bg-muted rounded animate-pulse mx-auto" />
              </div>
            ))}
          </div>
          {Array.from({ length: 5 }).map((_, week) => (
            <div key={week} className="grid grid-cols-7 border-b border-slate-100 last:border-0">
              {Array.from({ length: 7 }).map((_, day) => (
                <div key={day} className="min-h-[100px] p-2 border-l border-slate-100 first:border-0 space-y-1">
                  <div className="h-5 w-5 rounded-full bg-muted animate-pulse" />
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    )
  }

  const next = () => {
    if (view === "month") setCurrentDate(addMonths(currentDate, 1))
    else if (view === "week") setCurrentDate(addWeeks(currentDate, 1))
    else setCurrentDate(addDays(currentDate, 1))
  }

  const prev = () => {
    if (view === "month") setCurrentDate(subMonths(currentDate, 1))
    else if (view === "week") setCurrentDate(subWeeks(currentDate, 1))
    else setCurrentDate(subDays(currentDate, 1))
  }

  const renderHeader = () => {
    const title = view === "month" 
      ? format(currentDate, "MMMM yyyy", { locale: he })
      : view === "week"
      ? `שבוע ${format(startOfWeek(currentDate, { weekStartsOn: 0 }), "d בMMMM", { locale: he })} - ${format(endOfWeek(currentDate, { weekStartsOn: 0 }), "d בMMMM", { locale: he })}`
      : format(currentDate, "EEEE, d בMMMM yyyy", { locale: he })

    return (
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div className="flex flex-col md:flex-row md:items-center gap-4">
          <h1 className="text-3xl font-bold text-slate-900">יומן פגישות</h1>
          <div className="flex items-center bg-white rounded-xl border border-slate-200 p-1 shadow-sm w-fit">
            <Button
              variant="ghost"
              size="icon"
              onClick={prev}
              className="h-8 w-8 text-slate-600 hover:bg-slate-50"
            >
              <ChevronRight className="h-5 w-5" />
            </Button>
            <div className="px-4 font-bold text-slate-700 min-w-[140px] text-center whitespace-nowrap">
              {title}
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={next}
              className="h-8 w-8 text-slate-600 hover:bg-slate-50"
            >
              <ChevronLeft className="h-5 w-5" />
            </Button>
            <div className="h-4 w-[1px] bg-slate-200 mx-1" />
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setCurrentDate(new Date())}
              className="text-xs font-bold text-primary hover:bg-primary/5"
            >
              היום
            </Button>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* View Switcher */}
          <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setView("month")}
              className={cn(
                "gap-2 px-3 rounded-lg transition-all h-8 text-xs font-bold",
                view === "month" ? "bg-white shadow-sm text-primary" : "text-slate-500 hover:text-slate-700"
              )}
            >
              <LayoutGrid className="h-3.5 w-3.5" />
              חודש
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setView("week")}
              className={cn(
                "gap-2 px-3 rounded-lg transition-all h-8 text-xs font-bold",
                view === "week" ? "bg-white shadow-sm text-primary" : "text-slate-500 hover:text-slate-700"
              )}
            >
              <Columns className="h-3.5 w-3.5" />
              שבוע
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setView("day")}
              className={cn(
                "gap-2 px-3 rounded-lg transition-all h-8 text-xs font-bold",
                view === "day" ? "bg-white shadow-sm text-primary" : "text-slate-500 hover:text-slate-700"
              )}
            >
              <Square className="h-3.5 w-3.5" />
              יום
            </Button>
          </div>

          <div className="h-6 w-[1px] bg-slate-200 mx-1 hidden md:block" />

          {/* Filter */}
          <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setFilter("my")}
              className={cn(
                "gap-2 px-3 rounded-lg transition-all h-8 text-xs font-bold",
                filter === "my" ? "bg-white shadow-sm text-primary" : "text-slate-500"
              )}
            >
              <UserIcon className="h-3.5 w-3.5" />
              שלי
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setFilter("all")}
              className={cn(
                "gap-2 px-3 rounded-lg transition-all h-8 text-xs font-bold",
                filter === "all" ? "bg-white shadow-sm text-primary" : "text-slate-500"
              )}
            >
              <Users className="h-3.5 w-3.5" />
              הכל
            </Button>
          </div>
          
          <Button
            variant="outline"
            onClick={() => setIsBookingSettingsOpen(true)}
            className="gap-2 h-9"
          >
            <LinkIcon className="h-4 w-4" />
            לינק קביעת פגישה
          </Button>

          <Button onClick={() => window.location.href = '/contacts'} className="gap-2 shadow-lg shadow-primary/20 h-9">
            <Plus className="h-4 w-4" />
            פגישה חדשה
          </Button>
        </div>
      </div>
    )
  }

  const renderMonthView = () => {
    const monthStart = startOfMonth(currentDate)
    const monthEnd = endOfMonth(monthStart)
    const startDate = startOfWeek(monthStart, { weekStartsOn: 0 })
    const endDate = endOfWeek(monthEnd, { weekStartsOn: 0 })
    
    const days = ["א'", "ב'", "ג'", "ד'", "ה'", "ו'", "ש'"]
    const calendarDays = eachDayOfInterval({ start: startDate, end: endDate })

    return (
      <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200">
        <div className="grid grid-cols-7 mb-2">
          {days.map((day, i) => (
            <div key={i} className="text-center font-bold text-slate-400 text-sm py-2">
              {day}
            </div>
          ))}
        </div>
        <div className="border-t border-l rounded-2xl overflow-hidden shadow-sm grid grid-cols-7">
          {calendarDays.map((day, i) => {
            const dayAppts = appointments.filter(appt => isSameDay(parseISO(appt.start_time), day))
            return (
              <div
                key={day.toString()}
                role="button"
                tabIndex={0}
                onClick={() => {
                  setCurrentDate(day)
                  setView("day")
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault()
                    setCurrentDate(day)
                    setView("day")
                  }
                }}
                className={cn(
                  "min-h-[120px] border-r border-b p-2 transition-colors cursor-pointer hover:bg-slate-50/80 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/30",
                  !isSameMonth(day, monthStart) ? "bg-slate-50/50" : "bg-white",
                  isToday(day) && "bg-primary/5 ring-1 ring-primary/20 z-10"
                )}
              >
                <div className="flex justify-between items-center mb-2 px-1">
                  <span className={cn(
                    "text-sm font-bold w-7 h-7 flex items-center justify-center rounded-full",
                    isToday(day) ? "bg-primary text-white" : "text-slate-700"
                  )}>
                    {format(day, "d")}
                  </span>
                </div>
                <div className="space-y-1">
                  {dayAppts.slice(0, 3).map(appt => (
                      <div
                        key={appt.id}
                        className={cn(
                          "text-[9px] p-1 rounded border shadow-sm truncate font-bold cursor-pointer hover:scale-[1.02] transition-transform",
                          appt.status === 'scheduled' ? "bg-blue-50 border-blue-100 text-blue-700" :
                          appt.status === 'completed' ? "bg-emerald-50 border-emerald-100 text-emerald-700" :
                          "bg-slate-50 border-slate-100 text-slate-500"
                        )}
                        onClick={(e) => {
                          e.stopPropagation()
                          setSelectedAppt(appt)
                          setIsEditOpen(true)
                        }}
                      >
                        {format(parseISO(appt.start_time), 'HH:mm')} {appt.title}
                      </div>
                  ))}
                  {dayAppts.length > 3 && (
                    <div
                      className="text-[9px] text-muted-foreground text-center font-medium cursor-pointer hover:text-primary"
                      onClick={(e) => {
                        e.stopPropagation()
                        setCurrentDate(day)
                        setView("day")
                      }}
                    >
                      +{dayAppts.length - 3} נוספים
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  const renderWeekView = () => {
    const startDate = startOfWeek(currentDate, { weekStartsOn: 0 })
    const weekDays = Array.from({ length: 7 }, (_, i) => addDays(startDate, i))
    const hours = Array.from({ length: 14 }, (_, i) => i + 8) // 08:00 to 21:00

    return (
      <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200 overflow-x-auto">
        <div className="min-w-[800px]">
          <div className="grid grid-cols-[80px_repeat(7,1fr)] border-b pb-4">
            <div />
            {weekDays.map((day, i) => (
              <div key={i} className="text-center">
                <div className="text-xs font-bold text-slate-400 mb-1">{format(day, "EEEE", { locale: he })}</div>
                <div className={cn(
                  "inline-flex items-center justify-center w-8 h-8 rounded-full text-sm font-bold",
                  isToday(day) ? "bg-primary text-white" : "text-slate-700"
                )}>
                  {format(day, "d")}
                </div>
              </div>
            ))}
          </div>
          
          <div className="relative">
            {hours.map(hour => (
              <div key={hour} className="grid grid-cols-[80px_repeat(7,1fr)] h-20 border-b relative">
                <div className="text-xs text-slate-400 font-medium py-2 flex justify-center border-l">
                  {hour.toString().padStart(2, '0')}:00
                </div>
                {weekDays.map((day, i) => {
                  const dayStart = setMinutes(setHours(day, hour), 0)
                  const dayEnd = setMinutes(setHours(day, hour), 59)
                  
                  const apptsInHour = appointments.filter(appt => {
                    const start = parseISO(appt.start_time)
                    return isWithinInterval(start, { start: dayStart, end: dayEnd })
                  })

                  return (
                    <div key={i} className="border-l relative p-1 hover:bg-slate-50 transition-colors">
                      {apptsInHour.map(appt => (
                        <div
                          key={appt.id}
                          className={cn(
                            "absolute inset-x-1 rounded-lg border p-2 shadow-sm z-10 overflow-hidden cursor-pointer hover:scale-[1.02] transition-transform",
                            appt.status === 'scheduled' ? "bg-blue-50 border-blue-200 text-blue-700" :
                            appt.status === 'completed' ? "bg-emerald-50 border-emerald-200 text-emerald-700" :
                            "bg-slate-50 border-slate-200 text-slate-500"
                          )}
                          style={{
                            top: `${(new Date(appt.start_time).getMinutes() / 60) * 100}%`,
                            height: `${(60 / 60) * 100}%`, // Assuming 1 hour duration for visualization
                            minHeight: '40px'
                          }}
                          onClick={() => {
                            setSelectedAppt(appt)
                            setIsEditOpen(true)
                          }}
                        >
                          <div className="text-[10px] font-bold truncate">{appt.title}</div>
                          <div className="text-[9px] opacity-70 flex items-center gap-1 mt-0.5">
                            <Clock className="h-2 w-2" />
                            {format(parseISO(appt.start_time), "HH:mm")}
                          </div>
                        </div>
                      ))}
                    </div>
                  )
                })}
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  const renderDayView = () => {
    const hours = Array.from({ length: 15 }, (_, i) => i + 7) // 07:00 to 21:00
    const dayAppts = appointments.filter(appt => isSameDay(parseISO(appt.start_time), currentDate))

    return (
      <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200 max-w-4xl mx-auto">
        <div className="flex items-center gap-4 mb-8 border-b pb-6">
          <div className="bg-primary/10 p-4 rounded-2xl">
            <CalendarIcon className="h-8 w-8 text-primary" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-slate-900">{format(currentDate, "EEEE, d בMMMM", { locale: he })}</h2>
            <p className="text-slate-500 font-medium">יש לך {dayAppts.length} פגישות להיום</p>
          </div>
        </div>

        <div className="space-y-4">
          {hours.map(hour => {
            const dayStart = setMinutes(setHours(currentDate, hour), 0)
            const dayEnd = setMinutes(setHours(currentDate, hour), 59)
            const appts = dayAppts.filter(appt => {
              const start = parseISO(appt.start_time)
              return isWithinInterval(start, { start: dayStart, end: dayEnd })
            })

            return (
              <div key={hour} className="flex gap-4">
                <div className="w-16 text-sm font-bold text-slate-400 py-4">
                  {hour.toString().padStart(2, '0')}:00
                </div>
                <div className="flex-1 min-h-[80px] border-b border-slate-100 flex flex-col gap-2 py-2">
                  {appts.length === 0 ? (
                    <div className="h-full w-full rounded-xl border border-dashed border-slate-100 hover:bg-slate-50 transition-colors" />
                  ) : (
                    appts.map(appt => (
                      <div
                        key={appt.id}
                        className={cn(
                          "p-4 rounded-2xl border shadow-sm flex items-center justify-between group cursor-pointer transition-all hover:scale-[1.01]",
                          appt.status === 'scheduled' ? "bg-blue-50 border-blue-100 text-blue-800" :
                          appt.status === 'completed' ? "bg-emerald-50 border-emerald-100 text-emerald-800" :
                          "bg-slate-50 border-slate-100 text-slate-600"
                        )}
                        onClick={() => {
                          setSelectedAppt(appt)
                          setIsEditOpen(true)
                        }}
                      >
                        <div className="flex items-center gap-4">
                          <div className={cn(
                            "w-12 h-12 rounded-xl flex items-center justify-center font-bold text-sm",
                            appt.status === 'scheduled' ? "bg-blue-100" : "bg-emerald-100"
                          )}>
                            {format(parseISO(appt.start_time), "HH:mm")}
                          </div>
                          <div>
                            <h4 className="font-bold text-lg">{appt.title}</h4>
                            <div className="flex items-center gap-3 text-sm mt-1 opacity-70">
                              <div className="flex items-center gap-1">
                                <Users className="h-3.5 w-3.5" />
                                <span>{appt.contacts?.full_name}</span>
                              </div>
                              {appt.location && (
                                <div className="flex items-center gap-1">
                                  <MapPin className="h-3.5 w-3.5" />
                                  <span>{appt.location}</span>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {appt.meeting_link && (
                            <Button size="sm" variant="outline" className="h-8 rounded-lg gap-2" asChild>
                              <a href={appt.meeting_link} target="_blank" rel="noreferrer">
                                <Video className="h-3.5 w-3.5" />
                                הצטרפות
                              </a>
                            </Button>
                          )}
                          <Badge className={cn(
                            "rounded-lg px-2 py-1",
                            appt.status === 'scheduled' ? "bg-blue-200 text-blue-800" : "bg-emerald-200 text-emerald-800"
                          )}>
                            {appt.status === 'scheduled' ? 'מתוזמן' : 'בוצע'}
                          </Badge>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto w-full p-4 lg:p-0 pb-12" dir="rtl">
      {renderHeader()}
      {view === "month" && renderMonthView()}
      {view === "week" && renderWeekView()}
      {view === "day" && renderDayView()}

      {selectedAppt && (
        <EditAppointmentDialog
          open={isEditOpen}
          onOpenChange={setIsEditOpen}
          appointment={selectedAppt}
          businessId={businessId!}
          onSuccess={loadAppointments}
        />
      )}

      {businessId && (
        <BookingSettingsDialog
          open={isBookingSettingsOpen}
          onOpenChange={setIsBookingSettingsOpen}
          businessId={businessId}
        />
      )}
    </div>
  )
}
