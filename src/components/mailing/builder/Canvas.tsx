"use client"

import React, { useState } from 'react'
import { Droppable, Draggable } from '@hello-pangea/dnd'
import { useEmailBuilderStore } from '@/lib/mailing/email-builder-store'
import { EmailBlock } from '@/types/email-builder'
import { cn } from '@/lib/utils'
import { Trash2, GripVertical, Copy, Settings2, Image as ImageIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'

import { RichTextEditor } from './RichTextEditor'

interface CanvasProps {
  viewMode: 'desktop' | 'mobile'
}

export function Canvas({ viewMode }: CanvasProps) {
  const { template, selectedBlockId, selectBlock, removeBlock, updateBlock } = useEmailBuilderStore()
  const { blocks, styles: bodyStyles } = template.body

  const handleCanvasClick = () => {
    selectBlock(null)
  }

  const handleBlockClick = (block: EmailBlock, e: React.MouseEvent) => {
    e.stopPropagation()
    selectBlock(block.id)
  }

  const handleTextChange = (id: string, html: string) => {
    updateBlock(id, {
      content: { ...blocks.find(b => b.id === id)?.content, html }
    })
  }

  return (
    <div 
      className="flex justify-center transition-all duration-300 min-h-full py-20 px-12"
      style={{ backgroundColor: bodyStyles.backgroundColor }}
      onClick={handleCanvasClick}
    >
      <div 
        className={cn(
          "shadow-2xl transition-all duration-500 relative rounded-2xl border border-border/30",
          viewMode === 'mobile' ? "w-[375px]" : "w-[600px]"
        )}
        style={{ 
          backgroundColor: bodyStyles.contentBackgroundColor || '#ffffff',
          fontFamily: bodyStyles.fontFamily,
          paddingTop: bodyStyles.paddingTop,
          paddingBottom: bodyStyles.paddingBottom
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <Droppable droppableId="canvas">
          {(provided) => (
            <div
              {...provided.droppableProps}
              ref={provided.innerRef}
              className="min-h-[600px] flex flex-col items-center pb-20"
            >
              {blocks.length === 0 ? (
                <div className="flex flex-col items-center justify-center p-20 text-center space-y-4 border-2 border-dashed border-border/50 rounded-2xl m-8 w-[calc(100%-64px)] bg-muted/5 opacity-50 group hover:opacity-100 hover:border-primary/30 transition-all duration-300">
                  <div className="h-16 w-16 rounded-full bg-primary/5 flex items-center justify-center text-primary group-hover:bg-primary/10 transition-colors">
                    <Settings2 className="h-8 w-8" />
                  </div>
                  <div className="space-y-2">
                    <h3 className="font-bold text-lg text-foreground/80 group-hover:text-primary transition-colors">התחל לעצב כאן</h3>
                    <p className="text-xs text-muted-foreground font-medium max-w-[200px] mx-auto leading-relaxed">
                      גרור אלמנטים מהסיידבר לכאן כדי לבנות את המייל שלך
                    </p>
                  </div>
                </div>
              ) : (
                blocks.map((block, index) => (
                  <Draggable key={block.id} draggableId={block.id} index={index}>
                    {(provided, snapshot) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.draggableProps}
                        className={cn(
                          "group relative w-full transition-all duration-200 outline-none",
                          selectedBlockId === block.id ? "ring-2 ring-primary ring-inset z-20" : "hover:ring-1 hover:ring-primary/40 ring-inset",
                          snapshot.isDragging && "shadow-2xl z-50 ring-2 ring-primary bg-background/50 backdrop-blur-sm"
                        )}
                      >
                        {/* Control Bar */}
                        <div className={cn(
                          "absolute -right-10 top-0 flex flex-col items-center gap-1 p-1 bg-white border border-border/50 rounded-lg shadow-sm transition-all duration-300 z-30",
                          selectedBlockId === block.id ? "opacity-100 translate-x-0" : "opacity-0 translate-x-2 pointer-events-none"
                        )}>
                          <div {...provided.dragHandleProps} className="h-7 w-7 flex items-center justify-center hover:bg-muted rounded-md transition-colors cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground">
                            <GripVertical className="h-4 w-4" />
                          </div>
                          <button 
                            className="h-7 w-7 flex items-center justify-center hover:bg-red-50 rounded-md transition-colors text-muted-foreground hover:text-red-500"
                            onClick={(e) => {
                              e.stopPropagation();
                              removeBlock(block.id);
                            }}
                            title="מחק"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>

                        {/* Block Content */}
                        <div 
                          className="w-full relative"
                          style={{
                            paddingTop: block.styles.paddingTop,
                            paddingBottom: block.styles.paddingBottom,
                            paddingLeft: block.styles.paddingLeft,
                            paddingRight: block.styles.paddingRight,
                            textAlign: block.styles.textAlign,
                            backgroundColor: block.styles.backgroundColor
                          }}
                          onClick={(e) => handleBlockClick(block, e)}
                        >
                           <BlockRenderer 
                             block={block} 
                             isSelected={selectedBlockId === block.id}
                             onTextChange={(html) => handleTextChange(block.id, html)}
                           />
                        </div>
                      </div>
                    )}
                  </Draggable>
                ))
              )}
              {provided.placeholder}
            </div>
          )}
        </Droppable>
      </div>
    </div>
  )
}

function BlockRenderer({ 
  block, 
  isSelected, 
  onTextChange 
}: { 
  block: EmailBlock, 
  isSelected: boolean,
  onTextChange: (html: string) => void 
}) {
  switch (block.type) {
    case 'text':
      if (isSelected) {
        return (
          <RichTextEditor
            value={block.content.html}
            onChange={onTextChange}
            style={{
              color: block.styles.color,
              fontSize: `${block.styles.fontSize}px`,
              fontWeight: block.styles.fontWeight,
              lineHeight: block.styles.lineHeight,
              textAlign: block.styles.textAlign as any,
            }}
          />
        )
      }
      return (
        <div 
          dangerouslySetInnerHTML={{ __html: block.content.html }}
          style={{
            color: block.styles.color,
            fontSize: `${block.styles.fontSize}px`,
            fontWeight: block.styles.fontWeight,
            lineHeight: block.styles.lineHeight,
          }}
        />
      )
    case 'button':
      return (
        <a
          href={block.content.url}
          style={{
            display: 'inline-block',
            backgroundColor: block.styles.backgroundColor || '#2563eb',
            color: block.styles.color || '#ffffff',
            padding: `${block.styles.paddingTop || 12}px ${block.styles.paddingLeft || 24}px`,
            borderRadius: `${block.styles.borderRadius || 8}px`,
            fontSize: `${block.styles.fontSize || 16}px`,
            fontWeight: 'bold',
            textDecoration: 'none',
            textAlign: 'center',
          }}
        >
          {block.content.text}
        </a>
      )
    case 'image':
      return (
        <div className="flex flex-col items-center">
          {block.content.url ? (
            <img 
              src={block.content.url} 
              alt={block.content.alt} 
              style={{ 
                maxWidth: '100%', 
                borderRadius: `${block.styles.borderRadius || 0}px` 
              }} 
            />
          ) : (
            <div className="bg-muted/30 p-12 w-full text-center rounded-2xl border-2 border-dashed border-border/50 flex flex-col items-center justify-center gap-3">
              <div className="h-12 w-12 rounded-xl bg-background flex items-center justify-center text-muted-foreground/50">
                <ImageIcon className="h-6 w-6" />
              </div>
              <p className="text-xs font-bold text-muted-foreground">הגדר תמונה בהגדרות האלמנט</p>
            </div>
          )}
        </div>
      )
    case 'divider':
      return (
        <hr 
          style={{ 
            borderTop: `${block.styles.borderWidth || 1}px ${block.styles.borderStyle || 'solid'} ${block.styles.borderColor || '#e2e8f0'}`,
            width: block.styles.width || '100%'
          }} 
        />
      )
    case 'spacer':
      return <div style={{ height: `${block.content.height || 20}px` }} />
    case 'social':
      return <div className="text-xs text-muted-foreground">Social Links Block</div>
    case 'html':
      return <div dangerouslySetInnerHTML={{ __html: block.content.html }} />
    default:
      return null
  }
}
