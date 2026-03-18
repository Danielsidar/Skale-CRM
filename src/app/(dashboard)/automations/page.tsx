"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { useBusiness } from "@/lib/hooks/useBusiness"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs"
import { 
  Plus, 
  Zap, 
  Play, 
  Pause, 
  History, 
  LayoutGrid, 
  List, 
  Trash2,
  MoreVertical,
  Copy,
  FolderPlus,
  Folder,
  FolderOpen,
  MoveHorizontal
} from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import Link from "next/link"
import type { Database } from "@/types/database.types"
import { toast } from "sonner"

type Automation = Database["public"]["Tables"]["automations"]["Row"]
type AutomationRun = Database["public"]["Tables"]["automation_runs"]["Row"]
type Folder = Database["public"]["Tables"]["automation_folders"]["Row"]

export default function AutomationsListPage() {
  const { businessId } = useBusiness()
  const [automations, setAutomations] = useState<Automation[]>([])
  const [runs, setRuns] = useState<AutomationRun[]>([])
  const [folders, setFolders] = useState<Folder[]>([])
  const [loading, setLoading] = useState(true)
  const [viewMode, setViewMode] = useState<"grid" | "table">("grid")
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [selectedFolderId, setSelectedFolderId] = useState<string | "all" | "none">("all")
  
  // Folder Dialogs State
  const [isFolderDialogOpen, setIsFolderDialogOpen] = useState(false)
  const [newFolderName, setNewFolderName] = useState("")
  const [editingFolder, setEditingFolder] = useState<Folder | null>(null)
  
  const supabase = createClient()

  useEffect(() => {
    if (!businessId) return
    loadData()
  }, [businessId, supabase])

  async function loadData() {
    setLoading(true)
    const { data: autoData } = await supabase
      .from("automations")
      .select("*")
      .eq("business_id", businessId!)
      .order("updated_at", { ascending: false })
    setAutomations(autoData ?? [])

    const { data: folderData } = await supabase
      .from("automation_folders")
      .select("*")
      .eq("business_id", businessId!)
      .order("name", { ascending: true })
    setFolders(folderData ?? [])

    const { data: runsData } = await supabase
      .from("automation_runs")
      .select("*")
      .eq("business_id", businessId!)
      .order("started_at", { ascending: false })
      .limit(50)
    setRuns(runsData ?? [])
    setLoading(false)
  }

  const handleCreateFolder = async () => {
    if (!newFolderName.trim() || !businessId) return
    
    if (editingFolder) {
      const { error } = await supabase
        .from("automation_folders")
        .update({ name: newFolderName })
        .eq("id", editingFolder.id)
      
      if (error) toast.error("שגיאה בעדכון התיקייה")
      else {
        toast.success("התיקייה עודכנה")
        loadData()
      }
    } else {
      const { error } = await supabase
        .from("automation_folders")
        .insert({
          business_id: businessId,
          name: newFolderName
        })
      
      if (error) toast.error("שגיאה ביצירת התיקייה")
      else {
        toast.success("התיקייה נוצרה")
        loadData()
      }
    }
    
    setIsFolderDialogOpen(false)
    setNewFolderName("")
    setEditingFolder(null)
  }

  const deleteFolder = async (folder: Folder) => {
    if (!confirm(`האם אתה בטוח שברצונך למחוק את התיקייה "${folder.name}"? האוטומציות שבתוכה לא יימחקו.`)) return
    
    const { error } = await supabase.from("automation_folders").delete().eq("id", folder.id)
    if (error) toast.error("שגיאה במחיקת התיקייה")
    else {
      toast.success("התיקייה נמחקה")
      if (selectedFolderId === folder.id) setSelectedFolderId("all")
      loadData()
    }
  }

  const moveAutomationToFolder = async (automationId: string, folderId: string | null) => {
    const { error } = await supabase
      .from("automations")
      .update({ folder_id: folderId })
      .eq("id", automationId)
    
    if (error) toast.error("שגיאה בהעברת האוטומציה")
    else {
      setAutomations(prev => prev.map(a => a.id === automationId ? { ...a, folder_id: folderId } : a))
      toast.success("האוטומציה הועברה")
    }
  }

  const moveSelectedToFolder = async (folderId: string | null) => {
    if (selectedIds.length === 0) return
    
    const { error } = await supabase
      .from("automations")
      .update({ folder_id: folderId })
      .in("id", selectedIds)
    
    if (error) toast.error("שגיאה בהעברה מרוכזת")
    else {
      setAutomations(prev => prev.map(a => selectedIds.includes(a.id) ? { ...a, folder_id: folderId } : a))
      setSelectedIds([])
      toast.success("האוטומציות הועברו")
    }
  }

  const toggleStatus = async (a: Automation) => {
    if (!businessId) return
    const next = a.status === "active" ? "paused" : "active"
    const { error } = await supabase.from("automations").update({ status: next }).eq("id", a.id)
    if (error) {
      toast.error("שגיאה בעדכון הסטטוס")
      return
    }
    setAutomations((prev) =>
      prev.map((x) => (x.id === a.id ? { ...x, status: next } : x))
    )
    toast.success(`האוטומציה ${next === "active" ? "הופעלה" : "הושהתה"} בהצלחה`)
  }

  const duplicate = async (a: Automation) => {
    if (!businessId) return
    const { data: nodes } = await supabase
      .from("automation_nodes")
      .select("*")
      .eq("automation_id", a.id)
    const { data: edges } = await supabase
      .from("automation_edges")
      .select("*")
      .eq("automation_id", a.id)
    const { data: newRow } = await supabase
      .from("automations")
      .insert({
        business_id: businessId,
        name: `${a.name} (עותק)`,
        status: "draft",
        version: 1,
        folder_id: a.folder_id
      })
      .select("id")
      .single()
    if (!newRow?.id || !nodes?.length) return
    const idMap = new Map<string, string>()
    for (const n of nodes) {
      const newId = crypto.randomUUID()
      idMap.set(n.id, newId)
    }
    for (const n of nodes) {
      await supabase.from("automation_nodes").insert({
        id: idMap.get(n.id),
        automation_id: newRow.id,
        type: n.type,
        subtype: n.subtype,
        config: n.config,
        position_x: n.position_x,
        position_y: n.position_y,
      })
    }
    for (const e of edges ?? []) {
      const fromId = idMap.get(e.from_node_id)
      const toId = idMap.get(e.to_node_id)
      if (fromId && toId)
        await supabase.from("automation_edges").insert({
          automation_id: newRow.id,
          from_node_id: fromId,
          to_node_id: toId,
          branch_label: e.branch_label,
        })
    }
    loadData()
    toast.success("האוטומציה שוכפלה בהצלחה")
  }

  const deleteAutomation = async (id: string) => {
    if (!confirm("האם אתה בטוח שברצונך למחוק אוטומציה זו?")) return
    const { error } = await supabase.from("automations").delete().eq("id", id)
    if (error) {
      toast.error("שגיאה במחיקת האוטומציה")
      return
    }
    setAutomations(prev => prev.filter(a => a.id !== id))
    toast.success("האוטומציה נמחקה")
  }

  const bulkAction = async (action: "activate" | "deactivate" | "delete") => {
    if (selectedIds.length === 0) return
    
    if (action === "delete") {
      if (!confirm(`האם אתה בטוח שברצונך למחוק ${selectedIds.length} אוטומציות?`)) return
      const { error } = await supabase.from("automations").delete().in("id", selectedIds)
      if (error) toast.error("שגיאה במחיקה המרוכזת")
      else {
        setAutomations(prev => prev.filter(a => !selectedIds.includes(a.id)))
        setSelectedIds([])
        toast.success("האוטומציות נמחקו")
      }
    } else {
      const nextStatus = action === "activate" ? "active" : "paused"
      const { error } = await supabase.from("automations").update({ status: nextStatus }).in("id", selectedIds)
      if (error) toast.error("שגיאה בעדכון המרוכז")
      else {
        setAutomations(prev => prev.map(a => selectedIds.includes(a.id) ? { ...a, status: nextStatus } : a))
        setSelectedIds([])
        toast.success("הסטטוס עודכן בהצלחה")
      }
    }
  }

  const toggleSelectAll = () => {
    const currentList = filteredAutomations
    if (selectedIds.length === currentList.length) {
      setSelectedIds([])
    } else {
      setSelectedIds(currentList.map(a => a.id))
    }
  }

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    )
  }

  const filteredAutomations = automations.filter(a => 
    selectedFolderId === "all" ? true :
    selectedFolderId === "none" ? a.folder_id === null :
    a.folder_id === selectedFolderId
  )

  if (!businessId) return null
  if (loading && automations.length === 0) {
    return (
      <div className="flex min-h-[200px] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="text-right">
          <h1 className="text-2xl font-bold tracking-tight">אוטומציות</h1>
          <p className="text-muted-foreground text-sm mt-1">
            בנה זרימות אוטומטיות עם טריגרים, תנאים ופעולות.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={() => {
            setIsFolderDialogOpen(true)
            setEditingFolder(null)
            setNewFolderName("")
          }}>
            <FolderPlus className="h-4 w-4 me-2" />
            תיקייה חדשה
          </Button>
          <Button asChild>
            <Link href="/automations/new" className="flex items-center gap-2">
              אוטומציה חדשה
              <Plus className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      </div>

      <Tabs defaultValue="list" className="w-full" dir="rtl">
        <TabsList className="flex justify-start w-full max-w-[400px] mb-4">
          <TabsTrigger value="list" className="flex-1">אוטומציות שלי</TabsTrigger>
          <TabsTrigger value="history" className="flex-1">היסטוריית הרצות</TabsTrigger>
        </TabsList>

        <TabsContent value="list" className="grid grid-cols-1 lg:grid-cols-12 gap-6 pt-4">
          {/* Folders Sidebar */}
          <div className="lg:col-span-3 space-y-4">
            <Card>
              <CardHeader className="pb-3 text-right">
                <CardTitle className="text-sm font-semibold">תיקיות</CardTitle>
              </CardHeader>
              <CardContent className="px-2 pb-2">
                <div className="space-y-1">
                  <Button
                    variant={selectedFolderId === "all" ? "secondary" : "ghost"}
                    className="w-full justify-start text-right px-3"
                    onClick={() => setSelectedFolderId("all")}
                  >
                    <FolderOpen className="h-4 w-4 ms-2 opacity-70" />
                    כל האוטומציות
                  </Button>
                  <Button
                    variant={selectedFolderId === "none" ? "secondary" : "ghost"}
                    className="w-full justify-start text-right px-3"
                    onClick={() => setSelectedFolderId("none")}
                  >
                    <Folder className="h-4 w-4 ms-2 opacity-70" />
                    ללא תיקייה
                  </Button>
                  
                  {folders.map((f) => (
                    <div key={f.id} className="group relative">
                      <Button
                        variant={selectedFolderId === f.id ? "secondary" : "ghost"}
                        className="w-full justify-start text-right px-3"
                        onClick={() => setSelectedFolderId(f.id)}
                      >
                        <Folder className="h-4 w-4 ms-2 opacity-70" />
                        <span className="truncate flex-1">{f.name}</span>
                      </Button>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="absolute left-1 top-1 h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <MoreVertical className="h-3 w-3" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="start">
                          <DropdownMenuItem onClick={() => {
                            setIsFolderDialogOpen(true)
                            setEditingFolder(f)
                            setNewFolderName(f.name)
                          }} className="text-right">
                            עריכה
                          </DropdownMenuItem>
                          <DropdownMenuItem className="text-destructive text-right" onClick={() => deleteFolder(f)}>
                            מחיקה
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Automations List */}
          <div className="lg:col-span-9 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1 bg-muted p-1 rounded-md">
                  <Button
                    variant={viewMode === "grid" ? "secondary" : "ghost"}
                    size="sm"
                    className="h-8 px-2"
                    onClick={() => setViewMode("grid")}
                  >
                    <LayoutGrid className="h-4 w-4" />
                  </Button>
                  <Button
                    variant={viewMode === "table" ? "secondary" : "ghost"}
                    size="sm"
                    className="h-8 px-2"
                    onClick={() => setViewMode("table")}
                  >
                    <List className="h-4 w-4" />
                  </Button>
                </div>
                
                {selectedIds.length > 0 && (
                  <div className="flex items-center gap-2 ms-4 border-r ps-4">
                    <span className="text-sm font-medium">{selectedIds.length} נבחרו</span>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="outline" size="sm">
                          <MoveHorizontal className="h-4 w-4 me-2" />
                          העבר לתיקייה
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="start">
                        <DropdownMenuItem onClick={() => moveSelectedToFolder(null)} className="text-right">
                          ללא תיקייה
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        {folders.map(f => (
                          <DropdownMenuItem 
                            key={f.id} 
                            onClick={() => moveSelectedToFolder(f.id)}
                            className="text-right"
                          >
                            {f.name}
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>
                    <Button variant="outline" size="sm" onClick={() => bulkAction("activate")}>
                      הפעל
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => bulkAction("deactivate")}>
                      השהה
                    </Button>
                    <Button variant="destructive" size="sm" onClick={() => bulkAction("delete")}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </div>

              {filteredAutomations.length > 0 && (
                <p className="text-sm text-muted-foreground">
                  סך הכל {filteredAutomations.length} אוטומציות
                </p>
              )}
            </div>

            {filteredAutomations.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                  <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-4">
                    <Zap className="h-6 w-6 text-muted-foreground" />
                  </div>
                  <p className="text-muted-foreground max-w-xs">
                    אין אוטומציות כאן עדיין. צור אוטומציה חדשה ובנה זרימה חכמה לעסק שלך.
                  </p>
                  <Button asChild className="mt-6">
                    <Link href="/automations/new">
                      אוטומציה חדשה
                      <Plus className="h-4 w-4 ms-2" />
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            ) : viewMode === "grid" ? (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {filteredAutomations.map((a) => (
                  <Card key={a.id} className={`flex flex-col relative ${selectedIds.includes(a.id) ? 'border-primary' : ''}`}>
                    <div className="absolute top-4 right-4 z-10">
                      <Checkbox 
                        checked={selectedIds.includes(a.id)} 
                        onCheckedChange={() => toggleSelect(a.id)}
                      />
                    </div>
                    <CardHeader className="flex items-start justify-between space-y-0 pb-2 pt-6">
                      <div className="space-y-1 text-right flex-1 pe-4">
                        <CardTitle className="text-lg font-bold">{a.name}</CardTitle>
                        <Badge
                          variant={
                            a.status === "active"
                              ? "default"
                              : a.status === "paused"
                                ? "secondary"
                                : "outline"
                          }
                          className="mt-1"
                        >
                          {a.status === "active"
                            ? "פעיל"
                            : a.status === "paused"
                              ? "מושהה"
                              : "טיוטה"}
                        </Badge>
                      </div>
                      <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <Zap className="h-5 w-5 text-primary" />
                      </div>
                    </CardHeader>
                    <CardContent className="flex-1 pb-4 text-right">
                      <div className="text-xs text-muted-foreground mt-2">
                        עודכן לאחרונה: {new Date(a.updated_at).toLocaleDateString("he-IL")}
                      </div>
                      {a.folder_id && (
                        <div className="mt-2">
                          <Badge variant="outline" className="text-[10px] font-normal opacity-70">
                            {folders.find(f => f.id === a.folder_id)?.name}
                          </Badge>
                        </div>
                      )}
                    </CardContent>
                    <div className="mt-auto p-4 pt-0 flex gap-2 border-t mt-4 pt-4">
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1"
                        onClick={() => toggleStatus(a)}
                        disabled={a.status === "draft"}
                      >
                        {a.status === "active" ? (
                          <>
                            <Pause className="h-4 w-4 ms-2" />
                            השהה
                          </>
                        ) : (
                          <>
                            <Play className="h-4 w-4 ms-2" />
                            הפעל
                          </>
                        )}
                      </Button>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="outline" size="sm">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="start">
                          <DropdownMenuItem onClick={() => duplicate(a)} className="text-right">
                            <Copy className="h-4 w-4 ms-2" />
                            שכפל
                          </DropdownMenuItem>
                          
                          <DropdownMenuSeparator />
                          <DropdownMenuLabel className="text-[10px] text-right">העבר לתיקייה</DropdownMenuLabel>
                          <DropdownMenuItem onClick={() => moveAutomationToFolder(a.id, null)} className="text-right ps-8">
                            ללא תיקייה {a.folder_id === null && "✓"}
                          </DropdownMenuItem>
                          {folders.map(f => (
                            <DropdownMenuItem 
                              key={f.id} 
                              onClick={() => moveAutomationToFolder(a.id, f.id)}
                              className="text-right ps-8"
                            >
                              {f.name} {a.folder_id === f.id && "✓"}
                            </DropdownMenuItem>
                          ))}
                          
                          <DropdownMenuSeparator />
                          <DropdownMenuItem className="text-destructive text-right" onClick={() => deleteAutomation(a.id)}>
                            <Trash2 className="h-4 w-4 ms-2" />
                            מחק
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                      <Button asChild size="sm" className="flex-1">
                        <Link href={`/automations/${a.id}/builder`}>עריכה</Link>
                      </Button>
                    </div>
                  </Card>
                ))}
              </div>
            ) : (
              <Card className="overflow-hidden">
                <Table dir="rtl">
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[50px] text-right">
                        <Checkbox 
                          checked={selectedIds.length === filteredAutomations.length && filteredAutomations.length > 0} 
                          onCheckedChange={toggleSelectAll}
                        />
                      </TableHead>
                      <TableHead className="text-right">שם האוטומציה</TableHead>
                      <TableHead className="text-right">סטטוס</TableHead>
                      <TableHead className="text-right">תיקייה</TableHead>
                      <TableHead className="text-right">עודכן לאחרונה</TableHead>
                      <TableHead className="text-left">פעולות</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredAutomations.map((a) => (
                      <TableRow key={a.id} className={selectedIds.includes(a.id) ? 'bg-muted/50' : ''}>
                        <TableCell className="text-right">
                          <Checkbox 
                            checked={selectedIds.includes(a.id)} 
                            onCheckedChange={() => toggleSelect(a.id)}
                          />
                        </TableCell>
                        <TableCell className="font-medium text-right">{a.name}</TableCell>
                        <TableCell className="text-right">
                          <Badge
                            variant={
                              a.status === "active"
                                ? "default"
                                : a.status === "paused"
                                  ? "secondary"
                                  : "outline"
                            }
                          >
                            {a.status === "active"
                              ? "פעיל"
                              : a.status === "paused"
                                ? "מושהה"
                                : "טיוטה"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <Badge variant="outline" className="text-[10px]">
                            {a.folder_id ? folders.find(f => f.id === a.folder_id)?.name : 'ללא תיקייה'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">{new Date(a.updated_at).toLocaleDateString("he-IL")}</TableCell>
                        <TableCell className="text-left">
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => toggleStatus(a)}
                              disabled={a.status === "draft"}
                            >
                              {a.status === "active" ? (
                                <Pause className="h-4 w-4" />
                              ) : (
                                <Play className="h-4 w-4" />
                              )}
                            </Button>
                            <Button asChild variant="ghost" size="sm">
                              <Link href={`/automations/${a.id}/builder`}>עריכה</Link>
                            </Button>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm">
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="start">
                                <DropdownMenuItem onClick={() => duplicate(a)} className="text-right">
                                  <Copy className="h-4 w-4 ms-2" />
                                  שכפל
                                </DropdownMenuItem>
                                
                                <DropdownMenuSeparator />
                                <DropdownMenuLabel className="text-[10px] text-right">העבר לתיקייה</DropdownMenuLabel>
                                <DropdownMenuItem onClick={() => moveAutomationToFolder(a.id, null)} className="text-right ps-8">
                                  ללא תיקייה {a.folder_id === null && "✓"}
                                </DropdownMenuItem>
                                {folders.map(f => (
                                  <DropdownMenuItem 
                                    key={f.id} 
                                    onClick={() => moveAutomationToFolder(a.id, f.id)}
                                    className="text-right ps-8"
                                  >
                                    {f.name} {a.folder_id === f.id && "✓"}
                                  </DropdownMenuItem>
                                ))}
                                
                                <DropdownMenuSeparator />
                                <DropdownMenuItem className="text-destructive text-right" onClick={() => deleteAutomation(a.id)}>
                                  <Trash2 className="h-4 w-4 ms-2" />
                                  מחק
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Card>
            )}
          </div>
        </TabsContent>

        <TabsContent value="history" className="pt-4">
          <Card className="overflow-hidden">
            <CardHeader className="text-right">
              <CardTitle className="flex items-center justify-end gap-2 text-lg">
                היסטוריית הרצות אחרונות
                <History className="h-5 w-5" />
              </CardTitle>
            </CardHeader>
            <CardContent>
              {runs.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-muted-foreground">אין הרצות עדיין.</p>
                </div>
              ) : (
                <Table dir="rtl">
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-right">יישות</TableHead>
                      <TableHead className="text-right">סטטוס</TableHead>
                      <TableHead className="text-right">זמן התחלה</TableHead>
                      <TableHead className="text-left">פרטים</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {runs.map((r) => (
                      <TableRow key={r.id}>
                        <TableCell className="text-right">
                          <span className="text-sm font-mono text-right">
                            {r.entity_type} / {r.entity_id.slice(0, 8)}…
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          <Badge
                            variant={
                              r.status === "completed"
                                ? "default"
                                : r.status === "failed"
                                  ? "destructive"
                                  : "secondary"
                            }
                          >
                            {r.status === "running"
                              ? "רץ"
                              : r.status === "completed"
                                ? "הושלם"
                                : "נכשל"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-right">
                          {r.started_at
                            ? new Date(r.started_at).toLocaleString("he-IL")
                            : ""}
                        </TableCell>
                        <TableCell className="text-left">
                          <Button asChild variant="ghost" size="sm">
                            <Link href={`/automations/runs/${r.id}`}>פרטי הרצה</Link>
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Folder Dialog */}
      <Dialog open={isFolderDialogOpen} onOpenChange={setIsFolderDialogOpen}>
        <DialogContent dir="rtl">
          <DialogHeader>
            <DialogTitle className="text-right">
              {editingFolder ? "עריכת תיקייה" : "יצירת תיקייה חדשה"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2 text-right">
              <Label htmlFor="folderName">שם התיקייה</Label>
              <Input
                id="folderName"
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                placeholder="למשל: שיווק, מכירות, לקוחות..."
                className="text-right"
              />
            </div>
          </div>
          <DialogFooter className="flex-row-reverse gap-2">
            <Button variant="outline" onClick={() => setIsFolderDialogOpen(false)}>
              ביטול
            </Button>
            <Button onClick={handleCreateFolder}>
              {editingFolder ? "עדכון" : "יצירה"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
