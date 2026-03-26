"use client"

import { memo } from "react"
import { Handle, Position, type NodeProps } from "@xyflow/react"
import { MessageSquare, Tag, X, Clock, Webhook, ArrowRightLeft, Play, PenLine, UserCog } from "lucide-react"
import { cn } from "@/lib/utils"
import type { AutomationNodeData } from "@/types/automation"
import { ACTION_ENTITY_TARGET } from "@/types/automation"

const ICONS: Record<string, React.ElementType> = {
  send_whatsapp: MessageSquare,
  add_tag: Tag,
  remove_tag: X,
  update_lead_field: PenLine,
  update_contact_field: UserCog,
  delay: Clock,
  send_webhook: Webhook,
  move_to_stage: ArrowRightLeft,
}

const COLORS: Record<string, { bar: string; icon: string; badge: string }> = {
  send_whatsapp:      { bar: "bg-green-500",   icon: "bg-green-500 text-white",   badge: "bg-green-100 text-green-700" },
  add_tag:            { bar: "bg-emerald-500", icon: "bg-emerald-500 text-white", badge: "bg-emerald-100 text-emerald-700" },
  remove_tag:         { bar: "bg-rose-400",    icon: "bg-rose-400 text-white",    badge: "bg-rose-100 text-rose-700" },
  update_lead_field:  { bar: "bg-blue-500",    icon: "bg-blue-500 text-white",    badge: "bg-blue-100 text-blue-700" },
  update_contact_field: { bar: "bg-purple-500", icon: "bg-purple-500 text-white", badge: "bg-purple-100 text-purple-700" },
  delay:              { bar: "bg-slate-500",   icon: "bg-slate-500 text-white",   badge: "bg-slate-100 text-slate-600" },
  send_webhook:       { bar: "bg-amber-500",   icon: "bg-amber-500 text-white",   badge: "bg-amber-100 text-amber-700" },
  move_to_stage:      { bar: "bg-indigo-500",  icon: "bg-indigo-500 text-white",  badge: "bg-indigo-100 text-indigo-700" },
}

const DEFAULT_COLOR = { bar: "bg-slate-500", icon: "bg-slate-500 text-white", badge: "bg-slate-100 text-slate-600" }

export const ActionNode = memo(function ActionNode({ data, selected }: NodeProps) {
  const d = data as unknown as AutomationNodeData
  const Icon = ICONS[d.subtype] || Play
  const colors = COLORS[d.subtype] || DEFAULT_COLOR
  const entityTarget = ACTION_ENTITY_TARGET[d.subtype]

  return (
    <div
      className={cn(
        "rounded-2xl border-2 bg-white px-4 py-4 shadow-sm min-w-[220px] transition-all relative",
        selected ? "border-blue-500 ring-4 ring-blue-500/10" : "border-slate-100 hover:border-blue-200"
      )}
    >
      <div className={cn("absolute left-0 top-0 bottom-0 w-1.5 rounded-l-2xl", colors.bar)} />
      <Handle type="target" position={Position.Top} className="!w-4 !h-4 !bg-blue-500 !border-2 !border-white" style={{ top: -8 }} />
      <Handle type="source" position={Position.Bottom} className="!w-4 !h-4 !bg-blue-500 !border-2 !border-white" style={{ bottom: -8 }} />

      <div className="flex items-center gap-3 mr-1">
        <div className={cn("rounded-xl p-2.5 shadow-sm shrink-0", colors.icon)}>
          <Icon className="h-4 w-4" />
        </div>
        <div className="flex flex-col min-w-0">
          <span className="text-[9px] font-bold uppercase tracking-widest text-slate-400">פעולה</span>
          <span className="text-sm font-bold text-slate-800 leading-tight truncate">{d.label || d.subtype}</span>
          {entityTarget && (
            <span className={cn("text-[9px] font-semibold px-1.5 py-0.5 rounded-full mt-1 self-start", colors.badge)}>
              {entityTarget}
            </span>
          )}
        </div>
      </div>
    </div>
  )
})
