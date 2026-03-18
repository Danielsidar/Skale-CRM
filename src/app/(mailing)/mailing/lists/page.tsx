"use client"

import { MailingListManager } from "@/components/mailing/MailingListManager"
import { MailingListDetails } from "@/components/mailing/MailingListDetails"
import { List } from "lucide-react"
import { useSearchParams } from "next/navigation"

export default function MailingListsPage() {
  const searchParams = useSearchParams()
  const selectedListId = searchParams.get("listId")

  return (
    <div className="space-y-6 pb-10 w-full" dir="rtl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 px-4 lg:px-0">
        <div className="relative">
          <h1 className="text-3xl font-extrabold tracking-tight text-foreground relative flex items-center gap-3">
             <div className="h-10 w-10 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-600 border border-indigo-500/20">
              <List className="h-6 w-6" />
            </div>
            רשימות תפוצה
          </h1>
          <p className="text-muted-foreground text-sm mt-2 font-medium">
            ניהול הנמענים וחלוקה לקבוצות דיוור
          </p>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-6 min-h-[600px] animate-in fade-in slide-in-from-bottom-2 duration-300">
        <div className="w-full lg:w-80 flex-shrink-0">
          <MailingListManager 
            selectedId={selectedListId} 
            onSelect={(id) => {
              const url = new URL(window.location.href)
              if (id) url.searchParams.set('listId', id)
              else url.searchParams.delete('listId')
              window.history.pushState({}, '', url)
            }}
            variant="sidebar"
          />
        </div>
        
        <div className="flex-1 min-w-0 bg-card rounded-2xl border border-border/50 p-6">
          {selectedListId ? (
            <MailingListDetails 
              listId={selectedListId} 
              onBack={() => {
                const url = new URL(window.location.href)
                url.searchParams.delete('listId')
                window.history.pushState({}, '', url)
              }} 
              hideBack
            />
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-center p-12 space-y-4">
              <div className="h-16 w-16 rounded-2xl bg-indigo-500/5 flex items-center justify-center text-indigo-500/40">
                <List className="h-8 w-8" />
              </div>
              <div className="space-y-2">
                <h3 className="text-xl font-bold text-slate-900">בחר רשימת תפוצה</h3>
                <p className="text-slate-500 max-w-xs mx-auto">
                  בחר רשימה מהתפריט הימני כדי לראות את אנשי הקשר ולנהל את המנויים שלך.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
