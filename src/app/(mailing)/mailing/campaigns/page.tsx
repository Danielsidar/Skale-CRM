"use client"

import { CampaignManager } from "@/components/mailing/CampaignManager"
import { History } from "lucide-react"

export default function MailingCampaignsPage() {
  return (
    <div className="space-y-6 pb-10 w-full" dir="rtl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 px-4 lg:px-0">
        <div className="relative">
          <h1 className="text-3xl font-extrabold tracking-tight text-foreground relative flex items-center gap-3">
             <div className="h-10 w-10 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-600 border border-indigo-500/20">
              <History className="h-6 w-6" />
            </div>
            קמפיינים שנשלחו
          </h1>
          <p className="text-muted-foreground text-sm mt-2 font-medium">
            מעקב אחר ביצועי קמפיינים קודמים וסטטיסטיקות פתיחה
          </p>
        </div>
      </div>

      <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
        <CampaignManager />
      </div>
    </div>
  )
}
