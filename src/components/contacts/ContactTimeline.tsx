"use client"

import { format } from "date-fns"
import { he } from "date-fns/locale"
import {
  MessageSquare,
  Phone,
  Mail,
  Calendar,
  CheckCircle2,
  Clock,
  Target,
  ArrowRightLeft,
  Trophy,
  XCircle,
  UserPlus,
  Zap,
} from "lucide-react"
import { cn } from "@/lib/utils"

export type TimelineEvent =
  | {
      kind: "activity"
      id: string
      created_at: string
      type: string
      content: string | null
    }
  | {
      kind: "deal_created"
      id: string
      created_at: string
      deal_title: string
      pipeline_name: string
    }
  | {
      kind: "stage_change"
      id: string
      created_at: string
      deal_title: string
      old_stage: { name: string; color: string | null } | null
      new_stage: { name: string; color: string | null; is_won: boolean; is_lost: boolean }
    }
  | {
      kind: "appointment"
      id: string
      created_at: string
      title: string
      start_time: string
      status: string
    }
  | {
      kind: "contact_created"
      id: string
      created_at: string
    }

interface ContactTimelineProps {
  events: TimelineEvent[]
  loading?: boolean
}

const activityIcons: Record<string, any> = {
  note: MessageSquare,
  call: Phone,
  email: Mail,
  meeting: Calendar,
  task: CheckCircle2,
  message: MessageSquare,
}

const activityColors: Record<string, string> = {
  note: "bg-blue-100 text-blue-600",
  call: "bg-green-100 text-green-600",
  email: "bg-sky-100 text-sky-600",
  meeting: "bg-violet-100 text-violet-600",
  task: "bg-purple-100 text-purple-600",
  message: "bg-blue-100 text-blue-600",
}

const activityLabels: Record<string, string> = {
  note: "הערה",
  call: "שיחה",
  email: "מייל",
  meeting: "פגישה",
  task: "משימה",
  message: "הודעה",
}

function EventIcon({ event }: { event: TimelineEvent }) {
  if (event.kind === "activity") {
    const Icon = activityIcons[event.type] ?? MessageSquare
    return (
      <div className={cn("absolute right-0 top-0 h-8 w-8 rounded-full border-2 border-background flex items-center justify-center z-10", activityColors[event.type] ?? "bg-slate-100 text-slate-600")}>
        <Icon className="h-4 w-4" />
      </div>
    )
  }

  if (event.kind === "deal_created") {
    return (
      <div className="absolute right-0 top-0 h-8 w-8 rounded-full border-2 border-background flex items-center justify-center z-10 bg-indigo-100 text-indigo-600">
        <Target className="h-4 w-4" />
      </div>
    )
  }

  if (event.kind === "stage_change") {
    if (event.new_stage.is_won) {
      return (
        <div className="absolute right-0 top-0 h-8 w-8 rounded-full border-2 border-background flex items-center justify-center z-10 bg-emerald-100 text-emerald-600">
          <Trophy className="h-4 w-4" />
        </div>
      )
    }
    if (event.new_stage.is_lost) {
      return (
        <div className="absolute right-0 top-0 h-8 w-8 rounded-full border-2 border-background flex items-center justify-center z-10 bg-red-100 text-red-600">
          <XCircle className="h-4 w-4" />
        </div>
      )
    }
    return (
      <div className="absolute right-0 top-0 h-8 w-8 rounded-full border-2 border-background flex items-center justify-center z-10 bg-amber-100 text-amber-600">
        <ArrowRightLeft className="h-4 w-4" />
      </div>
    )
  }

  if (event.kind === "appointment") {
    return (
      <div className="absolute right-0 top-0 h-8 w-8 rounded-full border-2 border-background flex items-center justify-center z-10 bg-teal-100 text-teal-600">
        <Calendar className="h-4 w-4" />
      </div>
    )
  }

  if (event.kind === "contact_created") {
    return (
      <div className="absolute right-0 top-0 h-8 w-8 rounded-full border-2 border-background flex items-center justify-center z-10 bg-slate-100 text-slate-600">
        <UserPlus className="h-4 w-4" />
      </div>
    )
  }

  return null
}

function EventBadge({ event }: { event: TimelineEvent }) {
  if (event.kind === "activity") {
    return (
      <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground uppercase font-bold">
        {activityLabels[event.type] ?? event.type}
      </span>
    )
  }
  if (event.kind === "deal_created") {
    return <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-indigo-100 text-indigo-700 font-bold">ליד חדש</span>
  }
  if (event.kind === "stage_change") {
    if (event.new_stage.is_won) return <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700 font-bold">עיסקה נסגרה</span>
    if (event.new_stage.is_lost) return <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-red-100 text-red-700 font-bold">עיסקה אבדה</span>
    return <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700 font-bold">מעבר שלב</span>
  }
  if (event.kind === "appointment") {
    return <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-teal-100 text-teal-700 font-bold">פגישה</span>
  }
  if (event.kind === "contact_created") {
    return <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-600 font-bold">הצטרף</span>
  }
  return null
}

