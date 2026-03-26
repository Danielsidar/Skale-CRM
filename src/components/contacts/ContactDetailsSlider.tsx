"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { 
  User, 
  Phone, 
  Mail, 
  Tag as TagIcon, 
  Building2, 
  Plus, 
  Send,
  MoreVertical,
  Briefcase,
  CheckSquare,
  Clock,
  Calendar,
  ExternalLink,
  MessageSquare,
  Video,
  MapPin
} from "lucide-react"
import { ContactTimeline, type TimelineEvent } from "./ContactTimeline"
import { CreateAppointmentDialog } from "./CreateAppointmentDialog"
import { EditAppointmentDialog } from "./EditAppointmentDialog"
import { toast } from "sonner"
import { logActivity } from "@/lib/services/crm"
import type { Database } from "@/types/database.types"
import { cn } from "@/lib/utils"

type Contact = Database["public"]["Tables"]["contacts"]["Row"]
type Activity = Database["public"]["Tables"]["activities"]["Row"]
type Deal = Database["public"]["Tables"]["deals"]["Row"]
type Appointment = any // Temporary until types are refreshed

interface ContactDetailsSliderProps {
  contactId: string | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onActivityAdded?: () => void
  canViewPhone?: boolean
  canViewEmail?: boolean
  canViewSource?: boolean
  canViewDealValue?: boolean
}

