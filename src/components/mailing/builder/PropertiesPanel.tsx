"use client"

import React from 'react'
import { useEmailBuilderStore } from '@/lib/mailing/email-builder-store'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Settings2, Paintbrush, Layout, Trash2, AlignLeft, AlignCenter, AlignRight, AlignJustify, Type } from 'lucide-react'
import { cn } from '@/lib/utils'

export function PropertiesPanel() {
  const { selectedBlockId, template, updateBlock, updateBodyStyles } = useEmailBuilderStore()
  
  const selectedBlock = template.body.blocks.find(b => b.id === selectedBlockId)

  if (!selectedBlock) {
    return (
      <aside className="w-80 border-r border-border bg-card flex flex-col flex-shrink-0">
        <div className="p-6 border-b border-border/50">
          <h3 className="font-bold text-lg flex items-center gap-2">
            <Settings2 className="h-5 w-5 text-primary" />
            הגדרות עיצוב
          </h3>
          <p className="text-xs text-muted-foreground mt-1 font-medium">הגדרות כלליות למייל</p>
        </div>
        <div className="p-6 space-y-6 overflow-y-auto custom-scrollbar">
           <div className="space-y-6">
              <div className="space-y-3">
                <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                  <div className="h-1 w-1 rounded-full bg-primary" />
                  רקע כללי (דף)
                </Label>
                <div className="flex gap-2">
                  <Input 
                    type="color" 
                    value={template.body.styles.backgroundColor || '#f1f5f9'}
                    onChange={(e) => updateBodyStyles({ backgroundColor: e.target.value })}
                    className="w-10 p-1 h-9 rounded-xl border-border cursor-pointer shadow-sm"
                  />
                  <Input 
                    type="text" 
                    value={template.body.styles.backgroundColor || '#f1f5f9'}
                    onChange={(e) => updateBodyStyles({ backgroundColor: e.target.value })}
                    className="flex-1 h-9 rounded-xl bg-muted/20 border-border/50 text-[10px] font-mono"
                  />
                </div>
              </div>

              <div className="space-y-3">
                <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                  <div className="h-1 w-1 rounded-full bg-primary" />
                  רקע תוכן (מייל)
                </Label>
                <div className="flex gap-2">
                  <Input 
                    type="color" 
                    value={template.body.styles.contentBackgroundColor || '#ffffff'}
                    onChange={(e) => updateBodyStyles({ contentBackgroundColor: e.target.value })}
                    className="w-10 p-1 h-9 rounded-xl border-border cursor-pointer shadow-sm"
                  />
                  <Input 
                    type="text" 
                    value={template.body.styles.contentBackgroundColor || '#ffffff'}
                    onChange={(e) => updateBodyStyles({ contentBackgroundColor: e.target.value })}
                    className="flex-1 h-9 rounded-xl bg-muted/20 border-border/50 text-[10px] font-mono"
                  />
                </div>
              </div>

              <div className="space-y-3 pt-2">
                <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                  <div className="h-1 w-1 rounded-full bg-primary" />
                  מרווח עליון/תחתון
                </Label>
                <div className="grid grid-cols-2 gap-3">
                   <div className="space-y-1">
                      <span className="text-[10px] text-muted-foreground font-bold">עליון</span>
                      <Input 
                        type="number" 
                        value={template.body.styles.paddingTop || 0}
                        onChange={(e) => updateBodyStyles({ paddingTop: parseInt(e.target.value) || 0 })}
                        className="h-9 rounded-xl bg-muted/20 border-border/50 text-xs"
                      />
                   </div>
                   <div className="space-y-1">
                      <span className="text-[10px] text-muted-foreground font-bold">תחתון</span>
                      <Input 
                        type="number" 
                        value={template.body.styles.paddingBottom || 0}
                        onChange={(e) => updateBodyStyles({ paddingBottom: parseInt(e.target.value) || 0 })}
                        className="h-9 rounded-xl bg-muted/20 border-border/50 text-xs"
                      />
                   </div>
                </div>
              </div>
           </div>
           
           <div className="pt-6 border-t border-border/50">
              <div className="p-4 rounded-2xl bg-primary/5 border border-primary/10">
                 <p className="text-xs text-primary font-bold leading-relaxed">
                    בחר אלמנט במשטח העבודה כדי לערוך את התוכן והעיצוב הספציפי שלו.
                 </p>
              </div>
           </div>
        </div>
      </aside>
    )
  }

  const handleContentChange = (updates: any) => {
    updateBlock(selectedBlockId, {
      content: { ...selectedBlock?.content, ...updates }
    })
  }

  const handleStyleChange = (updates: any) => {
    updateBlock(selectedBlockId, {
      styles: { ...selectedBlock?.styles, ...updates }
    })
  }

  return (
    <aside className="w-80 border-r border-border bg-card flex flex-col flex-shrink-0">
      <div className="p-6 border-b border-border/50">
        <h3 className="font-bold text-lg flex items-center gap-2">
          <Paintbrush className="h-5 w-5 text-primary" />
          עריכת אלמנט
        </h3>
        <span className="text-[10px] text-primary bg-primary/10 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider mt-1 inline-block">
          {selectedBlock?.type}
        </span>
      </div>

      <Tabs defaultValue="content" className="flex-1 flex flex-col overflow-hidden" dir="rtl">
        <TabsList className="w-full grid grid-cols-2 h-11 p-1 bg-muted/20 border-b border-border/50 rounded-none shadow-none">
          <TabsTrigger value="content" className="rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm text-xs font-bold">תוכן</TabsTrigger>
          <TabsTrigger value="style" className="rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm text-xs font-bold">עיצוב</TabsTrigger>
        </TabsList>

        <div className="flex-1 overflow-y-auto custom-scrollbar p-6">
          <TabsContent value="content" className="mt-0 space-y-6 outline-none">
            <BlockContentEditor 
              type={selectedBlock?.type!} 
              content={selectedBlock?.content} 
              onChange={handleContentChange} 
            />
          </TabsContent>

          <TabsContent value="style" className="mt-0 space-y-6 outline-none">
            <BlockStyleEditor 
              styles={selectedBlock?.styles!} 
              onChange={handleStyleChange} 
            />
          </TabsContent>
        </div>
      </Tabs>
    </aside>
  )
}

