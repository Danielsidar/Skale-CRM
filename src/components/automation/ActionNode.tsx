"use client"

import { memo } from "react"
import { Handle, Position, type NodeProps } from "@xyflow/react"
import { MessageSquare, Tag, Clock, Edit, Play, Webhook } from "lucide-react"
import { cn } from "@/lib/utils"
import type { AutomationNodeData } from "@/types/automation"

const ICONS: Record<string, any> = {
  send_whatsapp: MessageSquare,
  add_tag: Tag,
  delay: Clock,
  update_field: Edit,
  send_webhook: Webhook,
}

const COLORS: Record<string, { bg: string; text: string; shadow: string }> = {
  send_whatsapp: { bg: "bg-green-500", text: "text-white", shadow: "shadow-green-200" },
  add_tag: { bg: "bg-emerald-500", text: "text-white", shadow: "shadow-emerald-200" },
  delay: { bg: "bg-slate-500", text: "text-white", shadow: "shadow-slate-200" },
  update_field: { bg: "bg-indigo-500", text: "text-white", shadow: "shadow-indigo-200" },
  send_webhook: { bg: "bg-amber-500", text: "text-white", shadow: "shadow-amber-200" },
}

export const ActionNode = memo(function ActionNode({
  data,
  selected,
}: NodeProps) {
  const d = data as unknown as AutomationNodeData
  const Icon = ICONS[d.subtype] || Play
  const colors = COLORS[d.subtype] || { bg: "bg-slate-500", text: "text-white", shadow: "shadow-slate-200" }

  return (
    <div
      className={cn(
        "rounded-2xl border-2 bg-white px-4 py-4 shadow-sm min-w-[220px] transition-all relative overflow-hidden",
        selected ? "border-blue-500 ring-4 ring-blue-500/10" : "border-slate-100 hover:border-blue-200"
      )}
    >
      <div className={cn("absolute left-0 top-0 bottom-0 w-1.5", colors.bg)} />
      <Handle type="target" position={Position.Top} className="!w-4 !h-4 !bg-blue-500 !border-2 !border-white !top-[-8px]" />
      <Handle type="source" position={Position.Bottom} className="!w-4 !h-4 !bg-blue-500 !border-2 !border-white !bottom-[-8px]" />
      <div className="flex items-center gap-3 mr-1">
        <div className={cn("rounded-xl p-2.5 shadow-sm", colors.bg, colors.text, colors.shadow)}>
          <Icon className="h-4 w-4" />
        </div>
        <div className="flex flex-col">
          <span className="text-[9px] font-bold uppercase tracking-widest text-slate-400">פעולה</span>
          <span className="text-sm font-bold text-slate-800 leading-tight">{d.label || d.subtype}</span>
        </div>
      </div>
    </div>
  )
})
