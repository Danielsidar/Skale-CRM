"use client"

import { memo } from "react"
import { Handle, Position, type NodeProps } from "@xyflow/react"
import { GitBranch, CheckCircle2, XCircle } from "lucide-react"
import { cn } from "@/lib/utils"
import type { AutomationNodeData } from "@/types/automation"

export const ConditionNode = memo(function ConditionNode({
  data,
  selected,
}: NodeProps) {
  const d = data as unknown as AutomationNodeData
  return (
    <div
      className={cn(
        "rounded-3xl border-2 bg-white px-4 py-6 shadow-sm min-w-[220px] transition-all relative overflow-hidden",
        selected ? "border-slate-400 ring-4 ring-slate-400/10" : "border-slate-100 hover:border-slate-200"
      )}
    >
      <div className="absolute top-0 left-0 right-0 h-1.5 bg-slate-400" />
      <Handle type="target" position={Position.Top} className="!w-4 !h-4 !bg-slate-400 !border-2 !border-white !top-[-8px]" />
      
      <div className="relative">
        <Handle
          type="source"
          position={Position.Bottom}
          id="true"
          className="!w-4 !h-4 !bg-emerald-500 !border-2 !border-white !bottom-[-32px] !left-1/4"
        />
        <div className="absolute top-[40px] left-[calc(25%-10px)] flex flex-col items-center">
          <div className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500 text-[9px] font-bold text-white border-2 border-white shadow-sm">
            V
          </div>
        </div>

        <Handle
          type="source"
          position={Position.Bottom}
          id="false"
          className="!w-4 !h-4 !bg-rose-500 !border-2 !border-white !bottom-[-32px] !left-3/4"
        />
        <div className="absolute top-[40px] left-[calc(75%-10px)] flex flex-col items-center">
          <div className="flex h-5 w-5 items-center justify-center rounded-full bg-rose-500 text-[9px] font-bold text-white border-2 border-white shadow-sm">
            X
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3 mt-1">
        <div className="rounded-2xl bg-slate-100 p-2.5 text-slate-600 shadow-inner">
          <GitBranch className="h-4 w-4" />
        </div>
        <div className="flex flex-col">
          <span className="text-[9px] font-bold uppercase tracking-widest text-slate-400">תנאי בדיקה</span>
          <span className="text-sm font-bold text-slate-800 leading-tight">{d.label || "תנאי"}</span>
        </div>
      </div>
    </div>
  )
})