function EventContent({ event }: { event: TimelineEvent }) {
  if (event.kind === "activity") {
    return (
      <div className="bg-muted/30 rounded-lg p-3 border border-border/50">
        <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">
          {event.content || "—"}
        </p>
      </div>
    )
  }

  if (event.kind === "deal_created") {
    return (
      <div className="bg-indigo-50/50 rounded-lg p-3 border border-indigo-100">
        <p className="text-sm text-foreground">
          נוסף כליד בפייפליין{" "}
          <span className="font-bold text-indigo-700">{event.pipeline_name}</span>
        </p>
        <p className="text-xs text-muted-foreground mt-0.5">{event.deal_title}</p>
      </div>
    )
  }

  if (event.kind === "stage_change") {
    if (event.new_stage.is_won) {
      return (
        <div className="bg-emerald-50/50 rounded-lg p-3 border border-emerald-100">
          <p className="text-sm text-foreground font-medium">
            🏆 עיסקה נסגרה בהצלחה!
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">{event.deal_title}</p>
        </div>
      )
    }
    if (event.new_stage.is_lost) {
      return (
        <div className="bg-red-50/50 rounded-lg p-3 border border-red-100">
          <p className="text-sm text-foreground font-medium">עיסקה אבדה</p>
          <p className="text-xs text-muted-foreground mt-0.5">{event.deal_title}</p>
        </div>
      )
    }
    return (
      <div className="bg-amber-50/50 rounded-lg p-3 border border-amber-100">
        <div className="flex items-center gap-2 text-sm">
          {event.old_stage ? (
            <>
              <span
                className="text-xs font-bold px-2 py-0.5 rounded-full"
                style={{
                  backgroundColor: (event.old_stage.color ?? "#94a3b8") + "25",
                  color: event.old_stage.color ?? "#94a3b8",
                }}
              >
                {event.old_stage.name}
              </span>
              <ArrowRightLeft className="h-3 w-3 text-muted-foreground shrink-0" />
            </>
          ) : null}
          <span
            className="text-xs font-bold px-2 py-0.5 rounded-full"
            style={{
              backgroundColor: (event.new_stage.color ?? "#94a3b8") + "25",
              color: event.new_stage.color ?? "#94a3b8",
            }}
          >
            {event.new_stage.name}
          </span>
        </div>
        <p className="text-xs text-muted-foreground mt-1">{event.deal_title}</p>
      </div>
    )
  }

  if (event.kind === "appointment") {
    const startDate = new Date(event.start_time)
    const statusLabel =
      event.status === "completed" ? "בוצעה" :
      event.status === "cancelled" ? "בוטלה" : "מתוזמנת"
    const statusColor =
      event.status === "completed" ? "text-emerald-700" :
      event.status === "cancelled" ? "text-red-700" : "text-blue-700"
    return (
      <div className="bg-teal-50/50 rounded-lg p-3 border border-teal-100">
        <p className="text-sm font-medium text-foreground">{event.title}</p>
        <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
          <Calendar className="h-3 w-3" />
          <span>{format(startDate, "d MMM yyyy, HH:mm", { locale: he })}</span>
          <span className={cn("font-bold", statusColor)}>· {statusLabel}</span>
        </div>
      </div>
    )
  }

  if (event.kind === "contact_created") {
    return (
      <div className="bg-muted/20 rounded-lg p-3 border border-border/50">
        <p className="text-sm text-muted-foreground">איש קשר נוצר במערכת</p>
      </div>
    )
  }

  return null
}

export function ContactTimeline({ events, loading }: ContactTimelineProps) {
  if (loading) {
    return (
      <div className="space-y-4 p-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex gap-4 animate-pulse">
            <div className="h-8 w-8 rounded-full bg-muted" />
            <div className="flex-1 space-y-2">
              <div className="h-4 w-1/4 bg-muted rounded" />
              <div className="h-10 bg-muted rounded" />
            </div>
          </div>
        ))}
      </div>
    )
  }

  if (events.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
        <Clock className="h-8 w-8 mb-2 opacity-20" />
        <p>אין פעילות עדיין</p>
      </div>
    )
  }

  return (
    <div className="relative space-y-6 before:absolute before:inset-y-0 before:right-4 before:w-0.5 before:bg-border/50 pb-8">
      {events.map((event) => {
        const date = event.created_at ? new Date(event.created_at) : new Date()
        return (
          <div key={`${event.kind}-${event.id}`} className="relative pr-12">
            <EventIcon event={event} />
            <div className="flex flex-col gap-1">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-muted-foreground">
                  {format(date, "d MMM yyyy, HH:mm", { locale: he })}
                </span>
                <EventBadge event={event} />
              </div>
              <EventContent event={event} />
            </div>
          </div>
        )
      })}
    </div>
  )
}
