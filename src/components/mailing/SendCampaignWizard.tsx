"use client"

import React, { useState, useEffect, useCallback } from "react"
import { createClient } from "@/lib/supabase/client"
import { useBusiness } from "@/lib/hooks/useBusiness"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { 
  ArrowRight, 
  ArrowLeft, 
  Send, 
  Loader2, 
  List, 
  Info, 
  Mail, 
  Layout, 
  CheckCircle2, 
  ChevronLeft,
  ChevronRight,
  Plus,
  FileText
} from "lucide-react"
import { toast } from "sonner"
import Link from "next/link"
import { EmailBuilder } from "./builder/EmailBuilder"
import { generateEmailHTML } from "@/lib/mailing/email-html-generator"
import { cn } from "@/lib/utils"
import { ScrollArea } from "@/components/ui/scroll-area"

import { useMailingWizardStore, Step } from "@/lib/mailing/wizard-store"

export function SendCampaignWizard() {
  const { businessId } = useBusiness()
  const router = useRouter()
  const supabase = createClient()

  const {
    currentStep,
    selectedListIds: storedSelectedListIds,
    campaignName,
    subject,
    designMethod,
    selectedTemplateId,
    emailJson,
    emailHtml,
    isDesigningExternally,
    builderUrl,
    setStep,
    setSelectedListIds,
    setCampaignName,
    setSubject,
    setDesignMethod,
    setSelectedTemplateId,
    setEmailJson,
    setEmailHtml,
    setIsDesigningExternally,
    resetWizard,
  } = useMailingWizardStore()

  const selectedListIds = Array.isArray(storedSelectedListIds) ? storedSelectedListIds : []

  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)

  // Data state
  const [lists, setLists] = useState<any[]>([])
  const [templates, setTemplates] = useState<any[]>([])

  const loadTemplates = useCallback(async () => {
    if (!businessId) return
    const { data, error } = await supabase
      .from("email_templates")
      .select("id, name, subject, content_json, content_html")
      .eq("business_id", businessId)
      .order("updated_at", { ascending: false })

    if (error) toast.error("שגיאה בטעינת תבניות")
    else setTemplates(data ?? [])
  }, [businessId, supabase])

  useEffect(() => {
    const loadData = async () => {
      if (!businessId) return
      setLoading(true)
      
      const [listsRes, templatesRes] = await Promise.all([
        supabase
          .from("mailing_lists")
          .select("id, name, contact_count:mailing_list_contacts(count)")
          .eq("business_id", businessId)
          .order("name"),
        supabase
          .from("email_templates")
          .select("id, name, subject, content_json, content_html")
          .eq("business_id", businessId)
          .order("updated_at", { ascending: false })
      ])

      if (listsRes.error) toast.error("שגיאה בטעינת רשימות")
      else setLists(listsRes.data ?? [])

      if (templatesRes.error) toast.error("שגיאה בטעינת תבניות")
      else setTemplates(templatesRes.data ?? [])
      
      setLoading(false)
    }

    loadData()
  }, [businessId, supabase])

  const nextStep = () => {
    if (currentStep === "RECIPIENTS") {
      if (selectedListIds.length === 0) {
        toast.error("אנא בחר לפחות רשימה אחת")
        return
      }
      setStep("DETAILS")
    } else if (currentStep === "DETAILS") {
      if (!campaignName || !subject) {
        toast.error("אנא מלא את שם הקמפיין ונושא המייל")
        return
      }
      setStep("TEMPLATE_CHOICE")
    } else if (currentStep === "TEMPLATE_CHOICE") {
      if (designMethod === "template" && !selectedTemplateId) {
        toast.error("אנא בחר תבנית")
        return
      }
      
      if (designMethod === "template") {
        const template = templates.find(t => t.id === selectedTemplateId)
        if (template) {
          setEmailJson(template.content_json)
          setEmailHtml(template.content_html)
        }
        setStep("DESIGN")
      } else {
        // Navigate to builder internally for "New Design"
        const url = `/mailing/templates/new/builder?campaignMode=true&name=${encodeURIComponent(campaignName)}&t=${Date.now()}`;
        setIsDesigningExternally(true, url);
        router.push(url);
      }
    } else if (currentStep === "DESIGN") {
      if (!emailHtml) {
        toast.error("אנא עצב את המייל לפני המעבר לשלב הבא")
        return
      }
      setStep("REVIEW")
    }
  }

  const prevStep = () => {
    if (currentStep === "DETAILS") setStep("RECIPIENTS")
    else if (currentStep === "TEMPLATE_CHOICE") setStep("DETAILS")
    else if (currentStep === "DESIGN") setStep("TEMPLATE_CHOICE")
    else if (currentStep === "REVIEW") setStep("DESIGN")
  }

  const handleSend = async () => {
    if (!businessId) return
    setSending(true)
    try {
      const response = await fetch("/api/mailing/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          businessId,
          name: campaignName,
          subject,
          contentHtml: emailHtml,
          listIds: selectedListIds,
        }),
      })

      const data = await response.json()
      if (data.success) {
        toast.success("קמפיין נשלח בהצלחה")
        resetWizard()
        router.push("/mailing")
      } else {
        toast.error(data.error || "שגיאה בשליחת קמפיין")
      }
    } catch (error) {
      toast.error("שגיאה בתקשורת עם השרת")
    } finally {
      setSending(false)
    }
  }

  const toggleList = (listId: string) => {
    const isSelected = selectedListIds.includes(listId)
    const newIds = isSelected
      ? selectedListIds.filter(id => id !== listId)
      : [...selectedListIds, listId]
    setSelectedListIds(newIds)
  }

  const totalContacts = selectedListIds.reduce((acc, listId) => {
    const list = lists.find(l => l.id === listId)
    return acc + (list?.contact_count?.[0]?.count || 0)
  }, 0)

  if (!businessId) return null

  const steps = [
    { id: "RECIPIENTS", label: "נמענים", icon: List },
    { id: "DETAILS", label: "פרטי קמפיין", icon: Info },
    { id: "TEMPLATE_CHOICE", label: "בחירת עיצוב", icon: Layout },
    { id: "DESIGN", label: "עריכת תוכן", icon: Mail },
    { id: "REVIEW", label: "סיכום ושליחה", icon: CheckCircle2 },
  ]

  return (
    <div className="w-full max-w-5xl mx-auto space-y-8 pb-20 px-4 relative min-h-[600px]" dir="rtl">
      {/* Designing Externally Blocker */}
      {isDesigningExternally && (
        <div className="absolute inset-0 bg-background/80 backdrop-blur-md z-50 flex items-center justify-center p-4 rounded-3xl">
          <Card className="max-w-md w-full border-none shadow-2xl animate-in zoom-in-95 duration-200 bg-card/95">
            <CardHeader className="text-center">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse">
                <Mail className="h-8 w-8 text-primary" />
              </div>
              <CardTitle className="text-2xl font-bold">העיצוב בעיבוד...</CardTitle>
              <CardDescription>
                עורך המיילים פתוח כעת בטאב נפרד. <br />
                סיימו את העיצוב שם כדי להמשיך בשליחה.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3 p-4 bg-muted/50 rounded-2xl border border-border/50">
                <Loader2 className="h-5 w-5 animate-spin text-primary" />
                <p className="text-sm font-medium">ממתין לשמירת העיצוב בטאב העורך</p>
              </div>
              <div className="flex flex-col gap-2">
                {builderUrl && (
                  <Button 
                    className="w-full rounded-xl h-12 gap-2"
                    onClick={() => router.push(builderUrl)}
                  >
                    <Layout className="h-4 w-4" />
                    חזרה לטאב העריכה
                  </Button>
                )}
                <Button 
                  variant="outline" 
                  className="w-full rounded-xl h-12"
                  onClick={() => setIsDesigningExternally(false, null)}
                >
                  בטל וחזור לוויזארד
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Step Indicator */}
      <div className="flex items-center justify-between relative before:absolute before:top-1/2 before:left-0 before:right-0 before:h-0.5 before:bg-muted before:-translate-y-1/2 before:-z-10">
        {steps.map((step, idx) => {
          const Icon = step.icon
          const isActive = currentStep === step.id
          const isCompleted = steps.findIndex(s => s.id === currentStep) > idx
          
          return (
            <div key={step.id} className="flex flex-col items-center gap-2 bg-background px-4">
              <div className={cn(
                "w-10 h-10 rounded-full flex items-center justify-center border-2 transition-colors",
                isActive ? "border-primary bg-primary text-primary-foreground" : 
                isCompleted ? "border-primary bg-primary/10 text-primary" : "border-muted bg-background text-muted-foreground"
              )}>
                {isCompleted ? <CheckCircle2 className="h-5 w-5" /> : <Icon className="h-5 w-5" />}
              </div>
              <span className={cn(
                "text-xs font-bold whitespace-nowrap",
                isActive ? "text-primary" : "text-muted-foreground"
              )}>
                {step.label}
              </span>
            </div>
          )
        })}
      </div>

      <div className="min-h-[500px]">
        {/* Step 1: Recipients */}
        {currentStep === "RECIPIENTS" && (
          <Card className="border-none shadow-xl bg-card/50 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-xl">למי נשלח את המייל?</CardTitle>
              <CardDescription>בחר אחת או יותר מרשימות התפוצה שלך</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {loading ? (
                  Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="h-24 rounded-2xl bg-muted animate-pulse" />
                  ))
                ) : lists.length === 0 ? (
                  <div className="col-span-full py-12 text-center space-y-4">
                    <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto">
                      <List className="h-8 w-8 text-muted-foreground" />
                    </div>
                    <p className="text-muted-foreground">אין רשימות תפוצה פעילות</p>
                    <Link href="/mailing">
                      <Button variant="outline" size="sm">צור רשימה חדשה</Button>
                    </Link>
                  </div>
                ) : (
                  lists.map((list) => (
                    <div 
                      key={list.id} 
                      onClick={() => toggleList(list.id)}
                      className={cn(
                        "p-4 rounded-2xl border-2 transition-all cursor-pointer hover:shadow-md relative overflow-hidden group",
                        selectedListIds.includes(list.id) 
                          ? "border-primary bg-primary/5" 
                          : "border-border/50 bg-background hover:border-primary/30"
                      )}
                    >
                      <div className="flex justify-between items-start mb-2">
                        <div className={cn(
                          "w-8 h-8 rounded-lg flex items-center justify-center",
                          selectedListIds.includes(list.id) ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                        )}>
                          <List className="h-4 w-4" />
                        </div>
                        <Checkbox 
                          checked={selectedListIds.includes(list.id)}
                          onCheckedChange={() => {}} // Handled by div click
                          className="rounded-full"
                        />
                      </div>
                      <h3 className="font-bold text-sm mb-1">{list.name}</h3>
                      <p className="text-xs text-muted-foreground">
                        {list.contact_count[0]?.count || 0} אנשי קשר
                      </p>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
            <CardFooter className="flex justify-between border-t border-border/50 pt-6">
              <div className="text-sm">
                נבחרו <span className="font-bold text-primary">{selectedListIds.length}</span> רשימות, סך הכל <span className="font-bold text-primary">{totalContacts}</span> נמענים
              </div>
              <Button onClick={nextStep} className="gap-2 px-8 rounded-xl h-11">
                המשך לפרטי הקמפיין
                <ChevronLeft className="h-4 w-4" />
              </Button>
            </CardFooter>
          </Card>
        )}

        {/* Step 2: Campaign Details */}
        {currentStep === "DETAILS" && (
          <Card className="border-none shadow-xl bg-card/50 backdrop-blur-sm max-w-2xl mx-auto">
            <CardHeader>
              <CardTitle className="text-xl">פרטי הקמפיין</CardTitle>
              <CardDescription>תן שם לקמפיין ונושא שימשוך את הנמענים</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="name" className="text-sm font-bold">שם פנימי לקמפיין</Label>
                <Input
                  id="name"
                  placeholder="למשל: עדכון חודשי - מרץ 2024"
                  value={campaignName}
                  onChange={(e) => setCampaignName(e.target.value)}
                  className="h-12 rounded-xl border-border/50 bg-background/50 focus:bg-background"
                />
                <p className="text-[10px] text-muted-foreground">השם הזה מיועד לשימוש פנימי שלך בלבד</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="subject" className="text-sm font-bold">נושא המייל (Subject)</Label>
                <Input
                  id="subject"
                  placeholder="אל תפספסו את העדכונים החדשים שלנו!"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="h-12 rounded-xl border-border/50 bg-background/50 focus:bg-background"
                />
                <p className="text-[10px] text-muted-foreground">זה הנושא שהנמענים יראו בתיבת הדואר שלהם</p>
              </div>
            </CardContent>
            <CardFooter className="flex justify-between border-t border-border/50 pt-6">
              <Button variant="ghost" onClick={prevStep} className="gap-2">
                <ChevronRight className="h-4 w-4" />
                חזרה
              </Button>
              <Button onClick={nextStep} className="gap-2 px-8 rounded-xl h-11">
                המשך לבחירת עיצוב
                <ChevronLeft className="h-4 w-4" />
              </Button>
            </CardFooter>
          </Card>
        )}

        {/* Step 3: Template Choice */}
        {currentStep === "TEMPLATE_CHOICE" && (
          <Card className="border-none shadow-xl bg-card/50 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-xl">איך תרצה לעצב את המייל?</CardTitle>
              <CardDescription>בחר האם להתחיל מאפס או להשתמש בתבנית קיימת</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div 
                  onClick={() => setDesignMethod("new")}
                  className={cn(
                    "p-8 rounded-3xl border-2 transition-all cursor-pointer hover:shadow-lg flex flex-col items-center text-center gap-4 group",
                    designMethod === "new" 
                      ? "border-primary bg-primary/5" 
                      : "border-border/50 bg-background hover:border-primary/30"
                  )}
                >
                  <div className={cn(
                    "w-20 h-20 rounded-2xl flex items-center justify-center transition-transform group-hover:scale-110",
                    designMethod === "new" ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20" : "bg-muted text-muted-foreground"
                  )}>
                    <Plus className="h-10 w-10" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold mb-1">עיצוב חדש</h3>
                    <p className="text-sm text-muted-foreground">התחל מאפס עם הבונה הויזואלי שלנו</p>
                  </div>
                </div>

                <div 
                  onClick={() => setDesignMethod("template")}
                  className={cn(
                    "p-8 rounded-3xl border-2 transition-all cursor-pointer hover:shadow-lg flex flex-col items-center text-center gap-4 group",
                    designMethod === "template" 
                      ? "border-primary bg-primary/5" 
                      : "border-border/50 bg-background hover:border-primary/30"
                  )}
                >
                  <div className={cn(
                    "w-20 h-20 rounded-2xl flex items-center justify-center transition-transform group-hover:scale-110",
                    designMethod === "template" ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20" : "bg-muted text-muted-foreground"
                  )}>
                    <FileText className="h-10 w-10" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold mb-1">שימוש בתבנית</h3>
                    <p className="text-sm text-muted-foreground">בחר מתוך תבניות שעיצבת בעבר</p>
                  </div>
                </div>
              </div>

              {designMethod === "template" && (
                <div className="mt-8 space-y-4">
                  <h4 className="font-bold text-sm">בחר תבנית:</h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {templates.length === 0 ? (
                      <p className="col-span-full text-center py-8 text-muted-foreground text-sm bg-muted/30 rounded-2xl">
                        לא נמצאו תבניות שמורות
                      </p>
                    ) : (
                      templates.map((template) => (
                        <div 
                          key={template.id}
                          onClick={() => setSelectedTemplateId(template.id)}
                          className={cn(
                            "p-4 rounded-xl border transition-all cursor-pointer hover:bg-muted/30",
                            selectedTemplateId === template.id ? "border-primary ring-1 ring-primary" : "border-border/50"
                          )}
                        >
                          <h5 className="font-bold text-sm truncate">{template.name}</h5>
                          <p className="text-xs text-muted-foreground truncate">{template.subject}</p>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </CardContent>
            <CardFooter className="flex justify-between border-t border-border/50 pt-6">
              <Button variant="ghost" onClick={prevStep} className="gap-2">
                <ChevronRight className="h-4 w-4" />
                חזרה
              </Button>
              <Button onClick={nextStep} className="gap-2 px-8 rounded-xl h-11">
                המשך לעריכת תוכן
                <ChevronLeft className="h-4 w-4" />
              </Button>
            </CardFooter>
          </Card>
        )}

        {/* Step 4: Design (Email Builder) */}
        {currentStep === "DESIGN" && (
          <div className="space-y-6">
            <div className="flex justify-between items-center bg-card p-4 rounded-2xl border border-border/50 shadow-sm">
              <div>
                <h3 className="font-bold">עריכת תוכן המייל</h3>
                <p className="text-xs text-muted-foreground">השתמש בבונה הויזואלי כדי לעצב את הודעת הדיוור שלך</p>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={prevStep} className="gap-2 rounded-xl">
                  <ChevronRight className="h-4 w-4" />
                  חזרה
                </Button>
                <Button onClick={nextStep} className="gap-2 px-8 rounded-xl" disabled={!emailHtml}>
                  סיים עיצוב
                  <ChevronLeft className="h-4 w-4" />
                </Button>
              </div>
            </div>
            
            <div className="h-[800px] border border-border/50 rounded-3xl overflow-hidden shadow-2xl relative">
              <EmailBuilder 
                initialData={emailJson}
                onSave={(json) => {
                  setEmailJson(json)
                  const html = generateEmailHTML(json)
                  setEmailHtml(html)
                  toast.success("העיצוב נשמר")
                }}
                onClose={() => setStep("TEMPLATE_CHOICE")}
              />
              {!emailHtml && (
                <div className="absolute inset-0 bg-background/60 backdrop-blur-[1px] flex items-center justify-center z-50 pointer-events-none">
                  <div className="bg-card p-6 rounded-2xl border shadow-xl text-center space-y-2 pointer-events-auto">
                    <p className="font-bold">התחל לעצב את המייל</p>
                    <p className="text-sm text-muted-foreground">הוסף בלוקים מהתפריט הימני ולחץ על "שמור" בסיום</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Step 5: Review & Send */}
        {currentStep === "REVIEW" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-6">
              <Card className="border-none shadow-xl bg-card/50 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="text-xl">תצוגה מקדימה</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="border border-border/50 rounded-2xl overflow-hidden bg-white min-h-[500px] max-h-[600px] overflow-y-auto">
                    <div dangerouslySetInnerHTML={{ __html: emailHtml }} />
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="space-y-6">
              <Card className="border-none shadow-xl bg-card/50 backdrop-blur-sm sticky top-8">
                <CardHeader>
                  <CardTitle className="text-lg">סיכום קמפיין</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-4">
                    <div className="flex justify-between text-sm py-2 border-b border-border/50">
                      <span className="text-muted-foreground">שם קמפיין:</span>
                      <span className="font-bold">{campaignName}</span>
                    </div>
                    <div className="flex justify-between text-sm py-2 border-b border-border/50">
                      <span className="text-muted-foreground">נושא המייל:</span>
                      <span className="font-bold">{subject}</span>
                    </div>
                    <div className="flex justify-between text-sm py-2 border-b border-border/50">
                      <span className="text-muted-foreground">נמענים:</span>
                      <span className="font-bold">{totalContacts}</span>
                    </div>
                    <div className="flex justify-between text-sm py-2 border-b border-border/50">
                      <span className="text-muted-foreground">רשימות:</span>
                      <span className="font-bold text-left">{selectedListIds.length}</span>
                    </div>
                  </div>

                  <div className="bg-primary/5 p-4 rounded-2xl border border-primary/20 space-y-2">
                    <div className="flex items-center gap-2 text-primary font-bold text-sm">
                      <Info className="h-4 w-4" />
                      רגע לפני השליחה
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      וודא שכל הקישורים והתמונות תקינים. לאחר השליחה לא ניתן יהיה לבטל או לערוך את המייל.
                    </p>
                  </div>
                </CardContent>
                <CardFooter className="flex flex-col gap-3">
                  <Button 
                    onClick={handleSend} 
                    className="w-full h-12 rounded-xl text-lg font-bold gap-2 shadow-lg shadow-primary/20"
                    disabled={sending}
                  >
                    {sending ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
                    שלח קמפיין עכשיו
                  </Button>
                  <Button variant="ghost" onClick={prevStep} className="w-full" disabled={sending}>
                    חזרה לעריכה
                  </Button>
                </CardFooter>
              </Card>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
