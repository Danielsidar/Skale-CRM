"use client"

import { MailingStats } from "@/components/mailing/MailingStats"
import { Mail } from "lucide-react"

export default function MailingPage() {
  return (
    <div className="space-y-6 pb-10 w-full" dir="rtl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 px-4 lg:px-0">
        <div className="relative">
          <div className="absolute -top-10 -right-10 w-40 h-40 bg-indigo-500/5 rounded-full blur-3xl pointer-events-none" />
          <h1 className="text-3xl font-extrabold tracking-tight text-foreground relative flex items-center gap-3">
             <div className="h-10 w-10 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-600 border border-indigo-500/20">
              <Mail className="h-6 w-6" />
            </div>
            סקירת דיוור
          </h1>
          <p className="text-muted-foreground text-sm mt-2 font-medium">
            נתונים כלליים על הקמפיינים והנמענים שלך
          </p>
        </div>
      </div>

      <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
        <MailingStats />
      </div>
    </div>
  )
}
