"use client"

import React from 'react'
import { useEmailBuilderStore } from '@/lib/mailing/email-builder-store'
import { EmailBlockType } from '@/types/email-builder'
import { 
  Type, 
  Image as ImageIcon, 
  Square, 
  Minus, 
  Maximize, 
  Share2, 
  Code,
  Layout,
  Plus
} from 'lucide-react'
import { Button } from '@/components/ui/button'

const BLOCKS: { type: EmailBlockType; label: string; icon: any; description: string }[] = [
  { 
    type: 'text', 
    label: 'טקסט', 
    icon: Type,
    description: 'הוספת פסקה או כותרת'
  },
  { 
    type: 'button', 
    label: 'כפתור', 
    icon: Square,
    description: 'קריאה לפעולה (CTA)'
  },
  { 
    type: 'image', 
    label: 'תמונה', 
    icon: ImageIcon,
    description: 'העלאת תמונה או לוגו'
  },
  { 
    type: 'divider', 
    label: 'קו מפריד', 
    icon: Minus,
    description: 'הפרדה בין מקטעים'
  },
  { 
    type: 'spacer', 
    label: 'מרווח', 
    icon: Maximize,
    description: 'הוספת שטח לבן'
  },
  { 
    type: 'social', 
    label: 'רשתות חברתיות', 
    icon: Share2,
    description: 'קישורים לפרופילים'
  },
  { 
    type: 'html', 
    label: 'קוד HTML', 
    icon: Code,
    description: 'אלמנט מותאם אישית'
  },
]

export function Sidebar() {
  const { addBlock } = useEmailBuilderStore()

  return (
    <aside className="w-80 border-l border-border bg-card flex flex-col flex-shrink-0">
      <div className="p-6 border-b border-border/50">
        <h3 className="font-bold text-lg flex items-center gap-2">
          <Layout className="h-5 w-5 text-primary" />
          ספריית אלמנטים
        </h3>
        <p className="text-xs text-muted-foreground mt-1 font-medium">גרור אלמנטים למשטח העבודה</p>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
        <div className="grid grid-cols-2 gap-3">
          {BLOCKS.map((block) => (
            <button
              key={block.type}
              onClick={() => addBlock(block.type)}
              className="flex flex-col items-center justify-center p-4 rounded-2xl border border-border/50 bg-muted/20 hover:bg-primary/5 hover:border-primary/30 transition-all duration-300 group gap-3"
            >
              <div className="h-10 w-10 rounded-xl bg-background flex items-center justify-center text-muted-foreground group-hover:text-primary group-hover:bg-primary/10 transition-colors shadow-sm">
                <block.icon className="h-5 w-5" />
              </div>
              <span className="text-xs font-bold text-foreground/80 group-hover:text-primary transition-colors">
                {block.label}
              </span>
            </button>
          ))}
        </div>

        <div className="mt-8 pt-8 border-t border-border/50">
          <h4 className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-4">תבניות מוכנות</h4>
          <div className="space-y-3">
             <div className="p-4 rounded-2xl border border-dashed border-border flex flex-col items-center justify-center text-center gap-2 bg-muted/10 opacity-60">
                <Plus className="h-5 w-5 text-muted-foreground/50" />
                <span className="text-xs font-bold text-muted-foreground">בקרוב: תבניות מוכנות</span>
             </div>
          </div>
        </div>
      </div>
    </aside>
  )
}
