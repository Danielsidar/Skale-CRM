"use client"

import React, { forwardRef, useEffect, useImperativeHandle, useState } from 'react'
import { cn } from '@/lib/utils'
import { User, Mail, Phone, Hash, Tag, Briefcase } from 'lucide-react'

export const MENTION_VARIABLES = [
  { id: 'contact.full_name', label: 'שם מלא', category: 'איש קשר', icon: User },
  { id: 'contact.first_name', label: 'שם פרטי', category: 'איש קשר', icon: User },
  { id: 'contact.email', label: 'אימייל', category: 'איש קשר', icon: Mail },
  { id: 'contact.phone', label: 'טלפון', category: 'איש קשר', icon: Phone },
  { id: 'deal.title', label: 'שם העסקה', category: 'עסקה', icon: Briefcase },
  { id: 'deal.value', label: 'ערך העסקה', category: 'עסקה', icon: Hash },
  { id: 'business.name', label: 'שם העסק', category: 'עסק', icon: Tag },
  { id: 'unsubscribe_link', label: 'קישור להסרה', category: 'מערכת', icon: Mail },
]

export const MentionList = forwardRef((props: any, ref) => {
  const [selectedIndex, setSelectedIndex] = useState(0)

  const selectItem = (index: number) => {
    const item = props.items[index]

    if (item) {
      props.command({ id: item.id, label: item.label })
    }
  }

  const upHandler = () => {
    setSelectedIndex(((selectedIndex + props.items.length - 1) % props.items.length))
  }

  const downHandler = () => {
    setSelectedIndex(((selectedIndex + 1) % props.items.length))
  }

  const enterHandler = () => {
    selectItem(selectedIndex)
  }

  useEffect(() => setSelectedIndex(0), [props.items])

  useImperativeHandle(ref, () => ({
    onKeyDown: ({ event }: { event: KeyboardEvent }) => {
      if (event.key === 'ArrowUp') {
        upHandler()
        return true
      }

      if (event.key === 'ArrowDown') {
        downHandler()
        return true
      }

      if (event.key === 'Enter') {
        enterHandler()
        return true
      }

      return false
    },
  }))

  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-[0_10px_30px_rgba(0,0,0,0.1)] overflow-hidden min-w-[200px] p-1.5 animate-in fade-in zoom-in duration-100 flex flex-col gap-0.5">
      <div className="px-2 py-1 mb-1 border-b border-slate-50">
        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">משתנים דינמיים</span>
      </div>
      {props.items.length ? (
        <div className="flex flex-col gap-0.5">
          {props.items.map((item: any, index: number) => (
            <button
              key={item.id}
              onMouseDown={(e) => {
                e.preventDefault()
                e.stopPropagation()
                selectItem(index)
              }}
              className={cn(
                "w-full flex items-center gap-3 px-2 py-1.5 text-right rounded-lg transition-all duration-200",
                index === selectedIndex 
                  ? "bg-slate-900 text-white" 
                  : "hover:bg-slate-50 text-slate-700"
              )}
            >
              <div className={cn(
                "h-7 w-7 flex items-center justify-center rounded-md shrink-0",
                index === selectedIndex ? "bg-white/20" : "bg-slate-100"
              )}>
                <item.icon className={cn("h-4 w-4", index === selectedIndex ? "text-white" : "text-slate-500")} />
              </div>
              <div className="flex flex-col items-start min-w-0">
                <span className="font-bold text-[13px] leading-tight truncate w-full">{item.label}</span>
                <span className={cn(
                  "text-[10px] font-medium leading-none",
                  index === selectedIndex ? "text-white/60" : "text-slate-400"
                )}>{item.category}</span>
              </div>
            </button>
          ))}
        </div>
      ) : (
        <div className="px-3 py-4 text-center text-xs text-slate-400 italic">לא נמצאו משתנים...</div>
      )}
    </div>
  )
})

MentionList.displayName = 'MentionList'
