"use client"

import { Database } from "@/types/database.types"
import { formatDistanceToNow } from "date-fns"
import { he } from "date-fns/locale"
import { ArrowUpRight, MessageSquare, Phone, Mail, Calendar, UserPlus, RefreshCcw, ArrowRightLeft } from "lucide-react"
import { useRouter } from "next/navigation"

type Activity = Database["public"]["Tables"]["lead_activities_legacy"]["Row"] & {
  leads: {
    name: string
    id: string
    contact_id?: string | null
  }
}

interface RecentActivityProps {
  activities: Activity[]
}

const getActivityIcon = (type: string) => {
  switch (type) {
    case "status_change":
      return <ArrowRightLeft className="h-3 w-3" />
    case "note":
      return <MessageSquare className="h-3 w-3" />
    case "call":
      return <Phone className="h-3 w-3" />
    case "email":
      return <Mail className="h-3 w-3" />
    case "meeting":
      return <Calendar className="h-3 w-3" />
    case "creation":
      return <UserPlus className="h-3 w-3" />
    default:
      return <RefreshCcw className="h-3 w-3" />
  }
}

export function RecentActivity({ activities }: RecentActivityProps) {
  const router = useRouter()
  if (activities.length === 0) {
    return (
      <div className="p-10 text-center">
        <p className="text-slate-500 text-sm font-medium">אין פעילות לאחרונה</p>
      </div>
    )
  }

  const handleActivityClick = (activity: Activity) => {
    if (activity.leads.contact_id) {
      router.push(`/contacts/${activity.leads.contact_id}`)
    } else {
      // Avoid 404 by not redirecting to non-existent /deals/ page
      console.warn("Activity lead has no contact_id:", activity.lead_id)
    }
  }

  return (
    <div className="divide-y divide-white/5">
      {activities.map((activity) => (
        <div 
          key={activity.id} 
          onClick={() => handleActivityClick(activity)}
          className="p-4 hover:bg-white/5 transition-colors cursor-pointer group block"
        >
          <div className="flex items-center gap-4">
            <div className="h-10 w-10 rounded-xl bg-slate-800/50 flex items-center justify-center border border-white/5 group-hover:border-primary/50 group-hover:bg-primary/10 transition-all">
              <div className="text-slate-400 group-hover:text-primary">
                {getActivityIcon(activity.activity_type)}
              </div>
            </div>
            <div className="flex-1 space-y-0.5">
              <p className="text-sm font-bold text-slate-200 group-hover:text-white transition-colors text-right">
                {activity.description}
              </p>
              <p className="text-[10px] text-slate-500 font-medium text-right">
                {activity.leads.name} • {formatDistanceToNow(new Date(activity.created_at!), { addSuffix: true, locale: he })}
              </p>
            </div>
            <ArrowUpRight className="h-4 w-4 text-slate-600 opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
        </div>
      ))}
    </div>
  )
}