function BlockContentEditor({ type, content, onChange }: { type: string; content: any; onChange: (updates: any) => void }) {
  const { setTextEditorOpen } = useEmailBuilderStore()

  switch (type) {
    case 'text':
      return (
        <div className="space-y-4">
          <div className="space-y-2">
            <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">עריכת תוכן</Label>
            <Button 
              onClick={() => setTextEditorOpen(true)}
              className="w-full h-24 flex flex-col gap-2 rounded-2xl bg-primary/5 border-primary/20 text-primary hover:bg-primary/10 transition-all border-dashed"
              variant="outline"
            >
              <Type className="h-6 w-6" />
              <span className="font-bold">פתח עורך טקסט עשיר</span>
            </Button>
            <div className="p-4 rounded-xl bg-muted/30 border border-border/50 max-h-40 overflow-hidden relative">
               <div className="text-[10px] text-muted-foreground font-mono leading-relaxed" dangerouslySetInnerHTML={{ __html: content.html }} />
               <div className="absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-muted/30 to-transparent" />
            </div>
          </div>
        </div>
      )
    case 'button':
      return (
        <div className="space-y-4">
          <div className="space-y-2">
            <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">טקסט הכפתור</Label>
            <Input
              value={content.text}
              onChange={(e) => onChange({ text: e.target.value })}
              className="h-10 rounded-xl bg-muted/20 border-border/50 text-sm font-bold"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">קישור (URL)</Label>
            <Input
              value={content.url}
              onChange={(e) => onChange({ url: e.target.value })}
              dir="ltr"
              className="h-10 rounded-xl bg-muted/20 border-border/50 text-xs font-mono"
            />
          </div>
        </div>
      )
    case 'image':
      return (
        <div className="space-y-4">
          <div className="space-y-2">
            <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">כתובת תמונה (URL)</Label>
            <Input
              value={content.url}
              onChange={(e) => onChange({ url: e.target.value })}
              dir="ltr"
              placeholder="https://example.com/image.jpg"
              className="h-10 rounded-xl bg-muted/20 border-border/50 text-xs font-mono"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">תיאור תמונה (Alt)</Label>
            <Input
              value={content.alt}
              onChange={(e) => onChange({ alt: e.target.value })}
              className="h-10 rounded-xl bg-muted/20 border-border/50 text-sm"
            />
          </div>
        </div>
      )
    case 'spacer':
      return (
        <div className="space-y-4">
          <div className="space-y-2">
            <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">גובה (px)</Label>
            <Input
              type="number"
              value={content.height}
              onChange={(e) => onChange({ height: parseInt(e.target.value) || 0 })}
              className="h-10 rounded-xl bg-muted/20 border-border/50 text-sm"
            />
          </div>
        </div>
      )
    default:
      return <p className="text-xs text-muted-foreground text-center py-8">אין הגדרות תוכן לאלמנט זה</p>
  }
}

