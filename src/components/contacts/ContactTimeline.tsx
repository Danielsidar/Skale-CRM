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
  UserPlus,
  ArrowRightLeft,
  Trophy,
  XCircle
} from "lucide-react"
import { cn } from "@/lib/utils"
import type { Database } from "@/types/database.types"

type Activity = Database["public"]["Tables"]["activities"]["Row"]

interface ContactTimelineProps {
  activities: Activity[]
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

export function ContactTimeline({ activities, loading }: ContactTimelineProps) {
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

  if (activities.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
        <Clock className="h-8 w-8 mb-2 opacity-20" />
        <p>אין פעילות עדיין</p>
      </div>
    )
  }

  return (
    <div className="relative space-y-6 before:absolute before:inset-y-0 before:right-4 before:w-0.5 before:bg-border/50 pb-8">
      {activities.map((activity, index) => {
        const Icon = activityIcons[activity.type] || MessageSquare
        const date = activity.created_at ? new Date(activity.created_at) : new Date()
        
        return (
          <div key={activity.id} className="relative pr-12">
            {/* Timeline dot/icon */}
            <div 
              className={cn(
                "absolute right-0 top-0 h-8 w-8 rounded-full border-2 border-background flex items-center justify-center z-10",
                activity.type === 'note' ? "bg-blue-100 text-blue-600" :
                activity.type === 'task' ? "bg-purple-100 text-purple-600" :
                activity.type === 'call' ? "bg-green-100 text-green-600" :
                "bg-slate-100 text-slate-600"
              )}
            >
              <Icon className="h-4 w-4" />
            </div>

            <div className="flex flex-col gap-1">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-muted-foreground">
                  {format(date, "d MMM yyyy, HH:mm", { locale: he })}
                </span>
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground uppercase font-bold">
                  {activity.type}
                </span>
              </div>
              
              <div className="bg-muted/30 rounded-lg p-3 border border-border/50">
                <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">
                  {activity.content}
                </p>
                
                {activity.metadata && typeof activity.metadata === 'object' && !Array.isArray(activity.metadata) && (
                  <div className="mt-2 text-xs text-muted-foreground border-t border-border/30 pt-2">
                    {/* Render additional metadata if needed */}
                  </div>
                )}
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
