"use client"

import { useState, useEffect, useCallback } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Calendar as CalendarIcon, Clock, MapPin, Video, User as UserIcon, Loader2 } from "lucide-react"
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

interface CreateAppointmentDialogProps {
  contactId: string
  businessId: string
  contactName: string
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}

interface BusinessMember {
  user_id: string
  full_name: string
  role: string
}

export function CreateAppointmentDialog({
  contactId,
  businessId,
  contactName,
  open,
  onOpenChange,
  onSuccess
}: CreateAppointmentDialogProps) {
  const [loading, setLoading] = useState(false)
  const [members, setMembers] = useState<BusinessMember[]>([])
  const [loadingMembers, setLoadingMembers] = useState(false)
  const supabase = createClient()

  const form = useForm<AppointmentFormValues>({
    resolver: zodResolver(appointmentSchema),
    defaultValues: {
      title: `פגישה עם ${contactName}`,
      description: "",
      date: new Date().toISOString().split("T")[0],
      time: "10:00",
      duration: "60",
      location: "",
      meeting_link: "",
      assigned_to_user_id: ""
    }
  })

  const loadMembers = useCallback(async () => {
    if (!businessId || !open) return
    setLoadingMembers(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      
      // Fetch business users and their profiles
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
        const membersList = businessUsers.map(bu => ({
          user_id: bu.user_id,
          role: bu.role,
          full_name: profileMap.get(bu.user_id) || "ללא שם"
        }))
        
        setMembers(membersList)
        
        // Set default assigned user to current user if not already set
        if (user && !form.getValues("assigned_to_user_id")) {
          form.setValue("assigned_to_user_id", user.id)
        }
      }
    } catch (error) {
      console.error("Error loading members:", error)
    } finally {
      setLoadingMembers(false)
    }
  }, [businessId, open, supabase, form])

  useEffect(() => {
    loadMembers()
  }, [loadMembers])

  const onSubmit = async (values: AppointmentFormValues) => {
    setLoading(true)
    
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error("לא נמצא משתמש מחובר")

      const start_time = new Date(`${values.date}T${values.time}`)
      const end_time = new Date(start_time.getTime() + parseInt(values.duration) * 60 * 1000)

      const { error } = await supabase.from("appointments").insert({
        business_id: businessId,
        contact_id: contactId,
        title: values.title,
        description: values.description,
        start_time: start_time.toISOString(),
        end_time: end_time.toISOString(),
        location: values.location,
        meeting_link: values.meeting_link,
        assigned_to_user_id: values.assigned_to_user_id,
        created_by_user_id: user.id,
        status: "scheduled"
      })

      if (error) throw error
      
      toast.success("הפגישה נקבעה בהצלחה")
      onSuccess()
      onOpenChange(false)
      form.reset()
    } catch (error: any) {
      console.error("Error creating appointment:", error)
      toast.error("שגיאה בקביעת הפגישה", { description: error.message })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]" dir="rtl">
        <DialogHeader>
          <DialogTitle>קביעת פגישה חדשה</DialogTitle>
          <DialogDescription>
            תיאום פגישה עבור {contactName}
          </DialogDescription>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
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
                        <SelectValue placeholder={loadingMembers ? "טוען נציגים..." : "בחר נציג"} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {members.map(member => (
                        <SelectItem key={member.user_id} value={member.user_id}>
                          <div className="flex items-center gap-2">
                            <UserIcon className="h-3.5 w-3.5 opacity-50" />
                            <span>{member.full_name}</span>
                            <span className="text-[10px] text-muted-foreground opacity-70">
                              ({member.role === 'admin' ? 'אדמין' : member.role === 'manager' ? 'מנהל' : 'סוכן'})
                            </span>
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
                  <FormLabel>משך הפגישה</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
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
                      <Input className="pr-10" placeholder="כתובת או שם המשרד" {...field} />
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
                  <FormLabel>קישור לפגישה מקוונת</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Video className="absolute right-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input className="pr-10" placeholder="Zoom, Google Meet וכו'" {...field} />
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
                  <FormLabel>הערות נוספות</FormLabel>
                  <FormControl>
                    <Textarea className="resize-none" placeholder="פירוט נוסף על תוכן הפגישה..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "קבע פגישה"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
