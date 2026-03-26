"use client"

import { memo } from "react"
import { Handle, Position, type NodeProps } from "@xyflow/react"
import { Zap, Tag, UserPlus, GitBranch, Trophy, XCircle, UserCheck } from "lucide-react"
import { cn } from "@/lib/utils"
import type { AutomationNodeData } from "@/types/automation"

const ICONS: Record<string, React.ElementType> = {
  "lead.created": UserPlus,
  "lead.stage_entered": GitBranch,
  "lead.won": Trophy,
  "lead.lost": XCircle,
  "contact.created": UserCheck,
  "contact.tag_added": Tag,
}

export const TriggerNode = memo(function TriggerNode({ data, selected }: NodeProps) {
  const d = data as unknown as AutomationNodeData
  const Icon = ICONS[d.subtype] || Zap

  return (
    <div
      className={cn(
        "rounded-full border-2 bg-white px-6 py-3 shadow-sm min-w-[240px] transition-all",
        selected ? "border-amber-500 ring-4 ring-amber-500/10" : "border-slate-100 hover:border-amber-200"
      )}
    >
      <Handle type="source" position={Position.Bottom} className="!w-4 !h-4 !bg-amber-500 !border-2 !border-white !bottom-[-6px]" />
      <div className="flex items-center gap-3">
        <div className="rounded-full bg-amber-500 p-2 text-white shadow-sm shadow-amber-200">
          <Icon className="h-4 w-4" />
        </div>
        <div className="flex flex-col">
          <span className="text-[9px] font-bold uppercase tracking-widest text-amber-600/70">התחלה</span>
          <span className="text-sm font-bold text-slate-800 leading-tight">{d.label || d.subtype}</span>
        </div>
      </div>
    </div>
  )
})
