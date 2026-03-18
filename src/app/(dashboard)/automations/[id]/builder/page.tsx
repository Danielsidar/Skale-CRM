"use client"

import { useCallback, useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  addEdge,
  useNodesState,
  useEdgesState,
  type Connection,
  type Edge,
  type Node,
  type OnNodesChange,
  type OnEdgesChange,
  ReactFlowProvider,
  Panel,
} from "@xyflow/react"
import "@xyflow/react/dist/style.css"
import { createClient } from "@/lib/supabase/client"
import { useBusiness } from "@/lib/hooks/useBusiness"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { TriggerNode, ConditionNode, ActionNode, NodeConfigPanel, type PipelineOption, type StageOption } from "@/components/automation"
import type { AutomationNodeData } from "@/types/automation"
import { TRIGGER_LABELS, ACTION_LABELS } from "@/types/automation"
import { ArrowLeft, Save, Play, Plus } from "lucide-react"
import Link from "next/link"
import { toast } from "sonner"
import type { Database } from "@/types/database.types"

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { ChevronDown, ChevronUp } from "lucide-react"

type Automation = Database["public"]["Tables"]["automations"]["Row"]
type AutomationNode = Database["public"]["Tables"]["automation_nodes"]["Row"]
type AutomationEdge = Database["public"]["Tables"]["automation_edges"]["Row"]

const nodeTypes = {
  trigger: TriggerNode,
  condition: ConditionNode,
  action: ActionNode,
}

function flowNodeType(type: string): "trigger" | "condition" | "action" {
  if (type === "trigger" || type === "condition" || type === "action") return type
  return "action"
}

