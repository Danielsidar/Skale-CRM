"use client"

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { SimpleAutomationEditor } from "./SimpleAutomationEditor"

interface SimpleAutomationDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  businessId: string | null
  onCreated: (automationId: string) => void
}

export function SimpleAutomationDialog({
  open,
  onOpenChange,
  businessId,
  onCreated,
}: SimpleAutomationDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-h-[90vh] overflow-y-auto text-right sm:max-w-xl"
        dir="rtl"
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle className="text-xl">אוטומציה פשוטה</DialogTitle>
        </DialogHeader>
        <SimpleAutomationEditor
          businessId={businessId}
          automationId={null}
          dialogOpen={open}
          layout="dialog"
          onCreated={(id) => {
            onOpenChange(false)
            onCreated(id)
          }}
          onCancel={() => onOpenChange(false)}
        />
      </DialogContent>
    </Dialog>
  )
}
