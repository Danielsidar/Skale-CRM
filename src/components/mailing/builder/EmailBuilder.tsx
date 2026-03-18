"use client"

import React, { useState, useEffect } from 'react'
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd'
import { useEmailBuilderStore } from '@/lib/mailing/email-builder-store'
import { 
  EmailBlock, 
  EmailTemplateJSON, 
  DEFAULT_BODY_STYLES 
} from '@/types/email-builder'
import { Sidebar } from './Sidebar'
import { Canvas } from './Canvas'
import { PropertiesPanel } from './PropertiesPanel'
import { PreviewDialog } from './PreviewDialog'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { Eye, Smartphone, Monitor, Save, Undo, Redo, ChevronRight, Share2, X, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import { useBusiness } from '@/lib/hooks/useBusiness'
import { generateEmailHTML } from '@/lib/mailing/email-html-generator'

interface EmailBuilderProps {
  templateId?: string
  initialData?: any
  onSave?: (data: any) => void
  onClose?: () => void
}

export function EmailBuilder({ templateId, initialData, onSave, onClose }: EmailBuilderProps) {
  const { businessId } = useBusiness()
  const { template, setTemplate, moveBlock, undo, redo, history, historyIndex } = useEmailBuilderStore()
  const [viewMode, setViewMode] = useState<'desktop' | 'mobile'>('desktop')
  const [isPreviewOpen, setIsPreviewOpen] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const supabase = createClient()

  // Load initial data
  React.useEffect(() => {
    if (initialData) {
      // Merge with defaults to ensure new fields like contentBackgroundColor exist
      const mergedTemplate = {
        ...initialData,
        body: {
          ...initialData.body,
          styles: {
            ...DEFAULT_BODY_STYLES,
            ...initialData.body?.styles
          }
        }
      }
      setTemplate(mergedTemplate)
    } else {
      setTemplate({
        body: {
          styles: DEFAULT_BODY_STYLES,
          blocks: []
        }
      })
    }
  }, [initialData, setTemplate])

  const onDragEnd = (result: any) => {
    const { destination, source } = result

    if (!destination) return
    if (destination.droppableId === source.droppableId && destination.index === source.index) return

    moveBlock(source.index, destination.index)
  }

  const handleSave = async () => {
    if (!businessId) {
      toast.error('לא נמצא מזהה עסק')
      return
    }
    
    setIsSaving(true)
    try {
      if (onSave) {
        await onSave(template)
      } else if (templateId) {
        const { error } = await supabase
          .from('email_templates')
          .update({ 
            content_json: template,
            updated_at: new Date().toISOString()
          })
          .eq('id', templateId)
        
        if (error) throw error
        toast.success('התבנית נשמרה בהצלחה')
      }
    } catch (err: any) {
      toast.error(`שגיאה בשמירת התבנית: ${err.message || 'שגיאה לא ידועה'}`)
    } finally {
      setIsSaving(false)
    }
  }

  const previewHtml = generateEmailHTML(template)

  return (
    <div className="relative flex-1 flex flex-col bg-slate-50/20 overflow-hidden h-full w-full rounded-2xl border border-border/40 shadow-sm" dir="rtl">
      {/* Header */}
      <header className="h-12 border-b border-border/50 bg-white/80 backdrop-blur-sm flex items-center justify-between px-4 flex-shrink-0 z-50">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8 rounded-lg hover:bg-slate-100 transition-colors">
            <X className="h-4 w-4" />
          </Button>
          <div className="h-6 w-px bg-border/60 mx-1" />
          <div className="flex items-center gap-2">
            <div className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" />
            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Live Editor</span>
          </div>
        </div>

        <div className="flex items-center gap-1 bg-slate-100/50 p-0.5 rounded-xl border border-slate-200/50">
          <Button 
            variant={viewMode === 'desktop' ? 'secondary' : 'ghost'} 
            size="sm" 
            onClick={() => setViewMode('desktop')}
            className={cn(
              "rounded-lg h-7 px-3 gap-2 text-[10px] font-bold transition-all duration-200",
              viewMode === 'desktop' && "bg-white shadow-sm border-slate-200 border"
            )}
          >
            <Monitor className="h-3 w-3" />
            <span>דסקטופ</span>
          </Button>
          <Button 
            variant={viewMode === 'mobile' ? 'secondary' : 'ghost'} 
            size="sm" 
            onClick={() => setViewMode('mobile')}
            className={cn(
              "rounded-lg h-7 px-3 gap-2 text-[10px] font-bold transition-all duration-200",
              viewMode === 'mobile' && "bg-white shadow-sm border-slate-200 border"
            )}
          >
            <Smartphone className="h-3 w-3" />
            <span>מובייל</span>
          </Button>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-0.5 border-l border-slate-200 pl-3 ml-1">
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={undo} 
              disabled={historyIndex <= 0}
              className="h-8 w-8 rounded-lg disabled:opacity-30 hover:bg-slate-100 transition-colors"
              title="ביטול (Undo)"
            >
              <Undo className="h-3.5 w-3.5" />
            </Button>
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={redo} 
              disabled={historyIndex >= history.length - 1}
              className="h-8 w-8 rounded-lg disabled:opacity-30 hover:bg-slate-100 transition-colors"
              title="ביצוע מחדש (Redo)"
            >
              <Redo className="h-3.5 w-3.5" />
            </Button>
          </div>
          
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => setIsPreviewOpen(true)}
            className="rounded-lg gap-2 h-8 px-4 text-[11px] font-bold border-slate-200 hover:bg-slate-50 transition-all"
          >
            <Eye className="h-3.5 w-3.5" />
            תצוגה מקדימה
          </Button>
          <Button 
            onClick={handleSave} 
            size="sm" 
            disabled={isSaving}
            className="rounded-lg gap-2 h-8 px-5 text-[11px] font-bold bg-slate-900 hover:bg-slate-800 text-white shadow-sm transition-all disabled:opacity-50"
          >
            {isSaving ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Save className="h-3.5 w-3.5" />
            )}
            {isSaving ? 'שומר...' : 'שמור'}
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden bg-slate-50/50">
        <DragDropContext onDragEnd={onDragEnd}>
          {/* Left Sidebar: Blocks */}
          <Sidebar />

          {/* Center: Canvas */}
          <div className="flex-1 bg-slate-100/30 overflow-y-auto p-12 custom-scrollbar">
            <Canvas viewMode={viewMode} />
          </div>
        </DragDropContext>

        {/* Right Sidebar: Properties */}
        <PropertiesPanel />
      </div>

      {/* Preview Dialog */}
      <PreviewDialog 
        open={isPreviewOpen} 
        onOpenChange={setIsPreviewOpen} 
        html={previewHtml} 
      />
    </div>
  )
}
