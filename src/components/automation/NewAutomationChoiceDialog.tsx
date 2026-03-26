"use client"

import { GitBranch, Sparkles } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"

interface NewAutomationChoiceDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onChooseSimple: () => void
  onChooseComplex: () => void | Promise<void>
  complexLoading?: boolean
}

export function NewAutomationChoiceDialog({
  open,
  onOpenChange,
  onChooseSimple,
  onChooseComplex,
  complexLoading = false,
}: NewAutomationChoiceDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="text-right sm:max-w-md" dir="rtl" onOpenAutoFocus={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle className="text-xl">יצירת אוטומציה</DialogTitle>
          <DialogDescription className="text-right text-muted-foreground">
            בחרו סוג — פשוטה (טריגר ופעולה) או מורכבת (בילדר עם גרף).
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-3 pt-2">
          <button
            type="button"
            disabled={complexLoading}
            onClick={() => {
              onOpenChange(false)
              onChooseSimple()
            }}
            className="flex gap-4 rounded-xl border border-slate-200 bg-white p-4 text-right transition-colors hover:border-amber-300 hover:bg-amber-50/40 disabled:opacity-50"
          >
            <div className="rounded-lg bg-amber-100 p-2.5 text-amber-700 shrink-0">
              <Sparkles className="h-5 w-5" />
            </div>
            <div className="min-w-0 space-y-1">
              <p className="font-semibold text-slate-900">אוטומציה פשוטה</p>
              <p className="text-sm text-muted-foreground leading-snug">
                טריגר אחד ופעולה אחת — מתאים להודעות, תגיות והעברות שלב.
              </p>
            </div>
          </button>
          <button
            type="button"
            disabled={complexLoading}
            onClick={() => {
              onOpenChange(false)
              void onChooseComplex()
            }}
            className="flex gap-4 rounded-xl border border-slate-200 bg-white p-4 text-right transition-colors hover:border-blue-300 hover:bg-blue-50/40 disabled:opacity-50"
          >
            <div className="rounded-lg bg-blue-100 p-2.5 text-blue-700 shrink-0">
              <GitBranch className="h-5 w-5" />
            </div>
            <div className="min-w-0 space-y-1">
              <p className="font-semibold text-slate-900">אוטומציה מורכבת</p>
              <p className="text-sm text-muted-foreground leading-snug">
                בילדר עם גרף, תנאים ומספר צעדים.
              </p>
            </div>
          </button>
        </div>
        <Button type="button" variant="ghost" className="w-full" onClick={() => onOpenChange(false)} disabled={complexLoading}>
          ביטול
        </Button>
      </DialogContent>
    </Dialog>
  )
}
