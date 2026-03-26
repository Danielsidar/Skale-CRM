"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { SimpleAutomationEditor } from "./SimpleAutomationEditor"
import { GitBranch } from "lucide-react"
import { toast } from "sonner"

interface SimpleAutomationEditDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  automationId: string | null
  businessId: string | null
  onSaved: () => void
}

export function SimpleAutomationEditDialog({
  open,
  onOpenChange,
  automationId,
  businessId,
  onSaved,
}: SimpleAutomationEditDialogProps) {
  const router = useRouter()
  const supabase = createClient()
  const [converting, setConverting] = useState(false)

  const convertToComplex = async () => {
    if (!businessId || !automationId) return
    setConverting(true)
    try {
      const { error } = await supabase
        .from("automations")
        .update({ is_simple: false })
        .eq("id", automationId)
        .eq("business_id", businessId)
      if (error) {
        toast.error("שגיאה בעדכון")
        return
      }
      toast.success("עברתם לעורך המורכב")
      onOpenChange(false)
      router.push(`/automations/${automationId}/builder`)
    } finally {
      setConverting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-h-[90vh] overflow-y-auto text-right sm:max-w-xl"
        dir="rtl"
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle className="flex flex-wrap items-center gap-2 justify-start text-xl">
            <span>עריכת אוטומציה פשוטה</span>
            <Badge variant="secondary" className="bg-amber-50 text-amber-900 border-amber-200 font-normal">
              פשוטה
            </Badge>
          </DialogTitle>
        </DialogHeader>
        {automationId ? (
          <>
            <SimpleAutomationEditor
              key={automationId}
              businessId={businessId}
              automationId={automationId}
              dialogOpen={open}
              layout="dialog"
              onSaved={() => {
                onSaved()
              }}
              onCancel={() => onOpenChange(false)}
            />
            <Button
              type="button"
              variant="outline"
              className="w-full mt-2"
              disabled={converting}
              onClick={() => void convertToComplex()}
            >
              <GitBranch className="h-4 w-4 ms-2" />
              {converting ? "מעביר…" : "הפוך לאוטומציה מורכבת"}
            </Button>
          </>
        ) : null}
      </DialogContent>
    </Dialog>
  )
}