function BuilderInner() {
  const params = useParams()
  const router = useRouter()
  const { businessId } = useBusiness()
  const automationId = params.id as string
  const supabase = createClient()

  const [automation, setAutomation] = useState<Automation | null>(null)
  const [name, setName] = useState("")
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([])
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([])
  const [selectedNode, setSelectedNode] = useState<Node | null>(null)
  const [pipelines, setPipelines] = useState<PipelineOption[]>([])
  const [stages, setStages] = useState<StageOption[]>([])
  const [whatsappCredentials, setWhatsappCredentials] = useState<{ id: string, name: string, provider: "official" | "green_api" }[]>([])
  
  // Sidebar accordion state
  const [expandedSections, setExpandedSections] = useState({
    triggers: true,
    actions: true,
    conditions: true
  })

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }))
  }

  const load = useCallback(async () => {
    if (!businessId || !automationId) return
    const { data: auto, error: autoErr } = await supabase
      .from("automations")
      .select("*")
      .eq("id", automationId)
      .eq("business_id", businessId)
      .single()
    if (autoErr || !auto) {
      setLoading(false)
      return
    }
    setAutomation(auto)
    setName(auto.name)

    const { data: pipelinesData } = await supabase
      .from("pipelines")
      .select("id, name")
      .eq("business_id", businessId)
      .order("name")
    setPipelines((pipelinesData ?? []).map((p) => ({ id: p.id, name: p.name })))

    const pipelineIds = (pipelinesData ?? []).map((p) => p.id)
    const { data: stagesData } = pipelineIds.length
      ? await supabase
          .from("stages")
          .select("id, pipeline_id, name")
          .in("pipeline_id", pipelineIds)
          .order("position")
      : { data: [] as { id: string; pipeline_id: string; name: string }[] }
    setStages((stagesData ?? []).map((s) => ({ id: s.id, pipeline_id: s.pipeline_id, name: s.name })))

    const { data: whatsappCredsData } = await supabase
      .from("whatsapp_credentials")
      .select("id, name, provider")
      .eq("business_id", businessId)
      .order("name")
    setWhatsappCredentials(whatsappCredsData as any ?? [])

    const { data: nodesData } = await supabase
      .from("automation_nodes")
      .select("*")
      .eq("automation_id", automationId)
    const { data: edgesData } = await supabase
      .from("automation_edges")
      .select("*")
      .eq("automation_id", automationId)

    const flowNodes: Node[] = (nodesData ?? []).map((n) => ({
      id: n.id,
      type: flowNodeType(n.type),
      position: { x: n.position_x, y: n.position_y },
      data: {
        type: n.type as "trigger" | "condition" | "action",
        subtype: n.subtype,
        label:
          n.type === "trigger"
            ? TRIGGER_LABELS[n.subtype] ?? n.subtype
            : n.type === "action"
              ? ACTION_LABELS[n.subtype] ?? n.subtype
              : n.subtype === "condition.tag" 
                ? "תגית קיימת / לא קיימת"
                : n.subtype === "condition.field"
                  ? "ערך שדה שווה ל..."
                  : "תנאי",
        config: (n.config as Record<string, unknown>) ?? {},
        nodeId: n.id,
      },
    }))

    const flowEdges: Edge[] = (edgesData ?? []).map((e) => ({
      id: e.id,
      source: e.from_node_id,
      target: e.to_node_id,
      sourceHandle: e.branch_label ?? undefined,
    }))

    setNodes(flowNodes)
    setEdges(flowEdges)
    setLoading(false)
  }, [automationId, businessId, setEdges, setNodes, supabase])

  useEffect(() => {
    load()
  }, [load])

  const onConnect = useCallback(
    (connection: Connection) => {
      setEdges((eds) => addEdge(connection, eds))
    },
    [setEdges]
  )

  const onNodeClick = useCallback((_e: React.MouseEvent, node: Node) => {
    setSelectedNode(node)
  }, [])

  const onPaneClick = useCallback(() => {
    setSelectedNode(null)
  }, [])

  const onConfigChange = useCallback(
    (nodeId: string, data: Partial<AutomationNodeData>) => {
      setNodes((nds) =>
        nds.map((n) =>
          n.id === nodeId
            ? { ...n, data: { ...n.data, ...data } }
            : n
        )
      )
      setSelectedNode((prev) =>
        prev?.id === nodeId ? { ...prev, data: { ...prev.data, ...data } } : prev
      )
    },
    [setNodes]
  )

  const addNode = useCallback(
    (type: "trigger" | "condition" | "action", subtypeInput?: string) => {
      const id = crypto.randomUUID()
      let subtype = subtypeInput
      if (!subtype) {
        if (type === "trigger") subtype = "lead.created"
        else if (type === "condition") subtype = "condition.tag"
        else subtype = "send_whatsapp"
      }
      
      let label = ""
      if (type === "trigger") label = TRIGGER_LABELS[subtype] ?? subtype
      else if (type === "action") label = ACTION_LABELS[subtype] ?? subtype
      else if (subtype === "condition.tag") label = "תגית קיימת / לא קיימת"
      else if (subtype === "condition.field") label = "ערך שדה שווה ל..."
      else label = "תנאי"

      setNodes((nds) => [
        ...nds,
        {
          id,
          type,
          position: { x: 250, y: 100 + nds.length * 150 },
          data: {
            type,
            subtype,
            label,
            config: {},
            nodeId: id,
          },
        },
      ])
    },
    [setNodes]
  )

  const save = useCallback(async () => {
    if (!businessId || !automationId) return
    setSaving(true)
    try {
      await supabase
        .from("automations")
        .update({ name, updated_at: new Date().toISOString() })
        .eq("id", automationId)
        .eq("business_id", businessId)

      const existingNodeIds = new Set(
        (
          await supabase
            .from("automation_nodes")
            .select("id")
            .eq("automation_id", automationId)
        ).data?.map((r) => r.id) ?? []
      )

      for (const n of nodes) {
        const data = n.data as unknown as AutomationNodeData
        const payload = {
          id: n.id,
          automation_id: automationId,
          type: data.type,
          subtype: data.subtype,
          config: data.config ?? {},
          position_x: n.position.x,
          position_y: n.position.y,
        }
        if (existingNodeIds.has(n.id)) {
          await supabase
            .from("automation_nodes")
            .update({
              type: payload.type,
              subtype: payload.subtype,
              config: payload.config,
              position_x: payload.position_x,
              position_y: payload.position_y,
            })
            .eq("id", n.id)
        } else {
          await supabase.from("automation_nodes").insert(payload)
          existingNodeIds.add(n.id)
        }
      }

      const toDelete = [...existingNodeIds].filter(
        (id) => !nodes.some((n) => n.id === id)
      )
      if (toDelete.length) {
        await supabase
          .from("automation_nodes")
          .delete()
          .in("id", toDelete)
      }

      await supabase.from("automation_edges").delete().eq("automation_id", automationId)

      for (const e of edges) {
        await supabase.from("automation_edges").insert({
          automation_id: automationId,
          from_node_id: e.source,
          to_node_id: e.target,
          branch_label: e.sourceHandle ?? null,
        })
      }

      toast.success("נשמר בהצלחה")
    } catch (err) {
      toast.error("שגיאה בשמירה")
    }
    setSaving(false)
  }, [automationId, businessId, edges, name, nodes, supabase])

  const activate = useCallback(async () => {
    const triggers = nodes.filter((n) => n.data.type === "trigger")
    if (triggers.length !== 1) {
      toast.error("חייב להיות בדיוק טריגר אחד")
      return
    }
    const triggerId = triggers[0].id
    const hasIncoming = edges.some((e) => e.target === triggerId)
    if (hasIncoming) {
      toast.error("הטריגר לא יכול לקבל חיבורים נכנסים")
      return
    }
    if (!businessId || !automationId) return
    await supabase
      .from("automations")
      .update({ status: "active" })
      .eq("id", automationId)
      .eq("business_id", businessId)
    setAutomation((a) => (a ? { ...a, status: "active" } : null))
    toast.success("האוטומציה פעילה")
  }, [automationId, businessId, edges, nodes, supabase])

  if (!businessId) return null
  if (loading) {
    return (
      <div className="flex h-[70vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    )
  }
  if (!automation) {
    return (
      <div className="flex h-[70vh] items-center justify-center">
        <p className="text-muted-foreground">אוטומציה לא נמצאה</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] -m-6">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-3 border-b bg-white z-10">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild className="rounded-full">
            <Link href="/automations">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <div className="flex flex-col">
            <input 
              value={name} 
              onChange={(e) => setName(e.target.value)} 
              className="text-lg font-bold bg-transparent border-none focus:ring-0 p-0 w-64"
              placeholder="שם האוטומציה..."
            />
            <span className="text-xs text-slate-400 font-medium">
              {automation.status === 'active' ? '● פעילה' : '○ טיוטה'}
            </span>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={save} disabled={saving} className="bg-white border-slate-200 shadow-sm">
            <Save className="h-4 w-4 ml-2" />
            שמור שינויים
          </Button>
          {automation.status === "draft" && (
            <Button onClick={activate} className="bg-blue-600 hover:bg-blue-700 shadow-sm shadow-blue-100">
              <Play className="h-4 w-4 ml-2 fill-current" />
              הפעל אוטומציה
            </Button>
          )}
        </div>
      </div>

      <div className="flex flex-1 gap-0 overflow-hidden">
        {/* Left Sidebar: Components */}
        <div className="flex w-64 flex-col gap-4 border-r bg-slate-50/50 p-4 overflow-y-auto">
          <section className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <button 
              onClick={() => toggleSection('triggers')}
              className="w-full flex items-center justify-between px-4 py-3 bg-slate-50/50 border-b border-slate-100 hover:bg-slate-100/50 transition-colors"
            >
              <h4 className="text-[11px] font-bold uppercase tracking-[0.1em] text-slate-500">🔔 טריגרים</h4>
              {expandedSections.triggers ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>
            {expandedSections.triggers && (
              <div className="p-3 grid gap-2">
                <Button variant="ghost" className="h-auto py-2.5 px-3 justify-start border border-slate-100 hover:border-amber-400 hover:bg-amber-50 group rounded-lg" onClick={() => addNode("trigger", "lead.created")}>
                  <div className="bg-amber-100 text-amber-600 p-1.5 rounded-md mr-0 ml-3 group-hover:bg-amber-500 group-hover:text-white transition-colors">
                    <Plus className="h-3.5 w-3.5" />
                  </div>
                  <span className="font-bold text-slate-700 text-xs">ליד חדש</span>
                </Button>
                <Button variant="ghost" className="h-auto py-2.5 px-3 justify-start border border-slate-100 hover:border-amber-400 hover:bg-amber-50 group rounded-lg" onClick={() => addNode("trigger", "contact.tag_added")}>
                  <div className="bg-amber-100 text-amber-600 p-1.5 rounded-md mr-0 ml-3 group-hover:bg-amber-500 group-hover:text-white transition-colors">
                    <Plus className="h-3.5 w-3.5" />
                  </div>
                  <span className="font-bold text-slate-700 text-xs">התווספה תגית</span>
                </Button>
                <Button variant="ghost" className="h-auto py-2.5 px-3 justify-start border border-slate-100 hover:border-amber-400 hover:bg-amber-50 group rounded-lg" onClick={() => addNode("trigger", "webhook.incoming")}>
                  <div className="bg-amber-100 text-amber-600 p-1.5 rounded-md mr-0 ml-3 group-hover:bg-amber-500 group-hover:text-white transition-colors">
                    <Plus className="h-3.5 w-3.5" />
                  </div>
                  <span className="font-bold text-slate-700 text-xs">Webhook נכנס</span>
                </Button>
              </div>
            )}
          </section>

          <section className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <button 
              onClick={() => toggleSection('actions')}
              className="w-full flex items-center justify-between px-4 py-3 bg-slate-50/50 border-b border-slate-100 hover:bg-slate-100/50 transition-colors"
            >
              <h4 className="text-[11px] font-bold uppercase tracking-[0.1em] text-slate-500">⚙️ פעולות</h4>
              {expandedSections.actions ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>
            {expandedSections.actions && (
              <div className="p-3 grid gap-2">
                <Button variant="ghost" className="h-auto py-2.5 px-3 justify-start border border-slate-100 hover:border-blue-400 hover:bg-blue-50 group rounded-lg" onClick={() => addNode("action", "send_whatsapp")}>
                  <div className="bg-blue-100 text-blue-600 p-1.5 rounded-md mr-0 ml-3 group-hover:bg-blue-500 group-hover:text-white transition-colors">
                    <Plus className="h-3.5 w-3.5" />
                  </div>
                  <span className="font-bold text-slate-700 text-xs">שליחת וואטסאפ</span>
                </Button>
                <Button variant="ghost" className="h-auto py-2.5 px-3 justify-start border border-slate-100 hover:border-emerald-400 hover:bg-emerald-50 group rounded-lg" onClick={() => addNode("action", "add_tag")}>
                  <div className="bg-emerald-100 text-emerald-600 p-1.5 rounded-md mr-0 ml-3 group-hover:bg-emerald-500 group-hover:text-white transition-colors">
                    <Plus className="h-3.5 w-3.5" />
                  </div>
                  <span className="font-bold text-slate-700 text-xs">הוספת תגית</span>
                </Button>
                <Button variant="ghost" className="h-auto py-2.5 px-3 justify-start border border-slate-100 hover:border-slate-400 hover:bg-slate-100 group rounded-lg" onClick={() => addNode("action", "delay")}>
                  <div className="bg-slate-100 text-slate-600 p-1.5 rounded-md mr-0 ml-3 group-hover:bg-slate-500 group-hover:text-white transition-colors">
                    <Plus className="h-3.5 w-3.5" />
                  </div>
                  <span className="font-bold text-slate-700 text-xs">השהייה (Delay)</span>
                </Button>
                <Button variant="ghost" className="h-auto py-2.5 px-3 justify-start border border-slate-100 hover:border-indigo-400 hover:bg-indigo-50 group rounded-lg" onClick={() => addNode("action", "update_field")}>
                  <div className="bg-indigo-100 text-indigo-600 p-1.5 rounded-md mr-0 ml-3 group-hover:bg-indigo-500 group-hover:text-white transition-colors">
                    <Plus className="h-3.5 w-3.5" />
                  </div>
                  <span className="font-bold text-slate-700 text-xs">עדכון שדה</span>
                </Button>
              </div>
            )}
          </section>

          <section className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <button 
              onClick={() => toggleSection('conditions')}
              className="w-full flex items-center justify-between px-4 py-3 bg-slate-50/50 border-b border-slate-100 hover:bg-slate-100/50 transition-colors"
            >
              <h4 className="text-[11px] font-bold uppercase tracking-[0.1em] text-slate-500">🔎 תנאים</h4>
              {expandedSections.conditions ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>
            {expandedSections.conditions && (
              <div className="p-3 grid gap-2">
                <Button variant="ghost" className="h-auto py-2.5 px-3 justify-start border border-slate-100 hover:border-slate-400 hover:bg-slate-100 group rounded-lg" onClick={() => addNode("condition", "condition.tag")}>
                  <div className="bg-slate-100 text-slate-400 p-1.5 rounded-md mr-0 ml-3 group-hover:bg-slate-500 group-hover:text-white transition-colors">
                    <Plus className="h-3.5 w-3.5" />
                  </div>
                  <span className="font-bold text-slate-700 text-xs">אם יש / אין תגית</span>
                </Button>
                <Button variant="ghost" className="h-auto py-2.5 px-3 justify-start border border-slate-100 hover:border-slate-400 hover:bg-slate-100 group rounded-lg" onClick={() => addNode("condition", "condition.field")}>
                  <div className="bg-slate-100 text-slate-400 p-1.5 rounded-md mr-0 ml-3 group-hover:bg-slate-500 group-hover:text-white transition-colors">
                    <Plus className="h-3.5 w-3.5" />
                  </div>
                  <span className="font-bold text-slate-700 text-xs">אם שדה שווה ל...</span>
                </Button>
              </div>
            )}
          </section>
        </div>

        {/* Canvas Area */}
        <div className="flex-1 bg-slate-50 relative">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange as OnNodesChange}
            onEdgesChange={onEdgesChange as OnEdgesChange}
            onConnect={onConnect}
            onNodeClick={onNodeClick}
            onPaneClick={onPaneClick}
            nodeTypes={nodeTypes}
            fitView
            className="bg-background/0"
          >
            <Background color="#cbd5e1" gap={20} />
            <Controls position="bottom-right" className="bg-white border-slate-200 shadow-sm rounded-lg overflow-hidden" />
          </ReactFlow>

          {/* Node Config Popup */}
          <Dialog open={!!selectedNode} onOpenChange={(open) => !open && setSelectedNode(null)}>
            <DialogContent className="sm:max-w-md p-6 overflow-y-auto max-h-[90vh]">
              <DialogHeader>
                <DialogTitle className="text-right">הגדרות רכיב</DialogTitle>
              </DialogHeader>
              <div className="mt-4">
                <NodeConfigPanel 
                  node={selectedNode} 
                  onConfigChange={onConfigChange} 
                  pipelines={pipelines} 
                  stages={stages} 
                  whatsappCredentials={whatsappCredentials}
                />
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>
    </div>
  )
}

export default function BuilderPage() {
  return (
    <ReactFlowProvider>
      <BuilderInner />
    </ReactFlowProvider>
  )
}