function BlockStyleEditor({ styles = {}, onChange }: { styles: any; onChange: (updates: any) => void }) {
  const currentStyles = styles || {}
  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">יישור טקסט</Label>
        <div className="flex gap-1 p-1 bg-muted/30 rounded-xl border border-border/50">
          <Button 
            variant={currentStyles.textAlign === 'right' ? 'secondary' : 'ghost'} 
            size="icon" 
            onClick={() => onChange({ textAlign: 'right' })}
            className="flex-1 h-8 rounded-lg"
          >
            <AlignRight className="h-4 w-4" />
          </Button>
          <Button 
            variant={currentStyles.textAlign === 'center' ? 'secondary' : 'ghost'} 
            size="icon" 
            onClick={() => onChange({ textAlign: 'center' })}
            className="flex-1 h-8 rounded-lg"
          >
            <AlignCenter className="h-4 w-4" />
          </Button>
          <Button 
            variant={currentStyles.textAlign === 'left' ? 'secondary' : 'ghost'} 
            size="icon" 
            onClick={() => onChange({ textAlign: 'left' })}
            className="flex-1 h-8 rounded-lg"
          >
            <AlignLeft className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="space-y-4">
        <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">צבעים</Label>
        <div className="grid grid-cols-2 gap-4">
           <div className="space-y-2">
              <span className="text-[10px] text-muted-foreground font-bold">רקע</span>
              <Input 
                type="color" 
                value={currentStyles.backgroundColor || 'transparent'}
                onChange={(e) => onChange({ backgroundColor: e.target.value })}
                className="w-full p-1 h-9 rounded-xl border-border cursor-pointer"
              />
           </div>
           <div className="space-y-2">
              <span className="text-[10px] text-muted-foreground font-bold">טקסט</span>
              <Input 
                type="color" 
                value={currentStyles.color || '#000000'}
                onChange={(e) => onChange({ color: e.target.value })}
                className="w-full p-1 h-9 rounded-xl border-border cursor-pointer"
              />
           </div>
        </div>
      </div>

      <div className="space-y-4 pt-4 border-t border-border/50">
        <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">מרווחים (Padding)</Label>
        <div className="grid grid-cols-2 gap-3">
           <div className="space-y-1">
              <span className="text-[10px] text-muted-foreground font-bold">עליון</span>
              <Input 
                type="number" 
                value={currentStyles.paddingTop || 0}
                onChange={(e) => onChange({ paddingTop: parseInt(e.target.value) || 0 })}
                className="h-9 rounded-xl bg-muted/20 border-border/50 text-xs"
              />
           </div>
           <div className="space-y-1">
              <span className="text-[10px] text-muted-foreground font-bold">תחתון</span>
              <Input 
                type="number" 
                value={currentStyles.paddingBottom || 0}
                onChange={(e) => onChange({ paddingBottom: parseInt(e.target.value) || 0 })}
                className="h-9 rounded-xl bg-muted/20 border-border/50 text-xs"
              />
           </div>
           <div className="space-y-1">
              <span className="text-[10px] text-muted-foreground font-bold">ימין</span>
              <Input 
                type="number" 
                value={currentStyles.paddingRight || 0}
                onChange={(e) => onChange({ paddingRight: parseInt(e.target.value) || 0 })}
                className="h-9 rounded-xl bg-muted/20 border-border/50 text-xs"
              />
           </div>
           <div className="space-y-1">
              <span className="text-[10px] text-muted-foreground font-bold">שמאל</span>
              <Input 
                type="number" 
                value={currentStyles.paddingLeft || 0}
                onChange={(e) => onChange({ paddingLeft: parseInt(e.target.value) || 0 })}
                className="h-9 rounded-xl bg-muted/20 border-border/50 text-xs"
              />
           </div>
        </div>
      </div>
    </div>
  )
}