export function ContactDetailsSlider({ 
  contactId, 
  open, 
  onOpenChange,
  onActivityAdded,
  canViewPhone = true,
  canViewEmail = true,
  canViewSource = true,
  canViewDealValue = true,
}: ContactDetailsSliderProps) {
  const [contact, setContact] = useState<Contact | null>(null)
  const [activities, setActivities] = useState<Activity[]>([])
  const [deals, setDeals] = useState<Deal[]>([])
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [timelineEvents, setTimelineEvents] = useState<TimelineEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [noteContent, setNoteContent] = useState("")
  const [submittingNote, setSubmittingNote] = useState(false)
  const [isApptDialogOpen, setIsApptDialogOpen] = useState(false)
  const [isEditApptDialogOpen, setIsEditApptDialogOpen] = useState(false)
  const [selectedAppt, setSelectedAppt] = useState<any>(null)
  
  const supabase = createClient()

  const loadData = async () => {
    if (!contactId) return
    setLoading(true)
    
    try {
      // 1. Fetch current contact
      const { data: contactData } = await supabase
        .from("contacts")
        .select("*")
        .eq("id", contactId)
        .single()
      
      if (!contactData) throw new Error("איש קשר לא נמצא")
      setContact(contactData)

      // 2. Find related contacts (same email/phone) in parallel with nothing yet
      let allContactIds = [contactId]
      if (contactData.email || contactData.phone) {
        const orFilters = []
        if (contactData.email) orFilters.push(`email.ilike.${contactData.email}`)
        if (contactData.phone) orFilters.push(`phone.eq.${contactData.phone}`)
        
        const { data: relatedContacts } = await supabase
          .from("contacts")
          .select("id")
          .eq("business_id", contactData.business_id)
          .or(orFilters.join(","))
        
        if (relatedContacts) {
          allContactIds = Array.from(new Set([...allContactIds, ...relatedContacts.map(c => c.id)]))
        }
      }

      // 3. Fetch deals, activities, and appointments in parallel (not sequentially)
      const [dealResult, activityResult, apptResult] = await Promise.all([
        supabase
          .from("deals")
          .select(`
            *,
            stages (name, color, is_won, is_lost),
            pipelines (name)
          `)
          .in("contact_id", allContactIds)
          .order("created_at", { ascending: false }),
        supabase
          .from("activities")
          .select("*")
          .or(`contact_id.in.(${allContactIds.join(",")})`)
          .order("created_at", { ascending: false }),
        supabase
          .from("appointments")
          .select("*")
          .in("contact_id", allContactIds)
          .order("start_time", { ascending: true }),
      ])
      
      const dealsList = dealResult.data ?? []
      const activityData = activityResult.data ?? []
      const apptData = apptResult.data ?? []
      
      setDeals(dealsList)
      setActivities(activityData)
      setAppointments(apptData)
      
      const allDealIds = dealsList.map(d => d.id)

      // 4. Fetch stage history only if there are deals (dependent on step 3)
      let stageHistory: any[] = []
      if (allDealIds.length > 0) {
        const { data: histData } = await supabase
          .from("deal_stage_history")
          .select(`
            *,
            old_stage:stages!deal_stage_history_old_stage_id_fkey (name, color, is_won, is_lost),
            new_stage:stages!deal_stage_history_new_stage_id_fkey (name, color, is_won, is_lost)
          `)
          .in("deal_id", allDealIds)
          .order("created_at", { ascending: false })
        stageHistory = histData ?? []
      }

      // 7. Build unified timeline events
      const events: TimelineEvent[] = []

      // Contact created
      events.push({
        kind: "contact_created",
        id: contactData.id,
        created_at: contactData.created_at,
      })

      // Activities
      for (const act of activityData ?? []) {
        events.push({
          kind: "activity",
          id: act.id,
          created_at: act.created_at ?? new Date().toISOString(),
          type: act.type,
          content: act.content ?? null,
        })
      }

      // Deal created events
      for (const deal of dealsList) {
        if (!deal.created_at) continue
        events.push({
          kind: "deal_created",
          id: deal.id,
          created_at: deal.created_at,
          deal_title: deal.title,
          pipeline_name: (deal as any).pipelines?.name ?? "פייפליין",
        })
      }

      // Stage change events
      for (const hist of stageHistory) {
        if (!hist.created_at) continue
        const deal = dealsList.find(d => d.id === hist.deal_id)
        events.push({
          kind: "stage_change",
          id: hist.id,
          created_at: hist.created_at,
          deal_title: deal?.title ?? "עיסקה",
          old_stage: hist.old_stage
            ? { name: hist.old_stage.name, color: hist.old_stage.color }
            : null,
          new_stage: {
            name: hist.new_stage?.name ?? "שלב",
            color: hist.new_stage?.color ?? null,
            is_won: hist.new_stage?.is_won ?? false,
            is_lost: hist.new_stage?.is_lost ?? false,
          },
        })
      }

      // Appointment events
      for (const appt of apptData ?? []) {
        events.push({
          kind: "appointment",
          id: appt.id,
          created_at: appt.created_at ?? appt.start_time,
          title: appt.title,
          start_time: appt.start_time,
          status: appt.status,
        })
      }

      // Sort all events newest first
      events.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      setTimelineEvents(events)
    } catch (error) {
      console.error("Error loading contact details:", error)
      toast.error("שגיאה בטעינת נתוני איש הקשר")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (open && contactId) {
      loadData()
    }
  }, [open, contactId])

  const handleAddNote = async () => {
    if (!noteContent.trim() || !contactId || !contact) return
    
    const optimisticNote = noteContent.trim()
    setSubmittingNote(true)

    // Optimistic update: append the note to the timeline immediately
    const optimisticEvent: TimelineEvent = {
      kind: "activity",
      id: `optimistic-${Date.now()}`,
      created_at: new Date().toISOString(),
      type: "note",
      content: optimisticNote,
    }
    setTimelineEvents((prev) => [optimisticEvent, ...prev])
    setNoteContent("")

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error("לא מחובר")

      const res = await logActivity(supabase, {
        business_id: contact.business_id,
        type: "note",
        contact_id: contactId,
        created_by_user_id: user.id,
        content: optimisticNote
      })

      if (res.error) throw new Error(res.error)

      toast.success("הערה נוספה בהצלחה")
      // Reload in background to get the real ID and any server-side data
      loadData()
      onActivityAdded?.()
    } catch (error: any) {
      // Revert optimistic update on failure
      setTimelineEvents((prev) => prev.filter(e => e.id !== optimisticEvent.id))
      setNoteContent(optimisticNote)
      toast.error("שגיאה בהוספת הערה", { description: error.message })
    } finally {
      setSubmittingNote(false)
    }
  }

  if (!contactId) return null

  const isCustomer = deals.some(d => d.stage_id && (d as any).stages?.is_won)

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-[500px] p-0 flex flex-col h-full bg-background border-l" side="right">
        {loading && !contact ? (
          <div className="p-6 space-y-6 animate-pulse">
            <div className="flex items-center gap-4">
              <div className="h-14 w-14 rounded-2xl bg-muted flex-shrink-0" />
              <div className="space-y-2 flex-1">
                <div className="h-5 w-40 bg-muted rounded" />
                <div className="h-4 w-28 bg-muted rounded" />
              </div>
            </div>
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="flex gap-3">
                  <div className="h-4 w-4 bg-muted rounded mt-0.5 flex-shrink-0" />
                  <div className="h-4 flex-1 bg-muted rounded" />
                </div>
              ))}
            </div>
            <div className="h-10 w-full bg-muted rounded-lg" />
            <div className="space-y-4 pt-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="flex gap-3">
                  <div className="h-8 w-8 rounded-full bg-muted flex-shrink-0" />
                  <div className="space-y-2 flex-1">
                    <div className="h-4 w-48 bg-muted rounded" />
                    <div className="h-3 w-24 bg-muted rounded" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : contact ? (
          <>
            {/* Header */}
            <div className="p-6 border-b bg-muted/20">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-4">
                  <div className="h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center text-primary text-xl font-bold">
                    {contact.full_name.split(" ").map(n => n[0]).join("")}
                  </div>
                  <div>
                    <h2 className="text-xl font-bold leading-none mb-1">{contact.full_name}</h2>
                    <div className="flex items-center gap-2">
                      <span className={cn(
                        "text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider",
                        isCustomer ? "bg-emerald-100 text-emerald-700" : "bg-blue-100 text-blue-700"
                      )}>
                        {isCustomer ? "לקוח" : "ליד"}
                      </span>
                      {contact.source && canViewSource && (
                        <span className="text-[10px] font-medium bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">
                          מקור: {contact.source}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <Button variant="ghost" size="icon">
                  <MoreVertical className="h-5 w-5 text-muted-foreground" />
                </Button>
              </div>

              <div className="flex items-center gap-2 mb-4">
                <Button 
                  onClick={() => setIsApptDialogOpen(true)} 
                  className="flex-1 gap-2 bg-primary/10 hover:bg-primary/20 text-primary border-none"
                  variant="outline"
                >
                  <Calendar className="h-4 w-4" />
                  קבע פגישה
                </Button>
              </div>

              <div className="grid grid-cols-2 gap-3 mt-4">
                <Button variant="outline" className="justify-start gap-2 h-9 border-slate-200" asChild={canViewPhone && !!contact.phone}>
                  {canViewPhone ? (
                    <a href={`tel:${contact.phone}`} className="flex items-center">
                      <Phone className="h-4 w-4 text-primary" />
                      <span className="text-xs font-medium truncate">{contact.phone || "אין טלפון"}</span>
                    </a>
                  ) : (
                    <span className="flex items-center">
                      <Phone className="h-4 w-4 text-slate-300" />
                      <span className="text-xs font-medium text-slate-300">•••••••</span>
                    </span>
                  )}
                </Button>
                <Button variant="outline" className="justify-start gap-2 h-9 border-slate-200" asChild={canViewEmail && !!contact.email}>
                  {canViewEmail ? (
                    <a href={`mailto:${contact.email}`} className="flex items-center">
                      <Mail className="h-4 w-4 text-primary" />
                      <span className="text-xs font-medium truncate">{contact.email || "אין מייל"}</span>
                    </a>
                  ) : (
                    <span className="flex items-center">
                      <Mail className="h-4 w-4 text-slate-300" />
                      <span className="text-xs font-medium text-slate-300">•••••••</span>
                    </span>
                  )}
                </Button>
              </div>
            </div>

            {/* Tabs */}
            <Tabs defaultValue="timeline" className="flex-1 flex flex-col min-h-0" dir="rtl">
              <div className="px-6 border-b">
                <TabsList className="w-full justify-start bg-transparent h-12 gap-6 p-0" variant="line">
                  <TabsTrigger value="timeline" className="px-0 data-[state=active]:bg-transparent">פעילות</TabsTrigger>
                  <TabsTrigger value="details" className="px-0 data-[state=active]:bg-transparent">פרטים</TabsTrigger>
                  <TabsTrigger value="deals" className="px-0 data-[state=active]:bg-transparent">
                    עסקאות
                    {deals.length > 0 && (
                      <span className="mr-1.5 px-1.5 py-0.5 rounded-full bg-muted text-[10px] font-bold">
                        {deals.length}
                      </span>
                    )}
                  </TabsTrigger>
                  <TabsTrigger value="meetings" className="px-0 data-[state=active]:bg-transparent">
                    פגישות
                    {appointments.length > 0 && (
                      <span className="mr-1.5 px-1.5 py-0.5 rounded-full bg-muted text-[10px] font-bold">
                        {appointments.length}
                      </span>
                    )}
                  </TabsTrigger>
                </TabsList>
              </div>

              <TabsContent value="timeline" className="flex-1 overflow-y-auto p-6 m-0 space-y-6 scrollbar-hide">
                {/* Note Input */}
                <div className="relative group">
                  <Textarea 
                    placeholder="כתוב הערה חדשה..."
                    className="min-h-[100px] pr-4 pl-12 py-3 bg-muted/30 border-dashed border-2 hover:border-primary/50 focus:border-primary transition-all resize-none"
                    value={noteContent}
                    onChange={(e) => setNoteContent(e.target.value)}
                  />
                  <Button 
                    size="icon" 
                    className="absolute left-3 bottom-3 h-8 w-8 rounded-lg shadow-lg"
                    onClick={handleAddNote}
                    disabled={submittingNote || !noteContent.trim()}
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                </div>

                <div className="space-y-4">
                  <h3 className="text-sm font-bold flex items-center gap-2">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    היסטוריית פעילות
                  </h3>
                  <ContactTimeline events={timelineEvents} loading={loading} />
                </div>
              </TabsContent>

              <TabsContent value="details" className="flex-1 overflow-y-auto p-6 m-0 space-y-6">
                 <div className="space-y-4">
                    <div className="flex items-center gap-3 p-3 rounded-xl border border-border bg-card">
                      <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center">
                        <User className="h-5 w-5 text-muted-foreground" />
                      </div>
                      <div className="flex-1">
                        <p className="text-[10px] font-bold text-muted-foreground uppercase">שם מלא</p>
                        <p className="text-sm font-medium">{contact.full_name}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 p-3 rounded-xl border border-border bg-card">
                      <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center">
                        <Mail className="h-5 w-5 text-muted-foreground" />
                      </div>
                      <div className="flex-1">
                        <p className="text-[10px] font-bold text-muted-foreground uppercase">אימייל</p>
                        <p className="text-sm font-medium">{canViewEmail ? (contact.email || "—") : "•••••••"}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 p-3 rounded-xl border border-border bg-card">
                      <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center">
                        <Phone className="h-5 w-5 text-muted-foreground" />
                      </div>
                      <div className="flex-1">
                        <p className="text-[10px] font-bold text-muted-foreground uppercase">טלפון</p>
                        <p className="text-sm font-medium">{canViewPhone ? (contact.phone || "—") : "•••••••"}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 p-3 rounded-xl border border-border bg-card">
                      <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center">
                        <TagIcon className="h-5 w-5 text-muted-foreground" />
                      </div>
                      <div className="flex-1">
                        <p className="text-[10px] font-bold text-muted-foreground uppercase">תגיות</p>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {(contact.tags || []).length > 0 ? (
                            contact.tags?.map(tag => (
                              <span key={tag} className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-md font-bold">
                                {tag}
                              </span>
                            ))
                          ) : (
                            <span className="text-sm text-muted-foreground">—</span>
                          )}
                        </div>
                      </div>
                    </div>
                 </div>
              </TabsContent>

              <TabsContent value="deals" className="flex-1 overflow-y-auto p-6 m-0 space-y-4">
                {deals.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <Briefcase className="h-8 w-8 mx-auto mb-2 opacity-20" />
                    <p>אין עסקאות מקושרות</p>
                  </div>
                ) : (
                  deals.map(deal => (
                    <div key={deal.id} className="p-4 rounded-xl border border-border bg-card hover:border-primary/50 transition-colors group cursor-pointer">
                      <div className="flex items-start justify-between">
                        <div>
                          <h4 className="font-bold text-sm mb-1 group-hover:text-primary transition-colors">{deal.title}</h4>
                          <div className="flex items-center gap-2">
                            <span 
                              className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                              style={{ 
                                backgroundColor: ((deal as any).stages?.color || "#94a3b8") + "20",
                                color: (deal as any).stages?.color || "#94a3b8"
                              }}
                            >
                              {(deal as any).stages?.name || "ללא שלב"}
                            </span>
                            {canViewDealValue && (
                              <span className="text-xs font-bold text-emerald-600">
                                {deal.value ? `₪${deal.value.toLocaleString()}` : "₪0"}
                              </span>
                            )}
                          </div>
                          {(deal as any).tags && (deal as any).tags.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-2">
                              {(deal as any).tags.map((tag: string, i: number) => (
                                <span key={i} className="text-[9px] bg-slate-100 text-slate-500 px-1.5 py-0 rounded font-medium">
                                  {tag}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                        <ExternalLink className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                    </div>
                  ))
                )}
              </TabsContent>

              <TabsContent value="meetings" className="flex-1 overflow-y-auto p-6 m-0 space-y-4">
                {appointments.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <Calendar className="h-8 w-8 mx-auto mb-2 opacity-20" />
                    <p>אין פגישות מתוזמנות</p>
                  </div>
                ) : (
                  appointments.map(appt => (
                    <div 
                      key={appt.id} 
                      className="p-4 rounded-xl border border-border bg-card hover:border-primary/50 transition-colors group cursor-pointer"
                      onClick={() => {
                        setSelectedAppt(appt)
                        setIsEditApptDialogOpen(true)
                      }}
                    >
                      <div className="flex items-start justify-between">
                        <div className="space-y-1">
                          <h4 className="font-bold text-sm">{appt.title}</h4>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <Clock className="h-3 w-3" />
                            <span>
                              {new Date(appt.start_time).toLocaleDateString('he-IL')} | {new Date(appt.start_time).toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                          {appt.location && (
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              <MapPin className="h-3 w-3" />
                              <span>{appt.location}</span>
                            </div>
                          )}
                          {appt.meeting_link && (
                            <div className="flex items-center gap-2 text-xs text-primary">
                              <Video className="h-3 w-3" />
                              <a href={appt.meeting_link} target="_blank" rel="noreferrer" className="hover:underline">
                                הצטרפות לפגישה
                              </a>
                            </div>
                          )}
                        </div>
                        <span className={cn(
                          "text-[10px] font-bold px-2 py-0.5 rounded-full",
                          appt.status === 'scheduled' ? "bg-blue-100 text-blue-700" :
                          appt.status === 'completed' ? "bg-emerald-100 text-emerald-700" :
                          "bg-red-100 text-red-700"
                        )}>
                          {appt.status === 'scheduled' ? 'מתוזמן' : 
                           appt.status === 'completed' ? 'בוצע' : 'בוטל'}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </TabsContent>
            </Tabs>
            
            {contact && (
              <CreateAppointmentDialog
                open={isApptDialogOpen}
                onOpenChange={setIsApptDialogOpen}
                contactId={contact.id}
                businessId={contact.business_id}
                contactName={contact.full_name}
                onSuccess={loadData}
              />
            )}

            {contact && selectedAppt && (
              <EditAppointmentDialog
                open={isEditApptDialogOpen}
                onOpenChange={setIsEditApptDialogOpen}
                appointment={selectedAppt}
                businessId={contact.business_id}
                onSuccess={loadData}
              />
            )}
          </>
        ) : null}
      </SheetContent>
    </Sheet>
  )
}
