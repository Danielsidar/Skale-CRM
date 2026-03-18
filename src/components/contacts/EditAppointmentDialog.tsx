"use client"

import { useState, useEffect, useCallback } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { 
  Calendar as CalendarIcon, 
  Clock, 
  MapPin, 
  Video, 
  User as UserIcon, 
  Loader2,
  Trash2,
  CheckCircle2,
  XCircle,
  RotateCcw,
  Target,
} from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter,
  DialogDescription 
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { 
  Form, 
  FormControl, 
  FormField, 
  FormItem, 
  FormLabel, 
  FormMessage 
} from "@/components/ui/form"
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select"
import { toast } from "sonner"
import { appointmentSchema, type AppointmentFormValues } from "@/lib/validations/appointment"
import { cn } from "@/lib/utils"

interface EditAppointmentDialogProps {
  appointment: any
  businessId: string
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}

interface BusinessMember {
  user_id: string
  full_name: string
  role: string
}

interface Pipeline { id: string; name: string }
interface Stage { id: string; name: string; pipeline_id: string; position: number }

export function EditAppointmentDialog({
  appointment,
  businessId,
  open,
  onOpenChange,
  onSuccess
}: EditAppointmentDialogProps) {
  const [loading, setLoading] = useState(false)
  const [members, setMembers] = useState<BusinessMember[]>([])
  const [loadingMembers, setLoadingMembers] = useState(false)
  const [showLeadForm, setShowLeadForm] = useState(false)
  const [pipelines, setPipelines] = useState<Pipeline[]>([])
  const [stages, setStages] = useState<Stage[]>([])
  const [selectedPipeline, setSelectedPipeline] = useState("")
  const [selectedStage, setSelectedStage] = useState("")
  const [creatingDeal, setCreatingDeal] = useState(false)
  const supabase = createClient()

  const form = useForm<AppointmentFormValues>({
    resolver: zodResolver(appointmentSchema),
    defaultValues: {
      title: "",
      description: "",
      date: "",
      time: "",
      duration: "60",
      location: "",
      meeting_link: "",
      assigned_to_user_id: ""
    }
  })

  useEffect(() => {
    if (appointment && open) {
      const startDate = new Date(appointment.start_time)
      const endDate = new Date(appointment.end_time)
      const durationMinutes = Math.round((endDate.getTime() - startDate.getTime()) / (1000 * 60))
      
      form.reset({
        title: appointment.title,
        description: appointment.description || "",
        date: startDate.toISOString().split("T")[0],
        time: startDate.toTimeString().slice(0, 5),
        duration: durationMinutes.toString(),
        location: appointment.location || "",
        meeting_link: appointment.meeting_link || "",
        assigned_to_user_id: appointment.assigned_to_user_id
      })
    }
  }, [appointment, open, form])

  const loadMembers = useCallback(async () => {
    if (!businessId || !open) return
    setLoadingMembers(true)
    try {
      const { data: businessUsers } = await supabase
        .from("business_users")
        .select("user_id, role")
        .eq("business_id", businessId)

      if (businessUsers) {
        const userIds = businessUsers.map(bu => bu.user_id)
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, full_name")
          .in("id", userIds)

        const profileMap = new Map(profiles?.map(p => [p.id, p.full_name]) || [])
        setMembers(businessUsers.map(bu => ({
          user_id: bu.user_id,
          role: bu.role,
          full_name: profileMap.get(bu.user_id) || "ללא שם"
        })))
      }
    } catch (error) {
      console.error("Error loading members:", error)
    } finally {
      setLoadingMembers(false)
    }
  }, [businessId, open, supabase])

  useEffect(() => {
    loadMembers()
  }, [loadMembers])

  const loadPipelines = useCallback(async () => {
    if (!businessId) return
    const { data: pData } = await supabase
      .from("pipelines")
      .select("id, name")
      .eq("business_id", businessId)
      .order("created_at")
    setPipelines((pData || []) as Pipeline[])

    const pipelineIds = (pData || []).map(p => p.id)
    if (pipelineIds.length > 0) {
      const { data: sData } = await supabase
        .from("stages")
        .select("id, name, pipeline_id, position")
        .in("pipeline_id", pipelineIds)
        .order("position")
      setStages((sData || []) as Stage[])
    }
  }, [businessId, supabase])

  const handleAddAsLead = async () => {
    if (!selectedPipeline || !selectedStage || !appointment?.contact_id) return
    setCreatingDeal(true)
    try {
      const { data: existingDeal } = await supabase
        .from("deals")
        .select("id")
        .eq("business_id", businessId)
        .eq("pipeline_id", selectedPipeline)
        .eq("contact_id", appointment.contact_id)
        .maybeSingle()

      if (existingDeal) {
        await supabase
          .from("deals")
          .update({ stage_id: selectedStage, updated_at: new Date().toISOString() })
          .eq("id", existingDeal.id)
        toast.success("הליד עודכן לשלב שנבחר")
      } else {
        const contactName = appointment.contacts?.full_name || appointment.title
        const { error } = await supabase
          .from("deals")
          .insert({
            business_id: businessId,
            pipeline_id: selectedPipeline,
            stage_id: selectedStage,
            contact_id: appointment.contact_id,
            owner_user_id: appointment.assigned_to_user_id,
            title: contactName,
            value: 0,
            currency: "ILS",
          })
        if (error) throw error
        toast.success("הליד נוצר בהצלחה")
      }
      setShowLeadForm(false)
      setSelectedPipeline("")
      setSelectedStage("")
    } catch (error: any) {
      toast.error("שגיאה ביצירת הליד", { description: error.message })
    } finally {
      setCreatingDeal(false)
    }
  }

  const onSubmit = async (values: AppointmentFormValues) => {
    setLoading(true)
    try {
      const start_time = new Date(`${values.date}T${values.time}`)
      const end_time = new Date(start_time.getTime() + parseInt(values.duration) * 60 * 1000)

      const { error } = await supabase
        .from("appointments")
        .update({
          title: values.title,
          description: values.description,
          start_time: start_time.toISOString(),
          end_time: end_time.toISOString(),
          location: values.location,
          meeting_link: values.meeting_link,
          assigned_to_user_id: values.assigned_to_user_id,
          updated_at: new Date().toISOString()
        })
        .eq("id", appointment.id)

      if (error) throw error
      
      toast.success("הפגישה עודכנה בהצלחה")
      onSuccess()
      onOpenChange(false)
    } catch (error: any) {
      toast.error("שגיאה בעדכון הפגישה", { description: error.message })
    } finally {
      setLoading(false)
    }
  }

  const updateStatus = async (newStatus: string) => {
    setLoading(true)
    try {
      const { error } = await supabase
        .from("appointments")
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq("id", appointment.id)

      if (error) throw error
      
      toast.success(`סטטוס הפגישה עודכן ל-${newStatus === 'completed' ? 'בוצע' : newStatus === 'cancelled' ? 'בוטל' : 'מתוזמן'}`)
      onSuccess()
      onOpenChange(false)
    } catch (error: any) {
      toast.error("שגיאה בעדכון הסטטוס", { description: error.message })
    } finally {
      setLoading(false)
    }
  }

  const deleteAppointment = async () => {
    if (!confirm("האם אתה בטוח שברצונך למחוק את הפגישה לצמיתות?")) return
    
    setLoading(true)
    try {
      const { error } = await supabase
        .from("appointments")
        .delete()
        .eq("id", appointment.id)

      if (error) throw error
      
      toast.success("הפגישה נמחקה בהצלחה")
      onSuccess()
      onOpenChange(false)
    } catch (error: any) {
      toast.error("שגיאה במחיקת הפגישה", { description: error.message })
    } finally {
      setLoading(false)
    }
  }

  if (!appointment) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[450px]" dir="rtl">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle>ניהול פגישה</DialogTitle>
            <Badge className={cn(
              "ml-6",
              appointment.status === 'scheduled' ? "bg-blue-100 text-blue-700" :
              appointment.status === 'completed' ? "bg-emerald-100 text-emerald-700" :
              "bg-red-100 text-red-700"
            )}>
              {appointment.status === 'scheduled' ? 'מתוזמן' : 
               appointment.status === 'completed' ? 'בוצע' : 'בוטל'}
            </Badge>
          </div>
          <DialogDescription>ערוך את פרטי הפגישה או עדכן את הסטטוס שלה</DialogDescription>
        </DialogHeader>

        <div className="flex gap-2 py-2 border-b mb-4 overflow-x-auto">
          {appointment.status !== 'completed' && (
            <Button 
              size="sm" 
              variant="outline" 
              className="text-emerald-600 border-emerald-200 hover:bg-emerald-50 gap-1 whitespace-nowrap"
              onClick={() => updateStatus('completed')}
              disabled={loading}
            >
              <CheckCircle2 className="h-3.5 w-3.5" />
              סמן כבוצע
            </Button>
          )}
          {appointment.status !== 'cancelled' && (
            <Button 
              size="sm" 
              variant="outline" 
              className="text-red-600 border-red-200 hover:bg-red-50 gap-1 whitespace-nowrap"
              onClick={() => updateStatus('cancelled')}
              disabled={loading}
            >
              <XCircle className="h-3.5 w-3.5" />
              בטל פגישה
            </Button>
          )}
          {appointment.status !== 'scheduled' && (
            <Button 
              size="sm" 
              variant="outline" 
              className="text-blue-600 border-blue-200 hover:bg-blue-50 gap-1 whitespace-nowrap"
              onClick={() => updateStatus('scheduled')}
              disabled={loading}
            >
              <RotateCcw className="h-3.5 w-3.5" />
              תזמן מחדש
            </Button>
          )}
          <Button 
            size="sm" 
            variant="outline" 
            className="text-amber-600 border-amber-200 hover:bg-amber-50 gap-1 whitespace-nowrap"
            onClick={() => {
              if (!showLeadForm) loadPipelines()
              setShowLeadForm(!showLeadForm)
            }}
            disabled={loading}
          >
            <Target className="h-3.5 w-3.5" />
            הוסף כליד
          </Button>
          <Button 
            size="sm" 
            variant="ghost" 
            className="text-slate-400 hover:text-red-600 gap-1 mr-auto"
            onClick={deleteAppointment}
            disabled={loading}
          >
            <Trash2 className="h-3.5 w-3.5" />
            מחק
          </Button>
        </div>

        {showLeadForm && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-4 space-y-3">
            <p className="text-sm font-medium text-amber-800">הוספה כליד לפייפליין</p>
            <div className="grid grid-cols-2 gap-2">
              <Select value={selectedPipeline} onValueChange={(v) => { setSelectedPipeline(v); setSelectedStage("") }}>
                <SelectTrigger className="h-9 text-sm bg-white">
                  <SelectValue placeholder="פייפליין" />
                </SelectTrigger>
                <SelectContent>
                  {pipelines.map((p) => (
                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={selectedStage} onValueChange={setSelectedStage} disabled={!selectedPipeline}>
                <SelectTrigger className="h-9 text-sm bg-white">
                  <SelectValue placeholder="שלב" />
                </SelectTrigger>
                <SelectContent>
                  {stages.filter(s => s.pipeline_id === selectedPipeline).map((s) => (
                    <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-2 justify-end">
              <Button size="sm" variant="ghost" onClick={() => setShowLeadForm(false)} className="h-8 text-xs">
                ביטול
              </Button>
              <Button
                size="sm"
                onClick={handleAddAsLead}
                disabled={!selectedPipeline || !selectedStage || creatingDeal}
                className="h-8 text-xs gap-1 bg-amber-600 hover:bg-amber-700"
              >
                {creatingDeal ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Target className="h-3.5 w-3.5" />}
                הוסף
              </Button>
            </div>
          </div>
        )}
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 max-h-[60vh] overflow-y-auto px-1">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>נושא הפגישה</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="assigned_to_user_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>נציג אחראי</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder={loadingMembers ? "טוען..." : "בחר נציג"} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {members.map(member => (
                        <SelectItem key={member.user_id} value={member.user_id}>
                          <div className="flex items-center gap-2">
                            <UserIcon className="h-3.5 w-3.5 opacity-50" />
                            <span>{member.full_name}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>תאריך</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="time"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>שעה</FormLabel>
                    <FormControl>
                      <Input type="time" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="duration"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>משך הפגישה (דקות)</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="בחר משך זמן" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="15">15 דקות</SelectItem>
                      <SelectItem value="30">30 דקות</SelectItem>
                      <SelectItem value="45">45 דקות</SelectItem>
                      <SelectItem value="60">שעה</SelectItem>
                      <SelectItem value="90">שעה וחצי</SelectItem>
                      <SelectItem value="120">שעתיים</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="location"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>מיקום</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <MapPin className="absolute right-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input className="pr-10" {...field} />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="meeting_link"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>קישור לפגישה</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Video className="absolute right-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input className="pr-10" {...field} />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>הערות</FormLabel>
                  <FormControl>
                    <Textarea className="resize-none h-20" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </form>
        </Form>

        <DialogFooter className="mt-4">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            ביטול
          </Button>
          <Button type="button" onClick={form.handleSubmit(onSubmit)} disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "שמור שינויים"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function Badge({ children, className }: { children: React.ReactNode, className?: string }) {
  return (
    <span className={cn("px-2 py-0.5 rounded-full text-[10px] font-bold", className)}>
      {children}
    </span>
  )
}
