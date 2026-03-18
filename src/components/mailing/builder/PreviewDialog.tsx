"use client"

import React from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Smartphone, Monitor } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface PreviewDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  html: string
}

export function PreviewDialog({ open, onOpenChange, html }: PreviewDialogProps) {
  const [mode, setMode] = React.useState<'desktop' | 'mobile'>('desktop')

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] w-[1000px] h-[90vh] flex flex-col p-0 overflow-hidden border-none rounded-2xl shadow-2xl bg-slate-50">
        <DialogHeader className="p-4 bg-white border-b border-slate-200 flex flex-row items-center justify-between shrink-0 space-y-0">
          <DialogTitle className="text-sm font-bold flex items-center gap-2">
            תצוגה מקדימה
          </DialogTitle>
          
          <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg border border-slate-200">
            <Button 
              variant={mode === 'desktop' ? 'secondary' : 'ghost'} 
              size="sm" 
              onClick={() => setMode('desktop')}
              className={cn("h-7 px-3 gap-2 text-[10px] font-bold", mode === 'desktop' && "bg-white shadow-sm")}
            >
              <Monitor className="h-3.5 w-3.5" />
              דסקטופ
            </Button>
            <Button 
              variant={mode === 'mobile' ? 'secondary' : 'ghost'} 
              size="sm" 
              onClick={() => setMode('mobile')}
              className={cn("h-7 px-3 gap-2 text-[10px] font-bold", mode === 'mobile' && "bg-white shadow-sm")}
            >
              <Smartphone className="h-3.5 w-3.5" />
              מובייל
            </Button>
          </div>
          
          <div className="w-20" /> {/* Spacer */}
        </DialogHeader>

        <div className="flex-1 overflow-hidden flex items-center justify-center p-8 bg-slate-200/50">
          <div 
            className={cn(
              "bg-white shadow-2xl transition-all duration-300 overflow-hidden",
              mode === 'mobile' ? "w-[375px] h-[667px] rounded-[32px] border-[8px] border-slate-900" : "w-full h-full rounded-lg"
            )}
          >
            <iframe 
              srcDoc={html} 
              title="Email Preview"
              className="w-full h-full border-none"
            />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
