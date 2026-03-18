"use client"

import { TemplateManager } from "@/components/mailing/TemplateManager"
import { Layout } from "lucide-react"

export default function MailingTemplatesPage() {
  return (
    <div className="space-y-6 pb-10 w-full" dir="rtl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 px-4 lg:px-0">
        <div className="relative">
          <h1 className="text-3xl font-extrabold tracking-tight text-foreground relative flex items-center gap-3">
             <div className="h-10 w-10 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-600 border border-indigo-500/20">
              <Layout className="h-6 w-6" />
            </div>
            תבניות מייל
          </h1>
          <p className="text-muted-foreground text-sm mt-2 font-medium">
            עיצוב וניהול תבניות דיוור מעוצבות
          </p>
        </div>
      </div>

      <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
        <TemplateManager />
      </div>
    </div>
  )
}
